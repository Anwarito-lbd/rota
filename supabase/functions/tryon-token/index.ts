// Rota — short-lived Decart token for virtual try-on.
//
// POST {} → { apiKey, expiresAt }
//
// The real DECART_API_KEY stays here (Dashboard → Edge Functions → Secrets).
// The phone gets a client token that expires in 10 minutes, only works for
// the two try-on models, and caps a live session at 3 minutes. Signed-in,
// non-suspended members only. The database decides each token (036): Pro or
// a spent credit, a per-member hourly budget, and a daily ceiling for the
// whole service, so calling this function in a loop can't run up the bill.

import { createDecartClient } from 'npm:@decartai/sdk@0.2';
import { admin, json, userFrom } from '../_shared/clients.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const user = await userFrom(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const key = Deno.env.get('DECART_API_KEY');
  if (!key) return json({ error: 'tryon_not_configured' }, 503);

  const { data: restriction } = await admin
    .from('member_restrictions')
    .select('posting_suspended')
    .eq('user_id', user.id)
    .maybeSingle();
  if (restriction?.posting_suspended) return json({ error: 'suspended' }, 403);

  const { data: verdict, error } = await admin.rpc('tryon_token_allowed', { p_user: user.id });
  if (error) return json({ error: 'failed' }, 500);
  if (verdict === 'no_credit') return json({ error: 'no_credit' }, 402);
  if (verdict === 'rate_limited') return json({ error: 'rate_limited' }, 429);
  if (verdict !== 'ok') return json({ error: 'busy' }, 503);

  const client = createDecartClient({ apiKey: key });
  const token = await client.tokens.create({
    expiresIn: 600,
    allowedModels: ['lucy-vton-3.5', 'lucy-image-2'],
    constraints: { realtime: { maxSessionDuration: 180 } },
    metadata: { member: user.id },
  });
  return json({ apiKey: token.apiKey, expiresAt: token.expiresAt });
});
