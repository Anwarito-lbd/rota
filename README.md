# Rota

Peer-to-peer **outfit rental** (not resale) — Paris-first, French-first.
Feel: TikTok × Pinterest × Vinted — discover a look, tap the pieces, rent them.

## Repo layout

```
mobile/       The app — Expo SDK 57, runs in Expo Go, App Store path via EAS
supabase/     Database (schema + migrations) and Edge Functions
src/          Web prototype (Vite + React) used as the design reference
design/       The original Claude Design canvas export
docs/         App Store checklist, roadmap, FR legal drafts
```

## Quick start

Requires **Node.js 22+**.

```bash
cd mobile
npm install
npx expo start --tunnel
```

Scan the QR code with **Expo Go** (phone and computer signed in to the same
Expo account). `--tunnel` works on any network; drop it when both devices share
a Wi-Fi.

The web prototype still runs from the repo root with `npm run dev`.

## Backend

Accounts, listings and media live in **Supabase**; account e-mails are sent
through **Resend** from `no-reply@therotaapp.com`.

Payments go through **Stripe** (Connect for lenders' payouts, Identity for
ID checks, Radar for fraud), listing review through the **Claude API**, and
reminder e-mails through Resend.

Full setup, step by step: [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).
Copy `mobile/.env.example` to `mobile/.env` for the app's public keys;
`.env` is never committed.

## What's in the app

- Accounts: unique usernames, password rules, e-mail OTP, two-factor sign-in
- Identity verification and account certification, authenticity proof on listings
- Feed, discover, listing detail, a real availability calendar (no double
  booking), checkout paid through Stripe — never cash
- Deposit-free by default; a hold only when a risk rule asks for one. The
  renter's liability is capped at the value shown at checkout
- Handover and return confirmed by code, late fees capped, claims decided by
  Rota, lender payouts released after the claim window
- Every listing reviewed before the feed: off-topic, AI-looking, unsafe or
  copied content is kept out; members can report and appeal
- Back office for staff: moderation, claims, rentals, safety incidents
- Lender rules accepted before payment, cleaning fee only when the lender cleans
- Real device permissions: camera, microphone, photos, location

## App Store

See [docs/APP_STORE.md](docs/APP_STORE.md). Bundle id: `com.rota.app`.

## History

This repo merges two efforts: the earlier Expo Router MVP (`apps/`, `packages/`,
still reachable in the history and on branch `feat/expo-mvp`) and the design
canvas port that is now `mobile/`.

## License

Private — all rights reserved.
