// Rota — short-lived Decart token for virtual try-on.
//
// POST {} → { apiKey, expiresAt }
//
// The real DECART_API_KEY stays here (Dashboard → Edge Functions → Secrets).
// The phone gets a client token that expires in 10 minutes, only works for
// the two try-on models, and caps a live session at 3 minutes. Signed-in,
// non-suspended members only, with a small per-member hourly budget.

import { createDecartClient } from 'npm:@decartai/sdk@0.2';
import { admin, json, userFrom } from '../_shared/clients.ts';

const PER_HOUR = 20;
const recent = new Map<string, number[]>();

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

  // Best-effort budget per function instance; Decart's own limits still apply.
  const now = Date.now();
  const window = (recent.get(user.id) ?? []).filter((t) => now - t < 3_600_000);
  if (window.length >= PER_HOUR) return json({ error: 'rate_limited' }, 429);
  window.push(now);
  recent.set(user.id, window);

  const client = createDecartClient({ apiKey: key });
  const token = await client.tokens.create({
    expiresIn: 600,
    allowedModels: ['lucy-vton-3.5', 'lucy-image-2'],
    constraints: { realtime: { maxSessionDuration: 180 } },
    metadata: { member: user.id },
  });
  return json({ apiKey: token.apiKey, expiresAt: token.expiresAt });
});
