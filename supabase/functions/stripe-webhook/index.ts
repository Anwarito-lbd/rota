// Rota — Stripe tells us what actually happened.
//
// Two endpoints in the Stripe dashboard point here (same URL):
//   • "Your account":        payment_intent.succeeded / .processing / .payment_failed,
//                            identity.verification_session.*, charge.dispute.created,
//                            radar.early_fraud_warning.created
//   • "Connected accounts":  account.updated
// Each has its own signing secret; both are accepted.

import Stripe from 'npm:stripe@22';
import { admin, json, rpc, stripe } from '../_shared/clients.ts';

const secrets = [Deno.env.get('STRIPE_WEBHOOK_SECRET'), Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')].filter(
  (s): s is string => !!s,
);
const crypto = Stripe.createSubtleCryptoProvider();
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : (v?.id ?? null));

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
    case 'payment_intent.processing':
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      if (pi.metadata?.kind !== 'rental' || !pi.metadata.rental_id) return;
      await rpc('stripe_rental_payment_event', {
        p_rental: pi.metadata.rental_id,
        p_intent: pi.id,
        p_event:
          event.type === 'payment_intent.succeeded'
            ? 'succeeded'
            : event.type === 'payment_intent.processing'
              ? 'processing'
              : 'failed',
        p_customer: idOf(pi.customer),
        p_method: idOf(pi.payment_method),
        p_charge: idOf(pi.latest_charge),
      });
      return;
    }
    case 'account.updated': {
      const a = event.data.object;
      await rpc('stripe_account_updated', {
        p_account: a.id,
        p_payouts_enabled: !!a.payouts_enabled,
        p_details_submitted: !!a.details_submitted,
      });
      return;
    }
    case 'identity.verification_session.verified':
    case 'identity.verification_session.requires_input':
    case 'identity.verification_session.processing': {
      const vs = event.data.object;
      const user = vs.metadata?.user_id ?? vs.client_reference_id;
      if (user) await rpc('stripe_identity_updated', { p_user: user, p_status: vs.status });
      return;
    }
    case 'charge.dispute.created': {
      const intent = idOf(event.data.object.payment_intent);
      if (intent) await rpc('stripe_flag_payment', { p_intent: intent, p_flag: 'dispute' });
      return;
    }
    case 'radar.early_fraud_warning.created': {
      const intent = idOf(event.data.object.payment_intent);
      if (intent) await rpc('stripe_flag_payment', { p_intent: intent, p_flag: 'fraud_warning' });
      return;
    }
    default:
      return;
  }
}

Deno.serve(async (req) => {
  const s = stripe();
  if (!s || secrets.length === 0) return json({ error: 'not_configured' }, 503);
  const signature = req.headers.get('stripe-signature');
  if (!signature) return json({ error: 'signature' }, 400);
  const payload = await req.text();

  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = await s.webhooks.constructEventAsync(payload, signature, secret, undefined, crypto);
      break;
    } catch {
      // Try the other endpoint's secret.
    }
  }
  if (!event) return json({ error: 'signature' }, 400);

  // Stripe delivers at least once. Only the first delivery does anything.
  const fresh = await rpc<boolean>('record_stripe_event', { p_id: event.id, p_type: event.type });
  if (!fresh) return json({ received: true, duplicate: true });

  try {
    await handle(event);
  } catch (e) {
    // Forget the event so Stripe's retry is processed, and ask for that retry.
    await admin.from('stripe_events').delete().eq('id', event.id);
    console.error('webhook', event.type, e);
    return json({ error: 'handler_failed' }, 500);
  }
  return json({ received: true });
});
