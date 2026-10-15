import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { MediaItem } from '../state/types';
import { supabase } from './supabase';

const EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function describe(uri: string, kind: MediaItem['kind']) {
  const extension = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
  const known = EXTENSIONS[extension];
  if (known) return { extension, contentType: known };
  return kind === 'video'
    ? { extension: 'mp4', contentType: 'video/mp4' }
    : { extension: 'jpg', contentType: 'image/jpeg' };
}

type Bucket = 'listing-media' | 'post-media' | 'avatars' | 'private-docs' | 'rental-evidence' | 'moderation-frames';

/**
 * Longest edge and JPEG quality per bucket. Every photo is downloaded each
 * time someone sees it, and storage egress is billed: a phone screen needs
 * about 1600 px, an avatar 512. Condition photos keep more detail, as evidence.
 */
const SIZING: Partial<Record<Bucket, { edge: number; quality: number }>> = {
  avatars: { edge: 512, quality: 0.8 },
  'listing-media': { edge: 1600, quality: 0.8 },
  'post-media': { edge: 1600, quality: 0.8 },
  'rental-evidence': { edge: 2048, quality: 0.85 },
};
const DEFAULT_SIZING = { edge: 1600, quality: 0.8 };

/**
 * Paths are never reused (time + random suffix), so a file never changes:
 * phones and the CDN may keep it for a year instead of asking again.
 */
const CACHE_SECONDS = '31536000';

/**
 * Re-encodes a photo to JPEG: the new file carries no EXIF, so no GPS, camera
 * serial or capture time leaves the phone. Photos larger than the bucket's edge
 * are scaled down. Fails closed: an unreadable photo is never sent with its metadata.
 */
async function reencode(item: MediaItem, { edge: MAX_EDGE, quality }: { edge: number; quality: number }): Promise<string> {
  try {
    let width = item.width ?? 0;
    let height = item.height ?? 0;
    if (!width || !height) {
      const probe = await ImageManipulator.manipulate(item.uri).renderAsync();
      width = probe.width;
      height = probe.height;
    }
    const context = ImageManipulator.manipulate(item.uri);
    if (Math.max(width, height) > MAX_EDGE) {
      context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    }
    let image = await context.renderAsync();
    // The picker's size can ignore the EXIF rotation: check what was rendered.
    if (Math.max(image.width, image.height) > MAX_EDGE) {
      image = await ImageManipulator.manipulate(item.uri)
        .resize(image.width >= image.height ? { width: MAX_EDGE } : { height: MAX_EDGE })
        .renderAsync();
    }
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    return saved.uri;
  } catch {
    throw new Error('photo_unreadable');
  }
}

/**
 * Sends a picked file to Supabase Storage and returns its path. Files always
 * live under the owner's user id, which is what the storage policies allow.
 */
export async function uploadMedia(
  bucket: Bucket,
  userId: string,
  item: MediaItem,
  /** Second path segment, e.g. the rental id for condition evidence. */
  subfolder?: string,
): Promise<string> {
  if (!supabase) throw new Error('Le serveur n’est pas configuré.');

  let { extension, contentType } = describe(item.uri, item.kind);
  let uri = item.uri;
  // Photos are re-encoded first (condition photos included: GPS would reveal a home).
  // Authenticity proofs keep their original bytes for staff; moderation frames are
  // already JPEGs this app rendered from a video. Videos can't be cleaned in Expo Go;
  // see docs/legal (residual risk until the dev build).
  if (item.kind === 'image' && bucket !== 'private-docs' && bucket !== 'moderation-frames') {
    uri = await reencode(item, SIZING[bucket] ?? DEFAULT_SIZING);
    extension = 'jpg';
    contentType = 'image/jpeg';
  }
  const prefix = subfolder ? `${userId}/${subfolder}` : userId;
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  // React Native has no File API: fetch the local file and send the bytes.
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    cacheControl: CACHE_SECONDS,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return path;
}
