// Rota — listing analyzer.
//
// Drains the moderation queue created by migration 003. Two ways in:
//   • the app, right after publishing:  { listingId }  + the member's token
//   • the scheduled sweep (006):        header x-rota-cron: <ROTA_CRON_SECRET>
// Either way it only ever processes cases the database queued; a caller
// cannot choose a verdict.
//
// Order of checks for each listing:
//   1. hash match against known abuse material (vendor, see hashcheck.ts)
//   2. stills from the video, taken on the server when Mux is configured
//   3. the model describes the images; policy.ts decides
//
// Secrets: ANTHROPIC_API_KEY, ROTA_CRON_SECRET, optional MUX_TOKEN_ID /
// MUX_TOKEN_SECRET and CSAM_HASH_PROVIDER (see ../_shared/clients.ts).

import Anthropic from 'npm:@anthropic-ai/sdk';
import { admin, isCron, json, userFrom } from '../_shared/clients.ts';
import { serverFrames, serverFramesConfigured } from './frames.ts';
import { hashCheck } from './hashcheck.ts';
import {
  asLevel,
  type Context,
  decide,
  namesGenerator,
  SYSTEM_PROMPT,
  type Verdict,
  VERDICT_SCHEMA,
} from './policy.ts';

const anthropic = new Anthropic();

// Formats the API reads. HEIC and anything else is skipped and noted.
const READABLE = /\.(jpe?g|png|webp|gif)$/i;

interface Case {
  id: string;
  listing_id: string;
  subject_version: number;
}

interface Provenance {
  id: string;
  kind: 'image' | 'video';
  capture_source: 'in_app_camera' | 'library' | 'unknown';
  fingerprint: string | null;
  exif_software: string | null;
  frame_paths: string[];
  server_frame_paths: string[];
  server_asset_id: string | null;
  storage_path: string;
}

/** Not a failure: come back on the next sweep (video still processing, vendor down). */
class Later extends Error {}

async function loadPolicy() {
  const { data } = await admin.from('policy_config').select('key, value').like('key', 'moderation_%');
  const map = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  return {
    model: typeof map.get('moderation_model') === 'string' ? (map.get('moderation_model') as string) : 'claude-opus-5',
    effort: (['low', 'medium', 'high'].includes(map.get('moderation_effort') as string)
      ? map.get('moderation_effort')
      : 'low') as 'low' | 'medium' | 'high',
    maxImages: Number(map.get('moderation_max_images') ?? 6) || 6,
    syntheticLimitImported: asLevel(map.get('moderation_synthetic_limit_imported'), 'medium'),
    syntheticLimitInApp: asLevel(map.get('moderation_synthetic_limit_in_app'), 'high'),
    requireHashCheck: map.get('moderation_require_hash_check') === true,
  };
}

async function imageUrl(bucket: string, path: string): Promise<string | null> {
  if (!READABLE.test(path)) return null;
  if (bucket === 'listing-media') return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, 900);
  return data?.signedUrl ?? null;
}

// Pull unsafe media out of the public bucket, keeping a copy for the appeal
// and for any legal request. Paths in quarantine are not under the member's
// folder, so their own storage policies can't touch them.
async function quarantine(listingId: string, paths: string[]) {
  for (const path of paths) {
    const { data: blob } = await admin.storage.from('listing-media').download(path);
    if (!blob) continue;
    const name = path.split('/').pop();
    const { error } = await admin.storage
      .from('moderation-quarantine')
      .upload(`listing/${listingId}/${name}`, blob, { upsert: true, contentType: blob.type || undefined });
    if (!error) await admin.storage.from('listing-media').remove([path]);
  }
}

