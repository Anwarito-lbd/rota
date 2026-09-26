// Rota — closing an account (GDPR art. 17).
//
// POST { action: 'delete', confirm: 'SUPPRIMER' | 'DELETE' | 'ELIMINAR' }
//
// The database refuses while a rental or a payout is in progress. Then:
// personal data and the member's photos are erased, the sign-in is replaced
// by an unusable address and banned, and every session is signed out.
// Rentals, payments and claims stay, pseudonymised, because accounting and
// consumer law require them to be kept.

import { admin, json, userFrom } from '../_shared/clients.ts';

const CONFIRM = new Set(['SUPPRIMER', 'DELETE', 'ELIMINAR']);

/** Removes every file under the member's folder (one level of subfolders). */
async function wipeFolder(bucket: string, userId: string) {
  const paths: string[] = [];
  const { data: top } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
  for (const entry of top ?? []) {
    if (entry.id) {
      paths.push(`${userId}/${entry.name}`);
    } else {
      const { data: inner } = await admin.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 });
      for (const f of inner ?? []) if (f.id) paths.push(`${userId}/${entry.name}/${f.name}`);
    }
  }
  for (let i = 0; i < paths.length; i += 100) await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
  return paths.length;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const user = await userFrom(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'delete') return json({ error: 'unknown_action' }, 400);
  if (!CONFIRM.has(String(body.confirm ?? '').trim().toUpperCase())) return json({ error: 'confirm' }, 400);

  // Refuses (and changes nothing) while anything is in progress.
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
  for (const bucket of ['avatars', 'listing-media', 'private-docs', 'moderation-frames']) {
    removed[bucket] = await wipeFolder(bucket, user.id).catch(() => 0);
  }

  // The e-mail is personal data: replace it, and make sure nobody can sign in again.
  await admin.auth.admin.updateUserById(user.id, {
    email: `closed-${user.id}@closed.therotaapp.com`,
    email_confirm: true,
    user_metadata: {},
    ban_duration: '876000h',
  });
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  await admin.auth.admin.signOut(token, 'global').catch(() => undefined);

  return json({ closed: true, removed });
});
