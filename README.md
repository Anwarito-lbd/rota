# Rota

Peer-to-peer **outfit rental** (not resale) — Paris-first, French-first.
Feel: TikTok × Pinterest × Vinted — discover a look, tap the pieces, rent them.

## Repo layout

```
mobile/       The app — Expo SDK 57, runs in Expo Go, App Store path via EAS
supabase/     Database (schema + migrations) and Edge Functions
src/          Web prototype (Vite + React) used as the design reference
design/       Claude Design canvas export, brand assets, app screenshots
docs/         Launch plan, delivery spec, research, App Store checklist, FR legal drafts
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

**No backend yet? Demo mode.** Without `mobile/.env`, the welcome screen shows
"Découvrir l’app en mode démo": sample members, looks and pieces, all in
memory. Preview in a browser with `npm run web` (in `mobile/`).

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
- **Social layer** (migration 009): fits and dumps in a TikTok-style feed
  (Pour toi / Suivis / Près de moi), a Pinterest-style Explorer with weekly
  challenges, "Rent the look" (tap a tagged piece in a photo to rent it),
  follows, likes, comments, boards, report and block everywhere
- **Near me map**: approximate locations only (~550 m grid, never an address)
- **Virtual try-on** with Decart (`lucy-vton-3.5` live on web,
  `lucy-image-2` on a photo), behind an AI consent screen
- **ID verification gate**: Stripe Identity required to rent and to list;
  verified members post without review
- **Messages**: one conversation per pair of members, real time, meeting
  points picked from a list of public places, a "keep it in Rota" nudge on
  phone numbers / e-mails / payment apps, report and block on every thread
- **Community rules** screen (Dressing → Règles de la communauté): what is
  allowed, how moderation works (a person reviews reports, usually within 24 h)
- **Back office → Social**: pending posts and every report on posts,
  comments, messages and profiles, oldest first, each decision audited
- Delivery: "Rencontre à Paris — Offert" only, for now. "Rota Delivery" is
  built into booking but switched off server-side (`flag_rota_delivery`)
  until labels and tracking exist (see [docs/DELIVERY.md](docs/DELIVERY.md))

## App Store

See [docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md) (compliance audit and what
blocks a first launch) and [docs/APP_STORE.md](docs/APP_STORE.md).
Bundle id: `com.rota.app`.

## Handoff — where things stand (26 September 2026, branch `feat/social`)

Read this first if you are the next agent.

**Design.** The Figma file "Rota — iOS redesign"
(`figma.com/design/EiWQEQsebOXdDoIhZfQoRe`) is the source of truth. Its
Tokens frame sets the rules the app now follows: system font (SF Pro) for
all UI and Instrument Serif only for brand lines (`ff()`, `TYPE`, `RADIUS`
in `mobile/src/theme/tokens.ts`); pill buttons; 28 pt sheets; Liquid Glass
only on the floating tab bar and on controls over photos (`ui/TabBar.tsx`
uses `expo-blur`, solid when Reduce Transparency is on); springs off with
Reduce Motion (`ui/motion.tsx`). The tab bar has four tabs; creating moved
to the "+ Louer" pill in the feed header. Screens of this build are in
`design/social-screens/` and were uploaded to the Figma file (nodes
59:2–59:17, not yet arranged: the Figma Starter plan's MCP quota ran out).
Figma frames 01–11 cover onboarding, feed, detail, booking, checkout,
dressing, settings and three sheets; the new social screens (12+) still need
proper Figma frames built from the file's components.

**Code map (new).**
- Data: `src/data/social.tsx` (one provider for posts, follows, likes,
  comments, boards, blocks, reports, publishing, nearby, identity; Supabase
  or demo), `src/data/demo.ts` (demo mode).
- Screens: `Feed.tsx`, `Discover.tsx` (masonry), `Social.tsx` (post,
  profile, boards), `NearMap.tsx` + `ui/AreaMap(.web).tsx`, `Compose.tsx`
  (photos, tags, challenge, approximate area), `TryOn.tsx` +
  `lib/tryon.ts`, `Verify.tsx` (+ `IdentityGate` used in Checkout and
  ListPiece).
- UI: `ui/PostCard.tsx`, `ui/SocialSheets.tsx`, `ui/motion.tsx`.
- Strings: `src/i18n/social.ts` (fr/en/es).
- Server: `supabase/migrations/009_social.sql` (RLS on everything),
  `supabase/functions/tryon-token` (Decart key stays server-side).
- Web preview: `metro.config.js` swaps `@stripe/stripe-react-native` for
  `web-shims/` on web only.

**Done since (branch `feat/finish-core`, migration 010).** Staff queue for
the social layer (`staff_social_queue`, `staff_decide_social`), in-app
messaging (`conversations`, `messages`, `start_conversation`,
`my_conversations`, Realtime), the community rules screen, and a server
switch that refuses `delivery = 'ship'` while `flag_rota_delivery` is false.
Client: `src/data/messages.ts`, `screens/Messages.tsx`, `screens/Guidelines.tsx`,
`ui/MessageButton.tsx` (profile, listing, rental), Admin → Social.

**Not done yet.** Apply migrations 009 and 010 to the real Supabase project
and test them (never run against a database yet); deploy `tryon-token`
(+ `DECART_API_KEY`); lawyer-reviewed terms and privacy policy covering
posts, messages, approximate location, Decart and Stripe Identity; the
delivery pieces in `docs/DELIVERY.md` (labels, carrier webhook, QR) before
turning `flag_rota_delivery` on; `.well-known` files for app links; Figma
frames for the social screens; a store build tested on a phone and the iOS
guard run. See [docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md).

**Figma screens applied (branch `feat/figma-screens`, migration 011).**
Welcome (app tile, Sign in with Apple on iOS, Google, e-mail), permissions
(Figma 10), Dressing (07), Réglages (08) with Membres bloqués, account
deletion sheet (09), report / block sheets (11), booking handover (05). The
kit's `Row` / `Group` / `SectionLabel` / `BackButton` now draw iOS inset
grouped lists, so every settings-style page follows. Apple / Google sign-ins
get a placeholder username and are asked to choose one (`UsernamePrompt`).

**Launch paperwork.** [docs/STORE_ACCOUNTS.md](docs/STORE_ACCOUNTS.md)
(Apple, Google Play, Supabase auth providers, Stripe, Decart, app links,
privacy declarations, review notes), [docs/BUILD.md](docs/BUILD.md) (EAS),
and the lawyer pack [docs/legal/07-revue-avocat-social-2026-09.md](docs/legal/07-revue-avocat-social-2026-09.md).

**Develop outside OneDrive.** Metro fails with `EINVAL: readlink … app.json`
on files OneDrive has synced; clone the repo to a normal folder.

**Research.** [docs/research/2026-09-paris-launch-deep-research.md](docs/research/2026-09-paris-launch-deep-research.md)
(market, hybrid fulfilment, escrow, protection, French law, copy, KPIs, rollout).

## History

This repo merges two efforts: the earlier Expo Router MVP (`apps/`, `packages/`,
still reachable in the history and on branch `feat/expo-mvp`) and the design
canvas port that is now `mobile/`.

## License

Private — all rights reserved.
