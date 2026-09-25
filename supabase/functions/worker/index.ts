// Rota — the worker. Runs every minute (006_schedules.sql):
//   1. moves the money the database asked for (payment_jobs)
//   2. emails reminders and receipts (notifications)
// It never decides an amount: the database does, the worker executes and
// reports back. Every Stripe call carries the job's idempotency key, so a
// retry can never charge twice.

import Stripe from 'npm:stripe@22';
import { isCron, json, rpc, stripe } from '../_shared/clients.ts';
import { type Lang, render } from './emails.ts';
import { execute, Final, type Job } from './money.ts';

/** Card problems need the renter; network and balance problems just need time. */
function retryable(e: unknown) {
  if (e instanceof Final) return false;
  if (e instanceof Stripe.errors.StripeCardError) return false;
  if (e instanceof Stripe.errors.StripeInvalidRequestError) return e.code === 'balance_insufficient';
  return true;
}

async function runPaymentJobs() {
  const s = stripe();
  if (!s) return { skipped: 'STRIPE_SECRET_KEY not set' };
  const jobs = await rpc<Job[]>('claim_payment_jobs', { p_limit: 10 });
  const done: Record<string, string> = {};
  for (const job of jobs ?? []) {
    try {
      const result = await execute(s, job);
      await rpc('complete_payment_job', { p_job: job.id, p_ref: result.ref, p_amount: result.amount });
      done[job.id] = 'done';
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`job ${job.id} ${job.kind}:`, message);
      await rpc('fail_payment_job', { p_job: job.id, p_error: message, p_retryable: retryable(e) });
      done[job.id] = retryable(e) ? 'retry' : 'failed';
    }
  }
  return done;
}

interface Outgoing {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  email: string | null;
  lang: Lang;
  username: string;
  listing_title: string | null;
  start_date: string | null;
  end_date: string | null;
}

async function sendEmails() {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { skipped: 'RESEND_API_KEY not set' };
  const from = Deno.env.get('NOTIFY_FROM') ?? 'Rota <notifications@therotaapp.com>';
  const batch = await rpc<Outgoing[]>('claim_notifications', { p_limit: 25 });
  let sent = 0;
  for (const n of batch ?? []) {
    const email = render({
      kind: n.kind,
      lang: n.lang,
      username: n.username,
      title: n.listing_title,
      start: n.start_date,
      end: n.end_date,
      payload: n.payload ?? {},
    });
    if (!email || !n.email) {
      await rpc('mark_notification_email', { p_id: n.id, p_state: 'skipped' });
      continue;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `notification-${n.id}`,
      },
      body: JSON.stringify({ from, to: [n.email], subject: email.subject, text: email.text }),
    });
    if (res.ok) sent++;
    else console.error('resend', res.status, await res.text());
    await rpc('mark_notification_email', { p_id: n.id, p_state: res.ok ? 'sent' : 'failed' });
  }
  return { sent };
}

Deno.serve(async (req) => {
  if (!isCron(req)) return json({ error: 'unauthorized' }, 401);
  const payments = await runPaymentJobs().catch((e) => ({ error: String(e) }));
  const emails = await sendEmails().catch((e) => ({ error: String(e) }));
  return json({ payments, emails });
});
