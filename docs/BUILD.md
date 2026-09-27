# Building Rota for the stores (EAS)

Work from a folder **outside OneDrive** (OneDrive breaks Metro with
`EINVAL: readlink`). Node 22+.

## One-time setup

```bash
cd mobile
npm install
npm i -g eas-cli
eas login                 # your Expo account
eas init                  # creates the EAS project and writes its id into app.json
```

Public keys the app reads at build time (EAS Environment Variables, not `.env`):

```bash
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<project>.supabase.co --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_KEY --value sb_publishable_... --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_live_... --visibility plaintext
```

Repeat with `--environment preview` using the test project and `pk_test_…`.
Never put a secret key (`sk_…`, `service_role`, Decart) in the app.

## Test builds (install on your phone)

```bash
eas build --platform ios --profile preview        # ad-hoc build; register your iPhone when asked
eas build --platform android --profile preview    # .apk you can install directly
```

Expo Go is for quick UI checks only; payments (Stripe sheet), Sign in with Apple and
maps behave like the store only in these builds.

## Store builds

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios       # uploads to App Store Connect → TestFlight
eas submit --platform android   # uploads to Play Console (internal testing first)
```

`eas submit` asks for your Apple ID / App Store Connect API key the first time; the
Play upload needs a Google service-account JSON (Play Console → Setup → API access).

## Before submitting

1. Run the compliance guard (see `docs/LAUNCH_PLAN.md`, "How to audit") on a prebuilt
   project; fix any real critical finding.
2. TestFlight: sign up with e-mail, Apple and Google; post a fit; message someone;
   rent a piece with a test card; report and block; delete the account.
3. Screenshots: 6.9" iPhone (1320 × 2868) for the App Store, phone screenshots for Play.
   The screens in `design/social-screens/` show what to capture.
4. Paste the review notes from `docs/STORE_ACCOUNTS.md` §7 and provide the demo account.
