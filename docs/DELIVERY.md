# Delivery — hand-to-hand or Rota Delivery

Product decision (September 2026). Background research:
[research/2026-09-paris-launch-deep-research.md](research/2026-09-paris-launch-deep-research.md).

## The rule

Two choices, nothing else. The member never picks a carrier, an insurance
level or a label. Checkout shows only:

- **Rencontre à Paris — Offert** (default for local Paris rentals)
- **Rota Delivery — X € · Suivi et protégé**

Everything else happens behind Rota.

## Hand-to-hand (default, free)

1. Lender and renter agree a **public meeting point through Rota**. Neither
   home address is ever shown.
2. Before leaving, the lender does a **guided condition check** in the app:
   timestamped photos (front, back, label, any flaw).
3. At the meeting the renter **scans a one-time Rota QR code**. Scanning is
   the official change of custody: both screens show "Pièce remise ✓" with a
   timestamp.
4. Return is the same process reversed (the lender scans the renter's QR),
   then the lender has a short inspection window before the rental closes.

## Rota Delivery (for people who don't want to meet)

1. Rota generates a **prepaid tracked outbound label and a prepaid return
   label** (relay-point network first).
2. The lender drops the garment at the carrier or relay point; both members
   follow tracking inside Rota.
3. The renter returns it through the same network. **The first carrier scan
   counts as proof of on-time return**: the renter is never penalised for a
   carrier delay.
4. **Protection scales automatically with the declared value.** Very
   high-value pieces require stronger insured delivery, or later a Rota
   concierge, instead of ordinary parcel shipping.

## Evidence Rota keeps

Condition photos (both ends), QR confirmation or carrier tracking,
timestamps, and a documented chain of custody. That is what claims are
decided on.

## What is built (feat/social)

| Piece | Status |
|---|---|
| Two options at booking, meet first and free by default | Done: `mobile/src/screens/Booking.tsx`, `state.delivery` defaults to `'meet'` |
| Copy hides the mechanics ("Suivi et protégé", "adresse jamais partagée") | Done |
| Pieces ≥ 1 500 € (approved or declared value) are hand-to-hand only | Done (`HIGH_VALUE_EUR` in Booking.tsx) |
| Handover and return confirmed by code | Exists already (rental screens, migration 004) |
| Condition photos at handover/return | Exists already (`rental-evidence` bucket, claims flow) |
| Lateness waived once the carrier scans the return | **To build**: carrier webhook → `rentals.returned_at` |
| Prepaid labels (outbound + return) | **To build**: carrier API (Mondial Relay / Colissimo / Boxtal); `payments` function creates the label after the charge succeeds |
| Protection tier by value | **To build**: pick the carrier insurance option from `approved_value` server-side |
| Public meeting-point picker | **To build**: curated list of public places per arrondissement, chosen in chat, never a home address |
| QR instead of typed code | **To build**: render the existing handover code as a QR (`react-native-qrcode-svg`) and scan it with `expo-camera` |
| Rota concierge for very high value | Later |
