# Proof of Work

Verified on **13 November 2026** on branch `cursor/portfolio-proof-ab27` (base commit `e1e2775` over `main` at `272d457`, plus the `390×844` Expo web captures, walkthrough recording, metrics graph, and documentation updates on this branch).
Environment: **Node v24.19.0**, **npm 11.17.0**, **Python 3.12.10** (`matplotlib 3.11.2`), **Playwright 1.65.0** with headless Chrome, **FFmpeg 8.1.2**. No secrets or `.env` files were committed or printed.

---

## 1. Verified Commands & Exact Outputs

Both lockfiles were installed cleanly with `npm ci` (root: `72` audited packages; `mobile/`: `602` audited packages).

### Root Vite Design Prototype (`/`)

```text
> npm run typecheck
> rota-app@0.1.0 typecheck
> tsc -b --noEmit
exit 0

> npm run build
> rota-app@0.1.0 build
> tsc -b && vite build
vite v6.4.3 building for production...
✓ 60 modules transformed.
dist/index.html                   0.82 kB │ gzip:  0.45 kB
dist/assets/index-B7N0E5ap.css    1.96 kB │ gzip:  0.94 kB
dist/assets/index-BerGgBIP.js   332.07 kB │ gzip: 88.90 kB
✓ built in 2.08s
exit 0
```

### Expo Mobile App (`mobile/`)

```text
> npm run typecheck
> mobile@1.0.0 typecheck
> tsc --noEmit
exit 0

> npm run check:price
> mobile@1.0.0 check:price
> node scripts/check-purchase-price.mjs
(node:34084) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///.../mobile/src/data/taxonomy.ts is not specified and it doesn't parse as CommonJS.
parsePurchasePrice: 10 cases pass
exit 0
```

```text
> npx expo export --platform web --output-dir .web-preview-tmp
Web Bundled 118878ms index.ts (911 modules)
› Assets (5): icon, logo-ink, logo-white, InstrumentSerif_400Regular.ttf, InstrumentSerif_400Regular_Italic.ttf
› web bundles (4): index-*.js + livekit-client-*.js
Exported: .web-preview-tmp
exit 0
```
*(Temporary export folder `.web-preview-tmp` was removed after screenshot & video capture.)*

### Not Run in This Environment (Stated Explicitly)

| Check | Reason |
|---|---|
| ESLint / Biome / Prettier | No lint/format config file exists in the repository. |
| `supabase/tests/privacy/*.sql` | SQL privacy scripts (`_prelude.sql` + 10 test files) are meant to be run against a provisioned Postgres/Supabase database; no local `psql`, `deno`, or live Supabase DB session is present in this workspace. |
| Physical iPhone Expo Go / EAS native build | Requires physical device on LAN/tunnel (`docs/TEST_ON_PHONE.md`) or Apple Developer / EAS cloud build (`docs/BUILD.md`). |
| Live Stripe / Claude / Decart / Resend APIs | No secret keys (`sk_*`, `ANTHROPIC_API_KEY`, `DECART_API_KEY`, `RESEND_API_KEY`) in this environment. Server logic is verified from source and types. |

`npm ci` audit output (dependencies left pinned to lockfiles): root reported `2 high`; `mobile/` reported `15` (`1 low, 9 moderate, 4 high, 1 critical`).

---

## 2. Mobile Screenshots (`390×844`), Walkthrough Video & Visual Proof Inventory

All 9 `phone-*.png` files were audited, found at `804×1748` from an earlier desktop-framed capture, and **re-captured from the live Expo SDK 57 web export** (`mobile/`, demo catalog mode) at exact **`390×844`** (`deviceScaleFactor: 1`) using Playwright + headless Chrome, alongside an interactive screen-recorded walkthrough converted with FFmpeg.

