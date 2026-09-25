# Backend setup

Everything the app needs on the server, in order. Each step says where to
click. Nothing here goes in the app's code or in git: keys live in Supabase.

## 1. Database (Supabase → SQL Editor)

Run each file once, in this order. Each one says "Success" when it's done.

| File | What it adds |
|---|---|
| `supabase/schema.sql` | accounts, listings, storage (already done) |
| `supabase/migrations/001_listing_sizes.sql` | several sizes per listing |
| `supabase/migrations/002_trust_protection.sql` | rentals, protection, claims, payouts |
| `supabase/migrations/003_content_moderation.sql` | listing review, reports, appeals |
| `supabase/migrations/004_payments_and_rental_ops.sql` | Stripe, no double booking, reminders |
| `supabase/migrations/005_staff_and_safety.sql` | back office, safety incidents, limits |
| `supabase/migrations/006_schedules.sql` | the automatic jobs — **run after step 5** |

Then make yourself staff (replace the username):

```sql
insert into public.staff_members (user_id)
select id from public.profiles where username = 'your_username';
```

The **Back-office** row then appears in the app under Settings.

## 2. Secrets (Supabase → Edge Functions → Secrets)

| Name | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_test_…` while testing) |
| `STRIPE_WEBHOOK_SECRET` | step 4, first endpoint |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | step 4, second endpoint |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `RESEND_API_KEY` | resend.com → API keys (a new "sending" key) |
| `ROTA_CRON_SECRET` | any long random string (40+ characters) |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | optional — mux.com → Settings → Access tokens (Video: read + write) |

In `mobile/.env` add the **publishable** Stripe key (it's meant to be public):

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 3. Deploy the functions

From the `Rota_app` folder (replace `<ref>`: the code at the start of your Supabase URL):

```bash
npx.cmd supabase login
```

```bash
npx.cmd supabase functions deploy moderate-listings payments stripe-webhook worker --project-ref <ref> --no-verify-jwt
```

`--no-verify-jwt` is intentional: each function checks who is calling itself
(the member's token, Stripe's signature, or the cron secret), and Stripe and
pg_cron don't send Supabase tokens.

## 4. Stripe webhooks (Stripe → Developers → Webhooks → Add endpoint)

Same URL for both: `https://<ref>.supabase.co/functions/v1/stripe-webhook`

1. **Events from your account**: `payment_intent.succeeded`,
   `payment_intent.processing`, `payment_intent.payment_failed`,
   `charge.dispute.created`, `radar.early_fraud_warning.created`,
   `identity.verification_session.verified`,
   `identity.verification_session.requires_input`,
   `identity.verification_session.processing`
   → copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
2. **Events from connected accounts**: `account.updated`
   → copy its signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.

Also in Stripe: finish the Connect platform profile (Connect → Settings) and
accept the responsibility for connected accounts' losses (Rota creates
accounts with `losses: application`), and apply for Identity
(dashboard.stripe.com/identity/application).

## 5. Automatic jobs (Supabase → SQL Editor)

Store the two values the jobs need, then run `006_schedules.sql`:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'rota_functions_url');
select vault.create_secret('<the same value as ROTA_CRON_SECRET>', 'rota_cron_secret');
```

Check they're running: `select * from cron.job;` shows three jobs, and
`select * from cron.job_run_details order by start_time desc limit 10;` shows
their last runs.

## 6. Test with Stripe test mode

Card `4242 4242 4242 4242`, any future date, any CVC. `4000 0027 6000 3184`
asks for 3-D Secure. For a lender's payouts, Stripe's test onboarding accepts
test data (use "Use test data" on each page).

Apple Pay and Google Pay don't work in Expo Go; they appear in the store build.

## Things only you can do

- **Child-abuse hash matching.** Apply to a vendor (Thorn Safer, Microsoft
  PhotoDNA or Cloudflare's CSAM scanning tool). When access is granted, the
  adapter goes in `supabase/functions/moderate-listings/hashcheck.ts`, then:
  `update policy_config set value = 'true' where key = 'moderation_require_hash_check';`
  Until then every review records `hash: not_configured`.
- **Counsel review** of the policy numbers (`select * from policy_config;`)
  and of the consent text before real money.

## What the analyzer costs

Every review stores its token counts. Spend per day, at Claude Opus 5 prices
($5 in / $25 out per million tokens):

```sql
select date_trunc('day', updated_at) as day, count(*) as reviews,
       round(sum((signals#>>'{usage,input_tokens}')::numeric) * 5 / 1e6
           + sum((signals#>>'{usage,output_tokens}')::numeric) * 25 / 1e6, 2) as usd
from public.moderation_cases where signals ? 'usage'
group by 1 order by 1 desc;
```

To try a cheaper model: `update policy_config set value = '"claude-sonnet-5"' where key = 'moderation_model';`
The daily cap (`moderation_daily_review_cap`, 300) stops runaway spend: past
it, listings wait until the next day.
