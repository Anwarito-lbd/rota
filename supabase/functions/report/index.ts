// Rota — public reports from the website (DSA art. 16).
//
// POST { url, reason, description, name?, email?, goodFaith, website? }
//   → 201 { id }  the reference shown to the reporter (receipt, art. 16(4))
//
// Anyone can report content without an account. The report lands in the
// staff Social queue (kind 'web', migration 015). Five reports per hour per
// source; the source is a salted hash of the IP, never the IP itself.
// `website` is a honeypot: people leave it empty, bots fill it.
//
// Secrets: REPORT_ALLOWED_ORIGINS (optional, comma-separated; default the
// Rota site), REPORT_SALT (optional; SUPABASE_URL is used otherwise).

import { admin, json } from '../_shared/clients.ts';

const REASONS = ['illegal', 'counterfeit', 'harassment', 'inappropriate', 'scam', 'ip_rights', 'minor_safety', 'other'];
const ORIGINS = (Deno.env.get('REPORT_ALLOWED_ORIGINS') ?? 'https://therotaapp.com,https://www.therotaapp.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

const withCors = (req: Request, res: Response) => {
  for (const [k, v] of Object.entries(cors(req))) res.headers.set(k, v);
  return res;
};

async function sourceHash(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const salt = Deno.env.get('REPORT_SALT') ?? Deno.env.get('SUPABASE_URL') ?? 'rota';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return withCors(req, json({ error: 'method' }, 405));

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return withCors(req, json({ error: 'invalid' }, 400));
  // Honeypot filled: pretend it worked, store nothing.
  if (str(body.website, 200)) return withCors(req, json({ id: crypto.randomUUID() }, 201));

  const url = str(body.url, 500);
  const reason = str(body.reason, 40);
  const description = str(body.description, 3000);
  const name = str(body.name, 120);
  const email = str(body.email, 200);

  if (!/^https?:\/\/\S{4,}$/i.test(url)) return withCors(req, json({ error: 'url' }, 400));
  if (!REASONS.includes(reason)) return withCors(req, json({ error: 'reason' }, 400));
  if (description.length < 20) return withCors(req, json({ error: 'description' }, 400));
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return withCors(req, json({ error: 'email' }, 400));
  if (body.goodFaith !== true) return withCors(req, json({ error: 'good_faith' }, 400));

  const { data, error } = await admin.rpc('submit_web_report', {
    p_url: url,
    p_reason: reason,
    p_description: description,
    p_name: name,
    p_email: email,
    p_good_faith: true,
    p_source_hash: await sourceHash(req),
  });
  if (error) {
    const limited = error.message.includes('rate_limited');
    return withCors(req, json({ error: limited ? 'rate_limited' : 'failed' }, limited ? 429 : 500));
  }
  return withCors(req, json({ id: data }, 201));
});
