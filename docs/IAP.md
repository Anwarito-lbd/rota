# Rota Pro and try-on credits — store purchases

Rota Pro (5,99 €/month) and pay-per-try try-on (0,99 €) are digital goods, so
they must be sold through Apple In-App Purchase and Google Play Billing
(App Store Review Guideline 3.1.1, Play Payments policy) — never Stripe.
RevenueCat sits in between and tells our server what was bought.

## What is already done

- **Database (migration 027, applied):** `member_entitlements` (Pro end date,
  try-on credits), `iap_events` (each store event once), `consume_tryon()`
  for the app, `is_pro()` and a daily AI limit for the server.
- **`iap-webhook` Edge Function (deployed):** RevenueCat calls it; it checks
  the shared secret and records the purchase. Nothing on the phone can grant
  Pro or credits.
- **Outfit planner:** Pro only, 30 plans per member per day.
- **App:** reads Pro and credits from the server; spending a try-on credit is
  done by the server. The buy buttons still say "bientôt disponible" until the
  RevenueCat SDK is added (below).

## What you need to do

1. **Store products** (App Store Connect › Monetization, Play Console ›
   Monetize):
   - `rota_pro_monthly` — auto-renewable subscription, 1 month, 5,99 €.
   - `rota_tryon_1` — consumable, 0,99 €.
2. **RevenueCat** (revenuecat.com, free to start):
   - Create a project, add the iOS and Android apps with the store keys.
   - Import both products; make an entitlement `pro` with `rota_pro_monthly`.
   - Integrations › Webhooks › URL
     `https://fxfpadbzdihwzugjwdvh.supabase.co/functions/v1/iap-webhook`,
     Authorization header value: a long random string you choose.
3. **Supabase secret:** Edge Functions › Secrets ›
   `REVENUECAT_WEBHOOK_AUTH` = that same string (Bearer value without "Bearer").
4. **Tell me the RevenueCat public SDK keys** (they start with `appl_` and
   `goog_`; they are public, like the Supabase publishable key). I then add
   `react-native-purchases`, log members in with their Supabase user id
   (`Purchases.logIn(userId)` — the webhook relies on it), and wire the
   Subscribe / Buy buttons.
5. **Build:** store purchases need a development or store build (`eas build`),
   not Expo Go. Test with sandbox (Apple) / license testers (Google).

## Checking it works

- Buy in a sandbox build → RevenueCat shows the event → `iap_events` has a
  row → `member_entitlements.pro_until` is in the future → the app shows Pro.
- Cancel → Pro stays until the end of the period; expiry → Pro ends.
