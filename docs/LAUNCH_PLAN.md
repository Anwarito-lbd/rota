# Launch plan — from the App Store Compliance Playbook

Built on 26 September 2026 from
[mjmirza/app-store-compliance](https://github.com/mjmirza/app-store-compliance)
(`docs/PRE-SUBMISSION-CHECKLIST.md`) and a run of its guard against `mobile/`.
Re-run the guard before every submission (see "How to audit" below). Never
submit while a real critical finding stands.

## 1. Guard results (Android build, `expo prebuild --platform android`)

iOS can't be prebuilt on Windows, so the iOS half must be scanned on a Mac or
after an EAS build.

| Finding | Verdict | Action |
|---|---|---|
| CRITICAL GOOGLE-PLAY-BILLING (Stripe without Play Billing) | **False positive.** Rota sells physical rentals, which are outside Play Billing (Payments policy: physical goods and services). Apple 3.1.5(a) says the same. | State it in the review notes on both stores. |
| GOOGLE-PAYMENTS-DONATION-LINK | False positive: matched text in generated native files; the app has no donation link. | None. |
| ANDROID-R8-OPTIMIZATION-MISSING | False positive: R8 is on through `expo-build-properties` (`android.enableMinifyInReleaseBuilds=true`); the guard only looks for a literal `minifyEnabled true`. | None. |
| ANDROID-INSECURE-BACKUP | **Fixed:** `android.allowBackup: false`. | — |
| ANDROID-OVERLAY-TAPJACKING | **Fixed:** `SYSTEM_ALERT_WINDOW` is in `blockedPermissions` (the manifest now says `tools:node="remove"`; the guard still matches the text). | — |
| BOTH-UNSAFE-DEEPLINK | **Partly fixed:** Universal Links / App Links declared for `therotaapp.com/p/*` and `/u/*` (`associatedDomains`, `intentFilters autoVerify`). | **To do:** host `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on therotaapp.com (Team ID + release SHA-256). |
| GOOGLE-MISSING-PRIVACY-POLICY | False positive: the app links the policy (`LEGAL_URLS.privacy`, `/confidentialite`). | Set the same URL in Play Console and App Store Connect. |
| GOOGLE-DATASAFETY-MISMATCH | Real task. | Fill Data Safety from the data map below. |
| ANDROID-RUNTIME-PERMISSIONS | Handled: every permission is primed and requested at the moment of use, with denial paths (`lib/permissions.ts`, map/list fallback). | Re-check after any new permission. |
| ANDROID-RESTORE-CREDENTIALS (medium) | Real, due April 2027. | Add Credential Manager restore when moving to a dev build. |
| GOOGLE-12-TESTER-RULE (medium) | Real if the Play account is a new personal account. | 12 testers × 14 days of closed testing. |

Also added for iOS: `ITSAppUsesNonExemptEncryption: false` and a privacy
manifest (`ios.privacyManifests`: UserDefaults CA92.1, FileTimestamp C617.1,
SystemBootTime 35F9.1, DiskSpace E174.1).

## 2. Rota-specific rules this build now follows

- **User-generated content (Apple 1.2):** report on every post, comment and
  profile; block works both ways; posts from unverified members wait for
  review; three reports pull a post or hide a comment (migration 009).
  Done in migration 010: the back office has a Social queue (pending
  posts, reported posts / comments / messages / profiles, oldest first,
  audited decisions), and the in-app Community rules screen states the
  rules and the 24 h review commitment. **To do:** the Terms must say the
  same (lawyer review), and staff must actually work the queue daily.
- **AI try-on (Apple 5.1.2(i), EU AI Act art. 50):** a consent screen names
  Decart and the data sent before anything leaves the phone; outputs are
  labelled "Image générée par IA · Decart"; 16+ notice. **To do:** add
  Decart to the privacy policy and the privacy labels as a processor.
- **Location:** approximate only; rounded to ~550 m on the phone and again
  by the database; no address is ever shown.
- **Identity:** Stripe Identity (document + selfie). Rota stores only the
  status. Required to rent and to list; verified members post without review.
- **Age:** 16+ (onboarding). Answer the new age-rating questionnaires as 16+.

## 3. Account and programme readiness (blocks a first launch for weeks)

- [ ] Apple Developer Program **Active** (enrolment is taking 2–6 weeks).
- [ ] Latest Apple Program License Agreement and attachments accepted.
- [ ] Answer the **social media capability** question in App Store Connect
      (Rota now has a feed, follows and comments).
- [ ] **DSA trader status** declared in App Store Connect (required for the EU store).
- [ ] Google Play: package `com.rota.app` registered for Android developer
      verification (from 30 September 2026); content rating done; Data Safety done.
- [ ] Review demo account with a live backend (the #1 rejection cause after
      privacy mismatches), plus review notes covering physical rentals via
      Stripe, UGC moderation, AI try-on and ID verification.
- [ ] If Google or other social sign-in is added, **Sign in with Apple** must ship with it (4.8).

## 4. To go live with the social layer

1. Apply `supabase/migrations/009_social.sql` to the Rota project.
2. Deploy `supabase/functions/tryon-token` and set the secret `DECART_API_KEY`.
3. Host the two `.well-known` files for app links.
4. Build with EAS (`eas build`): `react-native-maps`, `expo-blur` and
   `expo-haptics` are native; Expo Go already includes them.
5. Apply migration 010 (messaging, social moderation queue, delivery switch).
6. Build the rest of [DELIVERY.md](DELIVERY.md) (labels, carrier webhook, QR),
   then set `flag_rota_delivery` to true in `policy_config`.

## How to audit

The playbook is installed at `~/.claude/skills/app-store-compliance/`, with
the guard at `~/.claude/hooks/app-store-compliance-guard.sh`. On Windows,
`python3` must resolve (the guard falls back to built-in parsing otherwise).

```bash
cd mobile && npx expo prebuild --no-install   # native folders are gitignored
bash ~/.claude/hooks/app-store-compliance-guard.sh "$(pwd)"
```

Restore `package.json` scripts afterwards: prebuild rewrites `ios`/`android`
to `expo run:*`.