async function review(c: Case, policy: Awaited<ReturnType<typeof loadPolicy>>) {
  const { data: listing, error } = await admin.from('listings').select('*').eq('id', c.listing_id).single();
  if (error || !listing) throw new Error(`listing ${c.listing_id}: ${error?.message ?? 'missing'}`);

  const { data: provRows } = await admin
    .from('media_provenance')
    .select('id, kind, capture_source, fingerprint, exif_software, frame_paths, server_frame_paths, server_asset_id, storage_path')
    .eq('listing_id', listing.id);
  const provenance = (provRows ?? []) as Provenance[];
  const photos: string[] = listing.photo_paths ?? [];
  const mediaPaths = [...photos, ...(listing.video_path ? [listing.video_path] : [])];

  // 1. Known abuse material: before anything else looks at the images.
  const photoUrls = (await Promise.all(photos.map((p) => imageUrl('listing-media', p)))).filter(
    (u): u is string => !!u,
  );
  const hash = await hashCheck(photoUrls);
  if (hash.status === 'match') {
    await quarantine(listing.id, mediaPaths);
    await admin.rpc('open_safety_incident', {
      p_listing: listing.id,
      p_kind: 'hash_match',
      p_detail: { case: c.id, vendor: hash.detail },
    });
    await apply(c, null, 'unsafe', { hash }, null, true);
    return 'incident';
  }
  if (hash.status === 'error') throw new Later(`hash check: ${hash.message}`);
  if (hash.status === 'not_configured' && policy.requireHashCheck) throw new Later('hash check required but not configured');

  // 2. Video stills: from the server when possible, from the app otherwise.
  let framesSource: 'server' | 'app' | 'none' = 'none';
  const framePaths: string[] = [];
  for (const p of provenance.filter((x) => x.kind === 'video')) {
    if (serverFramesConfigured()) {
      const done = p.server_frame_paths?.length
        ? { state: 'ready' as const, paths: p.server_frame_paths }
        : await serverFrames({
            provenanceId: p.id,
            listingId: listing.id,
            videoUrl: admin.storage.from('listing-media').getPublicUrl(p.storage_path).data.publicUrl,
            assetId: p.server_asset_id,
          });
      if (done.state === 'pending') throw new Later('video still processing');
      if (done.state === 'ready') {
        framePaths.push(...done.paths);
        framesSource = 'server';
        continue;
      }
    }
    if (p.frame_paths?.length) {
      framePaths.push(...p.frame_paths);
      if (framesSource === 'none') framesSource = 'app';
    }
  }

  const skipped: string[] = [];
  const images: { url: string; label: string }[] = [];
  for (const [bucket, path, label] of [
    ...framePaths.map((p) => ['moderation-frames', p, 'video still'] as const),
    ...photos.map((p) => ['listing-media', p, 'photo'] as const),
  ]) {
    if (images.length >= policy.maxImages) break;
    const url = await imageUrl(bucket, path);
    if (url) images.push({ url, label });
    else skipped.push(path);
  }
  const framesSeen = images.filter((i) => i.label === 'video still').length;

  const fingerprints = provenance.map((p) => p.fingerprint).filter((f): f is string => !!f);
  let duplicateOfOtherMember = false;
  if (fingerprints.length) {
    const { data: dup } = await admin
      .from('media_provenance')
      .select('id')
      .in('fingerprint', fingerprints)
      .neq('owner_id', listing.owner_id)
      .limit(1);
    duplicateOfOtherMember = (dup ?? []).length > 0;
  }

  const sources = provenance.map((p) => p.capture_source);
  const captureSource: Context['captureSource'] = sources.includes('library')
    ? 'library'
    : sources.includes('unknown') || sources.length === 0
      ? 'unknown'
      : 'in_app_camera';

  const ctx: Context = {
    hasVideo: !!listing.video_path,
    framesSeen,
    captureSource,
    generatorInMetadata: provenance.some((p) => namesGenerator(p.exif_software)),
    duplicateOfOtherMember,
    hasAuthenticityProof: !!listing.authenticity_path,
    syntheticLimitImported: policy.syntheticLimitImported,
    syntheticLimitInApp: policy.syntheticLimitInApp,
  };
  const checks = { hash: hash.status, frames_source: framesSource };

  if (images.length === 0) {
    // Nothing the analyzer can look at: hold for a person.
    await apply(c, null, 'needs_review', { ctx, checks, skipped, note: 'no readable image' }, null, true);
    return 'held';
  }

  const listingText = [
    `Title: ${listing.title}`,
    listing.brand ? `Brand: ${listing.brand}` : null,
    `Category: ${listing.category}`,
    listing.occasion ? `Occasion: ${listing.occasion}` : null,
    `Images: ${images.map((i, n) => `#${n + 1} ${i.label}`).join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  // 3. The model describes; policy.ts decides.
  const response = await anthropic.beta.messages.create({
    model: policy.model,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: policy.effort, format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((i) => ({ type: 'image' as const, source: { type: 'url' as const, url: i.url } })),
          {
            type: 'text',
            text: `<listing_text>\n${listingText}\n</listing_text>\n\nDescribe this listing using the required fields.`,
          },
        ],
      },
    ],
  });
  // Kept on every case so spend can be read back per day (see the README).
  const usage = {
    model: response.model,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  };

  if (response.stop_reason === 'refusal') {
    // Even the fallback declined to look. Don't distribute, don't accuse: a person decides.
    await apply(
      c,
      null,
      'needs_review',
      { ctx, checks, usage, skipped, refusal: response.stop_details ?? null },
      response.model,
      true,
    );
    return 'held';
  }

  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error(`no text block (stop_reason ${response.stop_reason})`);
  const verdict = JSON.parse(text.text) as Verdict;
  const decision = decide(verdict, ctx);

  if (decision.quarantine) await quarantine(listing.id, mediaPaths);
  if (verdict.unsafe === 'minor_sexualization') {
    await admin.rpc('open_safety_incident', {
      p_listing: listing.id,
      p_kind: 'model_minor_safety',
      p_detail: { case: c.id, summary: verdict.reviewer_summary },
    });
  }

  await apply(
    c,
    decision.distribution,
    decision.reason,
    { verdict, ctx, checks, usage, skipped, decision },
    response.model,
    decision.needsHuman,
  );
  return decision.distribution;
}

