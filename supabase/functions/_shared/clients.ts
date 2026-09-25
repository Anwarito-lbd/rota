// Shared by every Rota Edge Function.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY               sk_test_… while testing, sk_live_… later
//   STRIPE_WEBHOOK_SECRET           whsec_… of the "Your account" endpoint
//   STRIPE_CONNECT_WEBHOOK_SECRET   whsec_… of the "Connected accounts" endpoint
//   ROTA_CRON_SECRET                long random string, also stored in the Vault
//   RESEND_API_KEY                  for reminder emails
//   ANTHROPIC_API_KEY               for the listing analyzer
//   MUX_TOKEN_ID / MUX_TOKEN_SECRET optional: stills taken from videos on the server
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient, type User } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@22';

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

let stripeClient: Stripe | null = null;
/** Null until STRIPE_SECRET_KEY is set, so callers can say so plainly. */
export function stripe(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return null;
  stripeClient ??= new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  return stripeClient;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

/** The signed-in member behind the request, or null. */
export async function userFrom(req: Request): Promise<User | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data?.user ?? null;
}

/** Scheduled calls from pg_cron (006_schedules.sql) carry the shared secret. */
export function isCron(req: Request): boolean {
  const secret = Deno.env.get('ROTA_CRON_SECRET') ?? Deno.env.get('MODERATION_CRON_SECRET') ?? '';
  return secret.length >= 16 && req.headers.get('x-rota-cron') === secret;
}

/** Euros (numeric from Postgres) to cents for Stripe. */
export const cents = (euros: number | string | null | undefined) => Math.round(Number(euros ?? 0) * 100);

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}
