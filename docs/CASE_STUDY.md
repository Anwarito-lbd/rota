# Case study

I built Rota as a rental desk for clothes, starting in Paris. Someone lists a piece they own, someone else books dates, they hand it over, and the lender is paid after the piece is back and the claim window has closed. A feed, a follow, or a message is only there to reach that booking.

The repository history runs from 18 September 2026 to 16 October 2026, 140 commits. Most are under Anwarito-lbd. Sixteen are under zined. The decisions below are the ones the code on `main` still enforces, not a launch retrospective. Nothing here is a user count or a revenue figure. I don't have those, and I am not going to invent them.

## The rule I kept repeating

The phone is a client. Postgres decides.

A rental row stores the money the renter agreed to: the daily price, both service fees, cleaning, the total charged, the approved value, and `max_liability`, which the table refuses to store above that approved value. The deposit columns default to off. A hold exists only when a risk decision asks for one. Those rules are checks in `002_trust_protection.sql`, not copy on a checkout screen.

When money has to move, the database inserts a `payment_jobs` row with a kind (`transfer_payout`, `charge_claim`, `refund_rental`, and the hold and late-fee kinds) and an idempotency key. The worker Edge Function picks the job up and calls Stripe. If Stripe has already seen the key, a retry does not charge twice. I wanted a failed cron run to be boring.

Stripe Connect accounts are created for France, with the clothing-rental category, and with Rota carrying fees and negative balances. Identity is Stripe Identity, document plus a matching selfie. Webhooks, not the app, mark a payment succeeded. Two webhook secrets are accepted on the same URL: one for the platform, one for connected accounts.

## Review without handing the model the keys

Listings are queued in `moderation_cases`. The analyzer can be called by the member who just published, or by cron. Either way it only loads cases the database already queued.

The order in the function is deliberate. A hash check against known abuse material runs first, and stays a no-op until a vendor is configured (`hashcheck.ts` records `not_configured`). Then stills, then Claude. The prompt asks for a description: is there a garment, does it look synthetic, is the file a screenshot, does the text match the photo. `policy.ts` turns that description into a distribution. Sexual content and a few other harm classes are blocked and, where the policy says so, quarantined out of the public bucket. A listing title cannot talk the model into a pass, because the pass is not the model's to give.

The same split shows up in the outfit planner. The model may only return ids from the listing set we sent. Anything else is dropped. The app is supposed to label that result as generated.

## Try-on without shipping the secret

Decart stays server-side. `tryon-token` checks that the member is signed in and not suspended, asks `tryon_token_allowed` (migration 036) whether this call is inside the credit, the hourly budget and the daily ceiling, and only then mints a client token. The token lasts 10 minutes, names two models (`lucy-vton-3.5` for a live session, `lucy-image-2` for a still), and caps a live session at 3 minutes. A loop against the function is a database refusal, not an API bill.

## What I treated as product, not as a network

I stripped private accounts back out. Migration 029 had grown follow requests and a private flag. Migration 034 locks `is_private` to false. Stories and profiles are public so a piece can be found. What I kept from that pass is the safety set: block, mute, restrict, message requests, a 30-day bin, export, and account closure. The privacy scripts under `supabase/tests/privacy/` are how those rules are specified. They are SQL you paste into a database that already has the migrations. They are not a green CI badge. On 13 November 2026 I typechecked both TypeScript projects and ran the ten `parsePurchasePrice` assertions. I did not execute the SQL scripts: this environment has no Postgres.

Location on a post is coarsened to a grid of about 550 metres before insert. The exact point the phone saw is not what the table stores.

## What I would not put on a store page yet

The Vite prototype is the design reference, and it had drifted. Its welcome line said 16+, and the side panel said every rental was insured. The app, the legal drafts, and migration 029 say 18+, and the legal drafts say there is no insurance product. I corrected those two strings and re-rendered the prototype. I left the prototype's checkout chips alone, and labeled the captures as sample data, because PayPal and an in-app balance are not what `payments` charges.

Shipping is built as a value on the rental and then refused while `flag_rota_delivery` is false. I would rather show a meeting in Paris than a label I cannot track.

Counsel still has to read the policy numbers and the consent text. The hash-matching vendor is not connected. Those are written down in `docs/BACKEND_SETUP.md` and `docs/legal/`, and they are still open.

## Proof, not a slide

The captures in `docs/proof/` are Chrome screenshots of the production Vite build on 13 November 2026. The commands and the bundle size they printed are in `docs/PROOF.md`. If a number is not in that file or in the SQL, it is not a result I measured.
