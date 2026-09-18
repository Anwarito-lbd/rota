# Rota

Peer-to-peer **outfit rental** (not resale) — Paris-first, French-first.  
Feel: TikTok × Pinterest × Vinted. Brand stays **Rota**.

## Monorepo

```
apps/mobile   Expo (React Native) SDK 52 · TypeScript · expo-router
apps/api      Express + better-sqlite3 (auth, listings, bookings, Stripe stub)
packages/shared  Shared types + Paris seed catalog (~12 pieces, images + 3 videos)
docs/         APP_STORE.md, ROADMAP.md, …
```

## Prerequisites

- Node 20+
- npm 9+
- Expo Go (device) or iOS Simulator / Android emulator

## Quick start

```bash
# from repo root
npm install

# seed SQLite (API)
npm run seed

# terminal 1 — API
npm run api

# terminal 2 — Expo
cd apps/mobile
npx expo start
```

Demo account after seed: **demo@rota.app** / **rota1234**  
(Offline Expo still accepts the same credentials via local SQLite seed.)

### Mobile only (offline-capable)

The Expo app seeds **expo-sqlite** on first launch with the shared catalog.  
If the API is unreachable, auth/listings/bookings fall back to local data.

```bash
cd apps/mobile
npx expo start
```

### Typecheck

```bash
npm run typecheck
# or
cd apps/mobile && npx tsc --noEmit
```

## Env vars

Copy `.env.example` → `.env` (API) and `apps/mobile/.env` (Expo):

| Var | Where | Purpose |
|-----|--------|---------|
| `PORT` | API | Default `8787` |
| `ROTA_DB_PATH` | API | SQLite file path |
| `STRIPE_SECRET_KEY` | API | Stripe test secret (stub until wired) |
| `EXPO_PUBLIC_API_URL` | Mobile | API base URL |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Mobile | Stripe test publishable key |

## Seed data

- ~12 Paris listings with Unsplash fashion images
- **3 listings include playable demo MP4s** (Google sample bucket)
- Users include **Founding Closet** badge holders
- Password for all seeded users: `rota1234`

```bash
npm run seed
```

## Features (MVP)

| Area | Status |
|------|--------|
| French UI primary screens | Done |
| Auth email+password + magic link stub | Done (persisted session) |
| Feed / Discover / Search filters | Done |
| Listing detail (gallery + video) | Done |
| Booking dates + delivery | Done |
| Checkout Stripe test stub | Stub (env keys, simulated PaymentIntent) |
| Rentals renting/lending | Done |
| Closet + list a piece | Done |
| Profile + `/u/[handle]` | Done |
| Promote / referral + Founding Closet | Done |
| App Store / EAS path | Documented in `docs/APP_STORE.md` |

## iOS / App Store

Bundle id: `com.rota.app`  
See [docs/APP_STORE.md](docs/APP_STORE.md) for EAS build steps. **Do not submit** from this MVP run.

## Architecture (prose)

Mobile talks to `apps/api` over HTTP. The API persists users, sessions, listings, and bookings in SQLite. Shared TypeScript types and the seed catalog live in `@rota/shared`. Payments are intentionally a **Stripe test stub**: booking creates a fake `clientSecret`; confirm marks the booking paid. Swap in real Stripe PaymentIntents when keys are ready.

## License

Private — © Rota