| File | Type / Dimensions | Size (bytes) | Source & Description |
|---|---|---|---|
| [docs/proof/rota-app-showcase.png](proof/rota-app-showcase.png) | PNG `1600×900` | 948,090 | Hero composite showcase featuring app icon (`mobile/assets/icon.png`) and 4 verified `390×844` Expo screens |
| [docs/proof/rota-hero-phone.png](proof/rota-hero-phone.png) | PNG `357×187` | 56,065 | 3D iPhone hero mockup featuring Rota lavender splash & hanger logo |
| [docs/proof/phone-onboarding.png](proof/phone-onboarding.png) | PNG **`390×844`** | 250,496 | Expo web: Welcome screen (18+, Google/Email/Demo CTA, Instrument Serif display) |
| [docs/proof/phone-feed.png](proof/phone-feed.png) | PNG **`390×844`** | 461,315 | Expo web: Feed (*Pour toi*), *Louer le look*, ~550 m Paris chip, Liquid Glass tab bar |
| [docs/proof/phone-detail.png](proof/phone-detail.png) | PNG **`390×844`** | 328,273 | Expo web: Listing detail (*Nuisette en biais, ivoire*), offers & *Voir les dates* |
| [docs/proof/phone-dates.png](proof/phone-dates.png) | PNG **`390×844`** | 35,396 | Expo web: Month calendar & *Rencontre à Paris — Offert* handover selector |
| [docs/proof/phone-checkout.png](proof/phone-checkout.png) | PNG **`390×844`** | 50,743 | Expo web: Checkout (dark theme), 79,20 € breakdown & Stripe Identity gate |
| [docs/proof/phone-checkout-light.png](proof/phone-checkout-light.png) | PNG **`390×844`** | 50,675 | Expo web: Checkout (light theme `#F8F4FA` + `#8E3FB0` accessible lavender CTA) |
| [docs/proof/phone-list.png](proof/phone-list.png) | PNG **`390×844`** | 29,386 | Expo web: *Mettre une pièce en location* (video + front/back photo slots) |
| [docs/proof/phone-messages.png](proof/phone-messages.png) | PNG **`390×844`** | 78,714 | Expo web: Messages inbox with stories tray & Paris public meeting points |
| [docs/proof/phone-settings.png](proof/phone-settings.png) | PNG **`390×844`** | 31,901 | Expo web: *Réglages* (profile, payments, Rota Pro, vacation mode, privacy/legal) |
| [docs/proof/rota-mobile-walkthrough.webm](proof/rota-mobile-walkthrough.webm) | WebM `390×844` (VP9) | 4,259,548 | Live 38s Playwright walkthrough across Onboarding → Feed → Detail → Dates → Checkout → Messages → List → Settings → Light Checkout |
| [docs/proof/rota-mobile-walkthrough.mp4](proof/rota-mobile-walkthrough.mp4) | MP4 `390×844` (H.264) | 1,532,745 | FFmpeg H.264 transcode (`yuv420p`, `+faststart`) of the mobile walkthrough |
| [docs/proof/rota-mobile-walkthrough.gif](proof/rota-mobile-walkthrough.gif) | GIF `260×563` | 3,070,206 | Inline GitHub-ready animated preview (8 fps, palettegen/paletteuse) |
| [docs/proof/desktop-onboarding.png](proof/desktop-onboarding.png) | PNG `2880×2208` | 719,637 | Vite prototype desktop stage (dark theme, `1440×1100` @2x) |
| [docs/proof/desktop-checkout-light.png](proof/desktop-checkout-light.png) | PNG `2880×2200` | 454,792 | Vite prototype desktop stage (light theme, `1440×1100` @2x) |
| [docs/proof/architecture.png](proof/architecture.png) | PNG `2104×1472` | 126,807 | Mermaid 11 render of system architecture diagram |
| [docs/proof/schema.png](proof/schema.png) | PNG `2182×2260` | 256,123 | Mermaid 11 render of rental & social core ER diagram |
| [docs/proof/engineering-metrics.png](proof/engineering-metrics.png) | PNG `2430×972` | 158,686 | Matplotlib chart of measured repo line counts & Supabase Postgres/RLS surface |

---

## 3. Repository Source Counts (Observed Directly)

| Metric | Observed Value |
|---|---|
| `mobile/src` (`*.ts`, `*.tsx`) | 82 files, 27,780 lines (including 26 screens in `mobile/src/screens/*.tsx`: 10,414 lines) |
| `src/` Vite prototype (`*.ts`, `*.tsx`) | 36 files, 8,118 lines |
| `supabase/functions` (`*.ts`) | 18 files (12 Edge Functions + `_shared`), 2,419 lines |
| `supabase/**/*.sql` | 65 files, 11,204 lines (`53` migrations: 9,544 lines; `11` privacy test scripts: 1,472 lines; `schema.sql`: 188 lines) |
| `CREATE TABLE` across `supabase/**/*.sql` | 56 |
| `ENABLE ROW LEVEL SECURITY` across `supabase/**/*.sql` | 53 |
| `CREATE POLICY` across `supabase/**/*.sql` | 108 |
| `SECURITY DEFINER` occurrences across `supabase/**/*.sql` | 207 |
| Commits on `main` (`2026-09-18` to `2026-10-16`) | 140 (`124` `Anwarito-lbd`, `16` `zined`) |
