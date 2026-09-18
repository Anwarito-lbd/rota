# Rota

Peer-to-peer **outfit rental** (not resale) — Paris-first, French-first.  
Feel: TikTok × Pinterest × Vinted — discover a look, tap the pieces, rent them.

## Repo layout

```
apps/mobile   Expo SDK 52 (iOS App Store path via EAS)
apps/api      Express + SQLite API
packages/shared   Shared types + Paris seed catalog (images + 3 videos)
docs/         App Store, roadmap, legal drafts (FR)
```

## Quick start

```bash
npm install
npm run seed
npm run api                 # http://localhost:8787
cd apps/mobile && npx expo start
```

Demo login: `demo@rota.app` / `rota1234`

Optional env (see `.env.example`):

- `EXPO_PUBLIC_API_URL` — API base (default `http://localhost:8787`)
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` — Stripe test stubs

## What’s in the MVP

- Auth (email/password + magic-link stub)
- Feed / discover / listing detail (images; videos on native, poster on web)
- Book dates → checkout stub (€150 deposit; shipping on renter unless free)
- Rentals, closet, list a piece, promote / Founding Closet referral
- `docs/APP_STORE.md` — EAS / App Store checklist (do not submit until ready)
- `docs/legal/` — FR CGU/privacy/fees drafts for avocat review (not final advice)

## App Store

See [docs/APP_STORE.md](docs/APP_STORE.md). Bundle id: `com.rota.app`.

## Collaborators

Invite pending / accepted: see [docs/COLLABORATORS.md](docs/COLLABORATORS.md).

## License

Private — all rights reserved.
