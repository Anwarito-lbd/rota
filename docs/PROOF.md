# Proof of work

Checked on 13 November 2026 against commit `272d457` plus the documentation changes on this branch. Node v22.23.4, npm 10.9.9. No secrets were printed.

## Commands

Both lockfiles were installed with `npm ci` (root: 73 packages; `mobile/`: 603 packages).

### Root prototype

```text
npm run typecheck
> rota-app@0.1.0 typecheck
> tsc -b --noEmit
exit 0

npm run build
> rota-app@0.1.0 build
> tsc -b && vite build
vite v6.4.3 building for production...
✓ 60 modules transformed.
dist/index.html                   0.80 kB │ gzip:  0.45 kB
dist/assets/index-B7N0E5ap.css    1.96 kB │ gzip:  0.94 kB
dist/assets/index-BerGgBIP.js   332.07 kB │ gzip: 88.90 kB
✓ built in 859ms
exit 0
```

The bundle name is the one from the build after the welcome-line and side-panel copy edits. An earlier build of the unmodified tree produced `index-C47X0kmG.js` (332.11 kB, gzip 88.93 kB) and also exited 0.

### Mobile

```text
npm run typecheck
> mobile@1.0.0 typecheck
> tsc --noEmit
exit 0

npm run check:price
> mobile@1.0.0 check:price
> node scripts/check-purchase-price.mjs
parsePurchasePrice: 10 cases pass
```

Node also printed `MODULE_TYPELESS_PACKAGE_JSON` for `mobile/src/data/taxonomy.ts`, because `mobile/package.json` has no `"type": "module"`. The assertions passed. `"type": "module"` was not added.

`npm run typecheck` and `npm run check:price` were added on this branch so those two commands are the ones a reader can re-run. Before that, the price script was `node scripts/check-purchase-price.mjs` and the app had a `tsconfig.json` but no typecheck script. The first manual `npx tsc --noEmit` in `mobile/` also exited 0.

### Not run

| Check | Why |
|---|---|
| ESLint, Biome, Prettier | No config file in the repository. |
| `supabase/tests/privacy/*.sql` | SQL meant to be pasted after `_prelude.sql` into a database that already has the migrations. `psql` and `deno` are not installed here, and there is no local Supabase database. |
| Expo Go on a device, EAS build, `npm run web` in `mobile/` | Needs a phone or a long native web bundle, and was not started. Typecheck does not boot Metro. |
| Stripe, Claude, Decart, Resend | No secret keys in this environment. Behavior described in the README is from the source, not from a live call. |

`npm ci` printed audit totals and was not followed by `npm audit fix`: root, 2 high; `mobile/`, 15 (1 low, 9 moderate, 4 high, 1 critical).

## Screenshots

`npm run preview -- --host 127.0.0.1 --port 4173` served the `dist/` from the build above. Chrome (`/usr/local/bin/google-chrome`, headless) opened that URL at 1440×1100, device scale 2. Phone frames are element screenshots of `.phone-frame`. The desktop frame is a full-page screenshot of the onboarding stage. Navigation used the stage's own buttons (`Feed`, `Detail`, `Dates`, `Checkout`, `List a piece`, `Messages`, `Settings`, then `Mode clair` on Checkout).

| File | Screen |
|---|---|
| [desktop-onboarding.png](proof/desktop-onboarding.png) | Stage, onboarding, dark |
| [phone-onboarding.png](proof/phone-onboarding.png) | Welcome, 18+ |
| [phone-feed.png](proof/phone-feed.png) | Feed, Pour vous |
| [phone-detail.png](proof/phone-detail.png) | Piece |
| [phone-dates.png](proof/phone-dates.png) | Dates and handover |
| [phone-checkout.png](proof/phone-checkout.png) | Checkout, dark |
| [phone-checkout-light.png](proof/phone-checkout-light.png) | Checkout, light |
| [phone-list.png](proof/phone-list.png) | List a piece, step 1 |
| [phone-messages.png](proof/phone-messages.png) | Messages |
| [phone-settings.png](proof/phone-settings.png) | Settings |
| [desktop-checkout-light.png](proof/desktop-checkout-light.png) | Viewport of the stage after the light toggle |

These are the prototype's sample catalog. They are not a Supabase session.

## Diagrams

The Mermaid blocks in the README and in [ARCHITECTURE.md](ARCHITECTURE.md) were rendered with Mermaid 11 (jsDelivr) in the same headless Chrome, then cropped to the SVG.

| File | Diagram |
|---|---|
| [architecture.png](proof/architecture.png) | Clients, Supabase, Stripe, Claude, Decart, Resend |
| [schema.png](proof/schema.png) | Rental and social foreign keys from `schema.sql` and migrations 002, 004, 009, 010 |

## Repository counts

From the tree that was typechecked, including this branch's copy edits only in `src/` (the counts below were taken before those two string edits, so they are the pre-edit totals; the edits change a few words, not the shape):

| Command | Total |
|---|---|
| `wc -l` on `mobile/src/**/*.ts,tsx` | 27,780 |
| `wc -l` on `src/**/*.ts,tsx` | 8,118 |
| `wc -l` on `supabase/functions/**/*.ts` | 2,419 |
| `wc -l` on `supabase/**/*.sql` | 11,204 |
| `ls supabase/migrations \| wc -l` | 53 |
| `ls mobile/src/screens \| wc -l` | 26 |
| `rg -c '^create table'` on `supabase/**/*.sql` | 56 |
| `git rev-list --count HEAD` on `main` at `272d457` | 140 |

`git log --format='%ad' --date=short` on that history starts 2026-09-18 and ends 2026-10-16.
