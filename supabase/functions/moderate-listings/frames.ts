// Stills taken from the uploaded video on the server, so a modified app
// can't send innocent frames alongside a different clip.
//
// Mux decodes the video (free for "basic" quality), we keep three stills in
// our private moderation-frames bucket, then delete the Mux asset. Optional:
// without MUX_TOKEN_ID / MUX_TOKEN_SECRET the analyzer falls back to the
// stills the app uploaded and records that it did.

import { admin } from '../_shared/clients.ts';

const MUX = 'https://api.mux.com/video/v1/assets';

type Result =
  | { state: 'ready'; paths: string[] }
  | { state: 'pending'; assetId: string }
  | { state: 'unavailable'; reason: string };

function auth() {
  const id = Deno.env.get('MUX_TOKEN_ID');
  const secret = Deno.env.get('MUX_TOKEN_SECRET');
  return id && secret ? `Basic ${btoa(`${id}:${secret}`)}` : null;
}

export const serverFramesConfigured = () => auth() !== null;

interface MuxAsset {
  id: string;
  status: 'preparing' | 'ready' | 'errored';
  duration?: number;
  playback_ids?: { id: string; policy: string }[];
}

async function mux(path: string, init: RequestInit = {}) {
  const res = await fetch(`${MUX}${path}`, {
    ...init,
    headers: { Authorization: auth()!, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok && res.status !== 404) throw new Error(`mux ${res.status}: ${await res.text()}`);
  return res.status === 204 || res.status === 404 ? null : ((await res.json()).data as MuxAsset);
}

export async function serverFrames(args: {
  provenanceId: string;
  listingId: string;
  videoUrl: string;
  assetId: string | null;
}): Promise<Result> {
  if (!auth()) return { state: 'unavailable', reason: 'mux_not_configured' };

  let asset = args.assetId ? await mux(`/${args.assetId}`) : null;
  if (!asset) {
    asset = await mux('', {
      method: 'POST',
      body: JSON.stringify({
        inputs: [{ url: args.videoUrl }],
        playback_policies: ['public'],
        video_quality: 'basic',
      }),
    });
    if (!asset) throw new Error('mux: no asset returned');
    await admin.from('media_provenance').update({ server_asset_id: asset.id }).eq('id', args.provenanceId);
  }

  // Short clips are usually ready within seconds; otherwise try again on the next sweep.
  for (let i = 0; i < 12 && asset && asset.status === 'preparing'; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    asset = await mux(`/${asset.id}`);
  }
  if (!asset) return { state: 'unavailable', reason: 'mux_asset_missing' };
  if (asset.status === 'preparing') return { state: 'pending', assetId: asset.id };
  if (asset.status === 'errored') {
    await mux(`/${asset.id}`, { method: 'DELETE' });
    return { state: 'unavailable', reason: 'mux_errored' };
  }

  const playback = asset.playback_ids?.[0]?.id;
  const seconds = asset.duration ?? 0;
  const times = seconds > 1 ? [0.15, 0.5, 0.85].map((f) => Math.round(seconds * f * 10) / 10) : [0];
  const paths: string[] = [];
  for (const [n, t] of times.entries()) {
    const res = await fetch(`https://image.mux.com/${playback}/thumbnail.jpg?time=${t}&width=768`);
    if (!res.ok) continue;
    // Outside any member's folder: the member's own storage policies can't replace these.
    const path = `server/${args.listingId}/${args.provenanceId}-${n}.jpg`;
    const { error } = await admin.storage
      .from('moderation-frames')
      .upload(path, await res.arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
    if (!error) paths.push(path);
  }
  await mux(`/${asset.id}`, { method: 'DELETE' });
  await admin
    .from('media_provenance')
    .update({ server_frame_paths: paths, server_asset_id: null })
    .eq('id', args.provenanceId);
  return paths.length ? { state: 'ready', paths } : { state: 'unavailable', reason: 'no_thumbnails' };
}