async function apply(
  c: Case,
  distribution: string | null,
  reason: string | null,
  signals: unknown,
  model: string | null,
  needsHuman: boolean,
) {
  const { error } = await admin.rpc('apply_moderation_verdict', {
    p_case: c.id,
    p_distribution: distribution,
    p_reason: reason,
    // The app words each reason itself, in the member's language. No model
    // text is ever shown to members.
    p_note: null,
    p_signals: signals,
    p_model: model,
    p_needs_human: needsHuman,
  });
  if (error) throw new Error(`apply ${c.id}: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const body = await req.json().catch(() => ({}));
  const listingId: string | undefined = typeof body?.listingId === 'string' ? body.listingId : undefined;
  const isSweep = isCron(req);

  if (!isSweep) {
    // A member may only ask for their own listing to be looked at now.
    const user = await userFrom(req);
    if (!user || !listingId) return json({ error: 'unauthorized' }, 401);
    const { data: owned } = await admin
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!owned) return json({ error: 'not found' }, 404);
  }

  const { data: cases, error } = await admin.rpc('claim_moderation_cases', {
    p_listing: isSweep ? null : listingId,
    p_min_age_seconds: 120,
    p_limit: isSweep ? 10 : 2,
  });
  if (error) return json({ error: error.message }, 500);

  const policy = await loadPolicy();
  const results: Record<string, string> = {};
  for (const c of (cases ?? []) as Case[]) {
    try {
      results[c.listing_id] = await review(c, policy);
    } catch (e) {
      const message = e instanceof Anthropic.APIError ? `anthropic ${e.status}: ${e.message}` : String(e);
      if (!(e instanceof Later)) console.error(`case ${c.id}:`, message);
      await admin.rpc('release_moderation_case', { p_case: c.id, p_error: message });
      results[c.listing_id] = e instanceof Later ? 'later' : 'retry';
    }
  }
  return json({ processed: results });
});
