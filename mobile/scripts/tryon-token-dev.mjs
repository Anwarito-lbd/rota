// Local stand-in for the tryon-token Edge Function, for testing try-on in
// demo mode (no Supabase). Keeps DECART_API_KEY on your machine:
//
//   DECART_API_KEY=... node scripts/tryon-token-dev.mjs
//   EXPO_PUBLIC_TRYON_TOKEN_URL=http://localhost:8787/token  (in mobile/.env)
//
// Never deploy this: it has no sign-in check.
import { createServer } from 'node:http';
import { createDecartClient } from '@decartai/sdk';

const key = process.env.DECART_API_KEY;
if (!key) {
  console.error('Set DECART_API_KEY first.');
  process.exit(1);
}
const client = createDecartClient({ apiKey: key });

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST' || req.url !== '/token') {
    res.statusCode = 404;
    return res.end();
  }
  try {
    const token = await client.tokens.create({
      expiresIn: 600,
      allowedModels: ['lucy-vton-3.5', 'lucy-image-2'],
      constraints: { realtime: { maxSessionDuration: 180 } },
    });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ apiKey: token.apiKey, expiresAt: token.expiresAt }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: String(e?.message ?? e) }));
  }
}).listen(8787, '127.0.0.1', () => console.log('try-on tokens on http://localhost:8787/token'));
