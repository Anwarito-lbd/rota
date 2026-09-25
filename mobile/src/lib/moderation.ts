/**
 * The app's side of content moderation (migration 003 + the
 * moderate-listings Edge Function).
 *
 * The phone does two things the server can't do cheaply: it pulls a few
 * stills out of the video (the server has no video decoder), and it knows
 * whether the file was just filmed or picked from the gallery. Both are sent
 * as signals. Nothing here can publish a listing — only the analyzer or a
 * person at Rota can.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import type { MediaItem } from '../state/types';
import { supabase } from './supabase';
import { uploadMedia } from './upload';

export type Distribution = 'pending' | 'public' | 'limited' | 'blocked';
export type DistributionReason =
  | 'off_topic'
  | 'synthetic_suspected'
  | 'not_original'
  | 'duplicate'
  | 'unsafe'
  | 'counterfeit_risk'
  | 'reported'
  | 'needs_review'
  | 'other';

export const REPORT_REASONS = ['not_clothing', 'ai_or_fake', 'inappropriate', 'counterfeit', 'scam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

function client() {
  if (!supabase) throw new Error('Le serveur n’est pas configuré.');
  return supabase;
}

/** Resolves once the player can decode frames, or rejects after `ms`. */
function ready(player: VideoPlayer, ms = 8000) {
  if (player.status === 'readyToPlay') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('video did not load'));
    }, ms);
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' || status === 'error') {
        clearTimeout(timer);
        sub.remove();
        if (status === 'readyToPlay') resolve();
        else reject(new Error('video failed to load'));
      }
    });
  });
}

/**
 * Three stills from early, middle and late in the clip, as local JPEG files.
 * Returns [] rather than throwing: a listing without frames still gets
 * reviewed, it just can't be distributed until a person has seen the clip.
 */
export async function extractFrames(video: MediaItem): Promise<string[]> {
  const player = createVideoPlayer(video.uri);
  try {
    await ready(player);
    const seconds = (video.durationMs ?? player.duration * 1000) / 1000;
    const times = seconds > 1 ? [0.15, 0.5, 0.85].map((f) => Math.round(seconds * f * 10) / 10) : [0];
    const thumbnails = await player.generateThumbnailsAsync(times, { maxWidth: 768, maxHeight: 768 });
    const files: string[] = [];
    for (const thumbnail of thumbnails) {
      const rendered = await ImageManipulator.manipulate(thumbnail).renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72 });
      files.push(saved.uri);
    }
    return files;
  } catch {
    return [];
  } finally {
    player.release();
  }
}

/** size:duration:WxH — the same file uploaded twice produces the same string. */
function fingerprint(item: MediaItem) {
  if (!item.fileSize) return null;
  return [item.fileSize, item.durationMs ?? 0, `${item.width ?? 0}x${item.height ?? 0}`].join(':');
}

/**
 * Describes each uploaded file of a new listing, uploads the video stills,
 * then asks the analyzer to look now instead of waiting for the sweep.
 * Every step is best-effort: the review case already exists server-side.
 */
export async function submitForReview(args: {
  userId: string;
  listingId: string;
  uploads: { item: MediaItem; path: string }[];
}) {
  const db = client();
  for (const { item, path } of args.uploads) {
    let framePaths: string[] = [];
    if (item.kind === 'video') {
      const frames = await extractFrames(item);
      for (const uri of frames) {
        try {
          framePaths.push(
            await uploadMedia('moderation-frames', args.userId, { uri, kind: 'image', name: 'frame.jpg' }, args.listingId),
          );
        } catch {
          // Keep going with whichever stills made it.
        }
      }
      framePaths = framePaths.slice(0, 4);
    }
    await db.from('media_provenance').insert({
      listing_id: args.listingId,
      storage_path: path,
      kind: item.kind,
      capture_source: item.source === 'camera' ? 'in_app_camera' : item.source === 'library' ? 'library' : 'unknown',
      width: item.width ?? null,
      height: item.height ?? null,
      duration_ms: item.durationMs != null ? Math.round(item.durationMs) : null,
      file_size: item.fileSize ?? null,
      fingerprint: fingerprint(item),
      exif_make: item.exif?.make ?? null,
      exif_model: item.exif?.model ?? null,
      exif_software: item.exif?.software ?? null,
      frame_paths: framePaths,
    });
  }
  // If the analyzer isn't deployed yet this fails quietly and the listing
  // stays "en vérification" until it is.
  await db.functions.invoke('moderate-listings', { body: { listingId: args.listingId } }).catch(() => undefined);
}

export async function reportListing(listingId: string, reason: ReportReason, note?: string) {
  const { error } = await client()
    .from('content_reports')
    .insert({ listing_id: listingId, reason, note: note?.trim() || null });
  // Reporting twice is not an error from the member's point of view.
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function appealListing(listingId: string, message: string) {
  const { error } = await client().from('moderation_appeals').insert({ listing_id: listingId, message: message.trim() });
  if (error && error.code === '23505') throw new Error('appeal_open');
  if (error) throw new Error(error.message);
}

export async function hasOpenAppeal(listingId: string) {
  const { data } = await client()
    .from('moderation_appeals')
    .select('id')
    .eq('listing_id', listingId)
    .eq('state', 'open')
    .limit(1);
  return (data ?? []).length > 0;
}
