// The money movements themselves. Kept free of runtime imports so the
// logic can be tested against a stand-in Stripe (see the repo's tests).

import type Stripe from 'npm:stripe@22';

const cents = (euros: number | string | null | undefined) => Math.round(Number(euros ?? 0) * 100);

export interface Job {
  id: number;
  kind: 'authorize_hold' | 'release_hold' | 'charge_late_fees' | 'charge_claim' | 'transfer_payout' | 'refund_rental';
  rental_id: string;
  claim_id: string | null;
  amount: string | null;
  idempotency_key: string;
  renter_customer: string | null;
  renter_payment_method: string | null;
  owner_account: string | null;
  payment_intent: string | null;
  charge: string | null;
  hold_intent: string | null;
  hold_captured: string | null;
  payout_net: string | null;
}

/** Not worth retrying: a person has to look (card declined, missing setup). */
export class Final extends Error {}

const euros = (c: number) => Math.round(c) / 100;

async function offSessionCharge(s: Stripe, job: Job, amountCents: number, key: string, kind: string) {
  if (!job.renter_customer || !job.renter_payment_method) throw new Final('no saved payment method');
  const pi = await s.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'eur',
      customer: job.renter_customer,
      payment_method: job.renter_payment_method,
      off_session: true,
      confirm: true,
      metadata: { kind, rental_id: job.rental_id, job: String(job.id) },
      transfer_group: `rental_${job.rental_id}`,
    },
    { idempotencyKey: key },
  );
  if (pi.status !== 'succeeded') throw new Final(`charge ${pi.status}`);
  return pi;
}

export async function execute(s: Stripe, job: Job): Promise<{ ref: string | null; amount: number }> {
  const amount = cents(job.amount);
  switch (job.kind) {
    case 'authorize_hold': {
      if (!job.renter_customer || !job.renter_payment_method) throw new Final('no saved payment method');
      const pi = await s.paymentIntents.create(
        {
          amount,
          currency: 'eur',
          customer: job.renter_customer,
          payment_method: job.renter_payment_method,
          off_session: true,
          confirm: true,
          // Authorised only. Released after a clean return, captured only
          // for a claim Rota approved. Card authorisations last about 7 days.
          capture_method: 'manual',
          metadata: { kind: 'hold', rental_id: job.rental_id },
          transfer_group: `rental_${job.rental_id}`,
        },
        { idempotencyKey: job.idempotency_key },
      );
      if (pi.status !== 'requires_capture') throw new Final(`hold ${pi.status}`);
      return { ref: pi.id, amount: euros(pi.amount) };
    }
    case 'release_hold': {
      if (!job.hold_intent) return { ref: null, amount: 0 };
      const pi = await s.paymentIntents.retrieve(job.hold_intent);
      if (pi.status === 'requires_capture') {
        await s.paymentIntents.cancel(job.hold_intent, {}, { idempotencyKey: job.idempotency_key });
      }
      return { ref: job.hold_intent, amount: 0 };
    }
    case 'charge_late_fees': {
      if (amount <= 0) return { ref: null, amount: 0 };
      const pi = await offSessionCharge(s, job, amount, job.idempotency_key, 'late_fees');
      return { ref: pi.id, amount: euros(pi.amount_received) };
    }
    case 'charge_claim': {
      if (amount <= 0) return { ref: null, amount: 0 };
      let collected = 0;
      let ref: string | null = null;
      // Take what we can from the hold first; Stripe releases the rest of it.
      if (job.hold_intent && cents(job.hold_captured) === 0) {
        let hold = await s.paymentIntents.retrieve(job.hold_intent);
        if (hold.status === 'requires_capture') {
          hold = await s.paymentIntents.capture(
            job.hold_intent,
            { amount_to_capture: Math.min(amount, hold.amount_capturable) },
            { idempotencyKey: `${job.idempotency_key}-capture` },
          );
        }
        if (hold.status === 'succeeded') {
          collected += hold.amount_received;
          ref = hold.id;
        }
      }
      const rest = amount - collected;
      if (rest > 0) {
        const pi = await offSessionCharge(s, job, rest, `${job.idempotency_key}-charge`, 'claim');
        collected += pi.amount_received;
        ref = pi.id;
      }
      return { ref, amount: euros(collected) };
    }
    case 'transfer_payout': {
      if (!job.owner_account) throw new Final('owner has no payout account');
      if (amount <= 0) return { ref: null, amount: 0 };
      const net = Math.min(cents(job.payout_net), amount);
      let ref: string | null = null;
      if (net > 0) {
        // Tied to the booking's charge: it goes through even while Stripe is
        // still holding that charge's funds, and can't exceed it.
        const t = await s.transfers.create(
          {
            amount: net,
            currency: 'eur',
            destination: job.owner_account,
            transfer_group: `rental_${job.rental_id}`,
            ...(job.charge ? { source_transaction: job.charge } : {}),
            metadata: { rental_id: job.rental_id, part: 'rent' },
          },
          { idempotencyKey: `${job.idempotency_key}-net` },
        );
        ref = t.id;
      }
      const compensation = amount - net;
      if (compensation > 0) {
        const t = await s.transfers.create(
          {
            amount: compensation,
            currency: 'eur',
            destination: job.owner_account,
            transfer_group: `rental_${job.rental_id}`,
            metadata: { rental_id: job.rental_id, part: 'claim_compensation' },
          },
          { idempotencyKey: `${job.idempotency_key}-compensation` },
        );
        ref = t.id;
      }
      return { ref, amount: euros(amount) };
    }
    case 'refund_rental': {
      if (!job.payment_intent) throw new Final('no payment to refund');
      if (job.hold_intent) {
        const hold = await s.paymentIntents.retrieve(job.hold_intent);
        if (hold.status === 'requires_capture') {
          await s.paymentIntents.cancel(job.hold_intent, {}, { idempotencyKey: `${job.idempotency_key}-hold` });
        }
      }
      const refund = await s.refunds.create(
        { payment_intent: job.payment_intent, metadata: { rental_id: job.rental_id } },
        { idempotencyKey: job.idempotency_key },
      );
      return { ref: refund.id, amount: euros(refund.amount) };
    }
  }
}
