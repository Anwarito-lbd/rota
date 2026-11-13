# Proof of Work — Rota (`@therotaapp`)

> Mirror & summary of verified checks, visual captures, and codebase measurements for [PROOF.md](PROOF.md) on branch `cursor/portfolio-proof-ab27` (PR #14).

## Verification Summary (13 November 2026)

| Check / Artifact | Command / Tool | Observed Result |
|---|---|---|
| Root prototype typecheck | `npm run typecheck` (`tsc -b --noEmit`) | **PASS** (exit 0) |
| Root prototype build | `npm run build` (`tsc -b && vite build`) | **PASS** (exit 0, Vite `6.4.3`, 60 modules, `332.07 kB` JS, `1.96 kB` CSS) |
| Mobile Expo typecheck | `cd mobile && npm run typecheck` (`tsc --noEmit`) | **PASS** (exit 0) |
| Purchase price parser tests | `cd mobile && npm run check:price` | **PASS** (`parsePurchasePrice: 10 cases pass`, exit 0) |
| Expo web export | `cd mobile && npx expo export --platform web` | **PASS** (exit 0, 911 modules bundled) |
| Mobile UI `390×844` captures | Playwright `1.65.0` + headless Chrome | **PASS** (all 9 `docs/proof/phone-*.png` verified `390×844`) |
| Mobile walkthrough recording | Playwright video + FFmpeg `8.1.2` | **PASS** (`rota-mobile-walkthrough.webm`, `.mp4`, `.gif`) |
| Architecture & metrics visuals | Mermaid 11 + Python `matplotlib 3.11.2` | **PASS** (`architecture.png`, `schema.png`, `engineering-metrics.png`) |
| ESLint / Biome | — | Not run (no linter config in repo) |
| Postgres privacy scripts | `supabase/tests/privacy/*.sql` | Not run (no local Postgres / Supabase CLI session in this workspace) |

See [PROOF.md](PROOF.md) for full verbatim logs, exact byte sizes, dimensions of all 18 files in `docs/proof/`, and repository line/SQL counts.
