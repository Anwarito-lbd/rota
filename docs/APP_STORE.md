# Rota — App Store path

## Goal

Ship Rota (peer-to-peer outfit rental, Paris-first) on the Apple App Store via **Expo + EAS**.

## Bundle & identity

| Field | Value |
|-------|--------|
| App name | Rota |
| Bundle identifier | `com.rota.app` |
| Scheme | `rota://` |
| Primary locale | French (France) |
| Category | Shopping / Lifestyle |

## Prerequisites

1. Apple Developer Program membership ($99/year)
2. Expo account + `eas-cli` (`npm i -g eas-cli`)
3. Privacy nutrition labels prepared for:
   - Purchases / payments (Stripe)
   - Location (meetup handover — when in use)
   - Camera / Photos (listing media)
   - Contact info (account email)
4. French legal pages linked in-app before submit: CGU, confidentialité, mentions

## EAS Build (do not submit yet)

Project config lives in `apps/mobile/eas.json` and `apps/mobile/app.json`.

```bash
cd apps/mobile
npm i -g eas-cli
eas login
# Replace placeholder projectId in app.json extra.eas.projectId after `eas init`
eas build:configure
eas build --platform ios --profile preview
# Later:
# eas build --platform ios --profile production
# eas submit --platform ios   # ONLY when ready — not part of this MVP
```

## Screenshots checklist

- Feed with images + one video card
- Listing detail (gallery + video controls)
- Booking dates
- Checkout (Stripe test)
- Closet / list a piece
- Rentals (renting + lending)
- Promote / Founding Closet badge

## TestFlight gate

Do **not** submit to the App Store until:

- [ ] Internal TestFlight build reviewed
- [ ] Stripe test mode verified end-to-end
- [ ] CGU + privacy URLs live
- [ ] Support URL + marketing URL set in App Store Connect

## Privacy copy (draft)

Rota uses account email for authentication, optional location to suggest nearby Paris pieces and public meetup spots, camera/photos only when you add listing media, and Stripe to process rental payments in-app (no cash).
