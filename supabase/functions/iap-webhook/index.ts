// Rota — store purchases, relayed by RevenueCat (migration 027).
//
// RevenueCat → POST { event: { id, type, app_user_id, product_id, expiration_at_ms } }
// with the header  Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>
// (the value you type in RevenueCat › Integrations › Webhooks).
//
// The app never grants Pro or try-on credits itself: only this function,
// after Apple or Google confirmed the payment. Each event is applied once.
//
// Secret: REVENUECAT_WEBHOOK_AUTH (long random string, also set in RevenueCat).

import { admin, json } from '../_shared/clients.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Constant-time comparison, so the secret can't be guessed byte by byte. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
  const sent = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (secret.length < 16 || !same(sent, secret)) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  const e = body?.event;
  if (!e || typeof e.id !== 'string' || typeof e.type !== 'string') return json({ error: 'invalid' }, 400);
  // Test events and anonymous RevenueCat ids have no Rota member behind them.
  if (e.type === 'TEST' || typeof e.app_user_id !== 'string' || !UUID.test(e.app_user_id)) {
    return json({ ok: true, skipped: true });
  }

  const expires = typeof e.expiration_at_ms === 'number' ? new Date(e.expiration_at_ms).toISOString() : null;
  const { data, error } = await admin.rpc('iap_apply_event', {
    p_event_id: e.id,
    p_user: e.app_user_id,
    p_type: e.type,
    p_product: typeof e.product_id === 'string' ? e.product_id : null,
    p_expires: expires,
  });
  // A 5xx makes RevenueCat retry; the event id keeps it from counting twice.
  if (error) return json({ error: 'failed' }, 500);
  return json({ ok: true, result: data });
});
