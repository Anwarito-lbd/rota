# Rota

Peer-to-peer **outfit rental** (not resale) — Paris-first, French-first.
Feel: TikTok × Pinterest × Vinted — discover a look, tap the pieces, rent them.

## Repo layout

```
mobile/       The app — Expo SDK 57, runs in Expo Go, App Store path via EAS
supabase/     Database schema: profiles, listings, favorites, storage, RLS
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

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Copy `mobile/.env.example` to `mobile/.env` and fill in the project URL and
   the **publishable** key. `.env` is never committed.

## What's in the app

- Accounts: unique usernames, password rules, e-mail OTP, two-factor sign-in
- Identity verification and account certification, authenticity proof on listings
- Feed, discover, search, listing detail, dates, checkout with real payment
  methods (Apple Pay, Google Pay, PayPal, card, wallet — never cash)
- Lender rules accepted before payment, cleaning fee only when the lender cleans
- Two-sided 10% service fee and value-based deposit tiers (`mobile/src/lib/fees.ts`)
- Real device permissions: camera, microphone, photos, location

## App Store

See [docs/APP_STORE.md](docs/APP_STORE.md). Bundle id: `com.rota.app`.

## History

This repo merges two efforts: the earlier Expo Router MVP (`apps/`, `packages/`,
still reachable in the history and on branch `feat/expo-mvp`) and the design
canvas port that is now `mobile/`.

## License

Private — all rights reserved.
