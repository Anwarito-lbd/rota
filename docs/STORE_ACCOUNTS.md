# Store accounts and services — step by step

Everything here has to be done by the account holder (you): it needs your
identity, company documents, payment or signatures. Start with Apple and
Google today: approval takes days to weeks.

## 0. Before anything: the company

- A French company (SAS / SASU) with SIREN, registered address and a bank account.
- A **D-U-N-S number** for that company (free, via Apple's lookup tool, ~5 working
  days; Google accepts the same number).
- A website on `therotaapp.com` that can host the legal pages and two small files
  (step 5).

## 1. Apple Developer Program (organisation)

1. Create or use an Apple Account with two-factor authentication, in the company
   owner's name.
2. Enrol as an **Organisation** at developer.apple.com/programs/enroll (99 USD/year),
   with the D-U-N-S number. Expect 2–6 weeks; answer Apple's verification call.
3. When the membership shows **Active**: App Store Connect → Business → accept the
   **Paid Apps Agreement** and every pending attachment, and fill in banking and tax.
4. App Store Connect → Business → **DSA trader status**: declare Rota as a trader
   (address, phone, e-mail are shown on the EU store page). Without it, no EU listing.
5. Certificates, IDs & Profiles → Identifiers → register the App ID **`com.rota.app`**
   with capabilities **Sign in with Apple**, **Associated Domains**, **Push Notifications**.
6. Keys → create a **Sign in with Apple** key (.p8) — needed by Supabase (step 4).
7. Note your **Team ID** (10 characters) — needed for app links (step 5) and EAS.
8. App Store Connect → My Apps → **+** → new app: name **Rota**, primary language
   French, bundle ID `com.rota.app`, SKU `rota-ios`.
9. Fill the app record:
   - **Age rating**: answer the questionnaire; user-generated content and messaging
     → expect **16+** (matches the app's 16+ rule).
   - **Social media / UGC question**: yes (posts, comments, messaging; report and
     block exist; moderation within 24 h).
   - **App Privacy** — see the table in section 6.
   - **Review notes**: see section 7. Provide a working demo account.

## 2. Google Play Console (organisation)

1. play.google.com/console → create a developer account as an **Organisation**
   (25 USD once), with the D-U-N-S number; verify identity and the website.
2. Since 30 September 2026: register the package name **`com.rota.app`** under
   *Android developer verification* before distributing any build.
3. Create the app: name Rota, default language French, App (not game), Free.
4. App content: privacy policy URL, **Data safety** (section 6), **content rating**
   (IARC questionnaire: user interaction, shares location approximately, no
   gambling), target audience 16+, ads: none.
5. A new personal account needs 12 testers for 14 days; an organisation account
   does not, but run a closed test anyway.

## 3. Expo / EAS

1. Create an Expo account (expo.dev) — ideally an organisation "rota".
2. Then follow [BUILD.md](BUILD.md).

## 4. Backend services

**Supabase (production project)**
1. Apply `supabase/migrations/001…011` in order (or `supabase db push`).
2. Deploy the functions: `supabase functions deploy payments stripe-webhook worker account moderate-listings tryon-token`.
3. Secrets (Dashboard → Edge Functions → Secrets): `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `ROTA_CRON_SECRET`,
   `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `DECART_API_KEY`.
4. Authentication → Providers:
   - **Apple**: enable; Client IDs = `com.rota.app` (native sign-in); for web add a
     Services ID; paste the Team ID, Key ID and the .p8 key from step 1.6.
   - **Google**: create an OAuth client in Google Cloud Console (Web application),
     authorised redirect URI = `https://<project>.supabase.co/auth/v1/callback`;
     paste client ID and secret into Supabase.
   - URL Configuration → Redirect URLs: add `rota://auth-callback` (and
     `exp://**` while testing in Expo Go).
5. Make yourself staff: insert your user id into `staff_members` (see
   `docs/BACKEND_SETUP.md`) so the Admin → Social queue is visible.

**Stripe**: activate the account (company, bank, representative); create live keys;
turn on Connect (Express) and Identity; add the two webhooks from BACKEND_SETUP.

**Decart**: create an account at platform.decart.ai, create an API key, put it only
in the Supabase secret `DECART_API_KEY` (never in the app).

## 5. App links (therotaapp.com)

Host these two files (content type `application/json`, no redirect):

`https://therotaapp.com/.well-known/apple-app-site-association`
```json
{ "applinks": { "details": [ { "appIDs": ["<TEAM_ID>.com.rota.app"], "components": [ { "/": "/p/*" }, { "/": "/u/*" } ] } ] } }
```

`https://therotaapp.com/.well-known/assetlinks.json`
```json
[ { "relation": ["delegate_permission/common.handle_all_urls"],
    "target": { "namespace": "android_app", "package_name": "com.rota.app",
                "sha256_cert_fingerprints": ["<SHA-256 of the Play app signing key>"] } } ]
```
The SHA-256 is in Play Console → Setup → App signing, after the first upload.

## 6. Privacy declarations (must match the app exactly)

| Data | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Name, e-mail, username | Yes | Yes | No | Account, app functionality |
| Photos (listings, posts, avatar) | Yes | Yes | No | App functionality (user content) |
| Messages, comments | Yes | Yes | No | App functionality |
| Approximate location | Yes (optional) | Yes | No | App functionality (near me) |
| Payment info | Handled by Stripe, not stored by Rota | — | No | Purchases |
| Identity document + selfie | Collected by Stripe Identity; Rota stores only the result | Yes | No | Fraud prevention, security |
| Camera image for AI try-on | Sent to Decart for that request only, not stored | No | No | App functionality |
| Crash / diagnostics | No (no analytics SDK in the app) | — | — | — |

Google Data safety: same rows; data is encrypted in transit; users can request
deletion (in-app, immediate); no data is sold; no data shared for advertising.

## 7. App Review notes (paste into App Store Connect)

```
Rota is a peer-to-peer clothing rental marketplace in Paris. Rentals are physical
goods used outside the app, paid with Stripe (Guideline 3.1.5(a)); there are no
digital goods or subscriptions.

Demo account: <email> / <password> (identity already verified, has one listing,
two conversations and a pending rental).

User-generated content (1.2): posts, comments, messages and profiles can be
reported (… menu / long-press) and members can be blocked; three reports hide
content until review; staff review reports in the back office within 24 hours;
rules are in Dressing → Règles de la communauté.

Account deletion (5.1.1(v)): Dressing → Réglages → Supprimer mon compte.

AI try-on: optional, asks for consent naming the provider (Decart) before any
image is sent; results are labelled as AI-generated; nothing is stored.

Location is approximate (~500 m) and only used when the member enables it.
```
