# Rota — App Store path

## Goal
Ship Rota (peer-to-peer outfit rental, Paris-first) on the Apple App Store via **Expo + EAS**.

## Prerequisites
1. Apple Developer Program membership ($99/year) on the founder Apple ID
2. Expo account + `eas-cli`
3. Bundle identifier: `com.rota.app` (confirm before first build)
4. Privacy: rentals, payments (Stripe), location (meetup), camera/photos (listing)

## Build commands (once Expo app exists)
```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
eas submit --platform ios
```

## Screenshots checklist
- Feed with images + one video card
- Listing detail (gallery)
- Booking dates
- Checkout
- Closet / list a piece
- Rentals (renting + lending)

## Do not submit until
- TestFlight build reviewed internally
- Stripe in test mode verified
- French legal pages (CGU, privacy) linked in-app
