// Rota — a member's own data (GDPR art. 15, 17 and 20).
//
// POST { action: 'export' }
//   Everything Rota holds about the member, as JSON. Public photos come with
//   their public link; private documents (proof of authenticity) with a
//   7-day signed link.
//
// POST { action: 'delete', confirm: 'SUPPRIMER' | 'DELETE' | 'ELIMINAR' }
//   The database refuses while a rental or a payout is in progress. Then:
//   personal data and the member's photos are erased, the sign-in is replaced
//   by an unusable address and banned, Apple / Google links are removed, and
//   every session is signed out. Rentals, payments and claims stay,
//   pseudonymised, because accounting and consumer law require them to be kept.

import { admin, json, userFrom } from '../_shared/clients.ts';

const CONFIRM = new Set(['SUPPRIMER', 'DELETE', 'ELIMINAR']);

/** Removes every file under a folder, at any depth, 1 000 entries per page. */
async function wipeFolder(bucket: string, folder: string): Promise<number> {
  let removed = 0;
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error || !data?.length) break;
    for (const entry of data) {
      const path = `${folder}/${entry.name}`;
      if (entry.id) files.push(path);
      else removed += await wipeFolder(bucket, path);
    }
    if (data.length < 1000) break;
  }
  for (let i = 0; i < files.length; i += 100) await admin.storage.from(bucket).remove(files.slice(i, i + 100));
  return removed + files.length;
}

/** A stored path's public link; links that are already URLs pass through. */
const pub = (bucket: string, p: string) =>
  /^[a-z]+:/i.test(p) ? p : admin.storage.from(bucket).getPublicUrl(p).data.publicUrl;

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []);

type Row = Record<string, unknown>;

async function exportData(userId: string) {
  const { data, error } = await admin.rpc('export_member_data', { p_user: userId });
  if (error || !data) return null;
  // Closed or removed items may have lost their paths (033b): every field is optional.
  const posts = ((data.posts ?? []) as Row[]).map((p) => ({
    ...p,
    media_urls: list(p.media_paths).map((x) => pub('post-media', x)),
  }));
  const stories = ((data.stories ?? []) as Row[]).map((s) => ({
    ...s,
    media_url: typeof s.media_path === 'string' && s.media_path ? pub('post-media', s.media_path) : null,
  }));
  const listings = await Promise.all(
    ((data.listings ?? []) as Row[]).map(async (l) => {
      const proof = typeof l.authenticity_path === 'string' && l.authenticity_path ? l.authenticity_path : null;
      return {
        ...l,
        photo_urls: list(l.photo_paths).map((x) => pub('listing-media', x)),
        video_url: typeof l.video_path === 'string' && l.video_path ? pub('listing-media', l.video_path) : null,
        authenticity_url: proof
          ? (await admin.storage.from('private-docs').createSignedUrl(proof, 604800)).data?.signedUrl ?? null
          : null,
      };
    }),
  );
  return { ...data, posts, stories, listings };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const user = await userFrom(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await req.json().catch(() => ({}));

  if (body?.action === 'export') {
    const data = await exportData(user.id).catch(() => null);
    return data ? json(data) : json({ error: 'failed' }, 500);
  }

  if (body?.action !== 'delete') return json({ error: 'unknown_action' }, 400);
  if (!CONFIRM.has(String(body.confirm ?? '').trim().toUpperCase())) return json({ error: 'confirm' }, 400);

  // Refuses (and changes nothing) while anything is in progress. Also closes the
  // social side (stories, reposts, comment likes…) in the same transaction.
  const { error } = await admin.rpc('close_member_account', { p_user: user.id });
  if (error) {
    const reason = /Active rentals/.test(error.message)
      ? 'active_rentals'
      : /Payouts pending/.test(error.message)
        ? 'payouts_pending'
        : /Open claims/.test(error.message)
          ? 'open_claims'
          : 'failed';
    return json({ error: reason }, reason === 'failed' ? 500 : 409);
  }

  // Their own photos. Condition photos of past rentals stay: the other
  // party may still need them as evidence.
  const removed: Record<string, number> = {};
  for (const bucket of ['avatars', 'listing-media', 'post-media', 'private-docs', 'moderation-frames']) {
    removed[bucket] = await wipeFolder(bucket, user.id).catch(() => 0);
  }

  // The e-mail is personal data: replace it, and make sure nobody can sign in again.
  await admin.auth.admin.updateUserById(user.id, {
    email: `closed-${user.id}@closed.therotaapp.com`,
    email_confirm: true,
    user_metadata: {},
    ban_duration: '876000h',
  });

  // Apple / Google links are personal data too.
  const { data: full } = await admin.auth.admin.getUserById(user.id);
  for (const identity of full?.user?.identities ?? []) {
    if (identity.provider !== 'email') {
      await admin.rpc('drop_identity', { p_identity: identity.identity_id }).then(() => undefined, () => undefined);
    }
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  await admin.auth.admin.signOut(token, 'global').catch(() => undefined);

  return json({ closed: true, removed });
});
