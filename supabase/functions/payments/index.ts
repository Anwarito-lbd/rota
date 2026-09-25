// Rota — payments for the app: pay a booking, get paid as a lender,
// verify your identity. Every action acts on the signed-in member only.
//
// POST { action: 'rental_checkout', rentalId }
// POST { action: 'connect_onboarding' | 'connect_status' | 'connect_dashboard' }
// POST { action: 'identity_session' | 'identity_status' }
// GET  ?page=done|connect_refresh — where Stripe sends the browser back to.

import type { User } from 'npm:@supabase/supabase-js@2';
import { admin, cents, FUNCTIONS_URL, json, rpc, stripe, text, userFrom } from '../_shared/clients.ts';

type StripeClient = NonNullable<ReturnType<typeof stripe>>;

async function paymentAccount(userId: string) {
  const { data } = await admin.from('payment_accounts').select('*').eq('user_id', userId).maybeSingle();
  return data as {
    stripe_customer_id: string | null;
    stripe_account_id: string | null;
    identity_session_id: string | null;
  } | null;
}

async function ensureCustomer(s: StripeClient, user: User) {
  const existing = (await paymentAccount(user.id))?.stripe_customer_id;
  if (existing) return existing;
  const customer = await s.customers.create(
    { email: user.email, metadata: { user_id: user.id } },
    { idempotencyKey: `customer-${user.id}` },
  );
  await rpc('set_payment_account', { p_user: user.id, p_customer: customer.id });
  return customer.id;
}

async function rentalCheckout(s: StripeClient, user: User, rentalId: string) {
  const { data: rental } = await admin.from('rentals').select('*').eq('id', rentalId).maybeSingle();
  if (!rental || rental.renter_id !== user.id) return json({ error: 'not_found' }, 404);
  if (rental.payment_status === 'paid') return json({ alreadyPaid: true });
  if (rental.status !== 'booked') return json({ error: 'not_payable' }, 409);
  if (new Date(rental.payment_due_by).getTime() < Date.now()) return json({ error: 'expired' }, 409);

  const customer = await ensureCustomer(s, user);
  const amount = cents(rental.total_charged);

  let intent = rental.stripe_payment_intent_id
    ? await s.paymentIntents.retrieve(rental.stripe_payment_intent_id)
    : null;
  if (intent?.status === 'succeeded' || intent?.status === 'processing') {
    // The webhook will mark the rental paid; nothing to collect again.
    return json({ alreadyPaid: true });
  }
  if (!intent || intent.status === 'canceled' || intent.amount !== amount) {
    intent = await s.paymentIntents.create(
      {
        amount,
        currency: 'eur',
        customer,
        // The card is kept for the charges the renter agreed to at checkout
        // (late fees, approved damage), never for anything else.
        setup_future_usage: 'off_session',
        automatic_payment_methods: { enabled: true },
        description: `Rota — location du ${rental.start_date} au ${rental.end_date}`,
        metadata: { kind: 'rental', rental_id: rental.id, renter_id: user.id },
        transfer_group: `rental_${rental.id}`,
      },
      { idempotencyKey: `rental-${rental.id}${intent ? `-after-${intent.id}` : ''}` },
    );
    await rpc('set_rental_payment_intent', { p_rental: rental.id, p_intent: intent.id });
  }

  const session = await s.customerSessions.create({
    customer,
    components: {
      mobile_payment_element: {
        enabled: true,
        features: {
          payment_method_save: 'enabled',
          payment_method_redisplay: 'enabled',
          payment_method_remove: 'enabled',
        },
      },
    },
  });

  return json({
    paymentIntentClientSecret: intent.client_secret,
    customerSessionClientSecret: session.client_secret,
    customerId: customer,
    amount,
  });
}

async function connectOnboarding(s: StripeClient, user: User) {
  let account = (await paymentAccount(user.id))?.stripe_account_id;
  if (!account) {
    const created = await s.accounts.create(
      {
        country: 'FR',
        email: user.email,
        business_type: 'individual',
        // Express-style: Stripe collects the identity and bank details and
        // hosts the lender's dashboard; Rota carries fees and negative balances.
        controller: {
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          stripe_dashboard: { type: 'express' },
        },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: {
          mcc: '7296', // Clothing rental
          product_description: 'Location de vêtements entre particuliers sur Rota',
        },
        metadata: { user_id: user.id },
      },
      { idempotencyKey: `account-${user.id}` },
    );
    account = created.id;
    await rpc('set_payment_account', { p_user: user.id, p_account: account });
  }
  // Refresh lands on a plain page: an onboarding link must never be minted
  // for whoever holds an account id, only for the signed-in member.
  const link = await s.accountLinks.create({
    account,
    type: 'account_onboarding',
    refresh_url: `${FUNCTIONS_URL}/payments?page=connect_refresh`,
    return_url: `${FUNCTIONS_URL}/payments?page=done`,
  });
  return json({ url: link.url });
}

async function connectStatus(s: StripeClient, user: User) {
  const account = (await paymentAccount(user.id))?.stripe_account_id;
  if (!account) return json({ hasAccount: false, payoutsEnabled: false, detailsSubmitted: false });
  const a = await s.accounts.retrieve(account);
  await rpc('stripe_account_updated', {
    p_account: a.id,
    p_payouts_enabled: !!a.payouts_enabled,
    p_details_submitted: !!a.details_submitted,
  });
  return json({ hasAccount: true, payoutsEnabled: !!a.payouts_enabled, detailsSubmitted: !!a.details_submitted });
}

async function connectDashboard(s: StripeClient, user: User) {
  const account = (await paymentAccount(user.id))?.stripe_account_id;
  if (!account) return json({ error: 'no_account' }, 409);
  const link = await s.accounts.createLoginLink(account);
  return json({ url: link.url });
}

async function identitySession(s: StripeClient, user: User) {
  const session = await s.identity.verificationSessions.create({
    type: 'document',
    options: { document: { require_matching_selfie: true, require_live_capture: true } },
    provided_details: user.email ? { email: user.email } : undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
  });
  await rpc('set_payment_account', { p_user: user.id, p_identity_session: session.id });
  // The URL is single-use and short-lived: it goes to this member's app only.
  return json({ url: session.url });
}

async function identityStatus(s: StripeClient, user: User) {
  const id = (await paymentAccount(user.id))?.identity_session_id;
  if (!id) return json({ status: 'none' });
  const session = await s.identity.verificationSessions.retrieve(id);
  await rpc('stripe_identity_updated', { p_user: user.id, p_status: session.status });
  return json({ status: session.status });
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    const page = new URL(req.url).searchParams.get('page');
    return text(
      page === 'connect_refresh'
        ? 'Ce lien a expiré. Retournez dans Rota et appuyez à nouveau sur « Recevoir mes gains ».'
        : 'C’est fait. Vous pouvez fermer cette page et retourner dans Rota.',
    );
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const user = await userFrom(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const s = stripe();
  if (!s) return json({ error: 'payments_not_configured' }, 503);

  const body = await req.json().catch(() => ({}));
  try {
    switch (body?.action) {
      case 'rental_checkout':
        if (typeof body.rentalId !== 'string') return json({ error: 'rentalId' }, 400);
        return await rentalCheckout(s, user, body.rentalId);
      case 'connect_onboarding':
        return await connectOnboarding(s, user);
      case 'connect_status':
        return await connectStatus(s, user);
      case 'connect_dashboard':
        return await connectDashboard(s, user);
      case 'identity_session':
        return await identitySession(s, user);
      case 'identity_status':
        return await identityStatus(s, user);
      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) {
    console.error('payments', body?.action, e);
    return json({ error: 'provider_error', message: e instanceof Error ? e.message : String(e) }, 502);
  }
});
