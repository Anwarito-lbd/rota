# Rota — App Store Privacy Nutrition Label checklist (MVP)

> **FR/EN** — working draft for App Store Connect “Privacy Nutrition Labels” / Play Data safety.  
> **Not legal advice.** Align with final privacy policy (`02`) and actual SDK list before submission.  
> Update when product adds analytics, ads, or background location.

---

## 1. How to use / Mode d’emploi

1. Inventory every SDK and first-party collection in the build.  
2. For each data type below: mark **Collected?** / **Linked to Identity?** / **Used for Tracking?** (Apple definitions).  
3. “Tracking” = linking with third-party data for ads across apps/sites, or sharing with data brokers — **likely NO for MVP if no ad network**.  
4. Re-audit after any SDK change.

---

## 2. Likely Rota data types (fashion P2P rental app)

Legend: **Y** = expected MVP · **Maybe** = depends on build · **N** = not expected MVP · **TBD** = confirm

### Contact Info / Coordonnées

| Data type | Collected? | Linked to user? | Tracking? | Notes / Notes |
|-----------|------------|-----------------|-----------|---------------|
| Name / Nom | Y | Y | N | Recipient name of the optional delivery address (no full name on the account); the Google name stored by auth on Google sign-in (Apple: e-mail only); ID check by Stripe Identity |
| Email address | Y | Y | N | Login, receipts |
| Phone number | Maybe | Y | N | Only inside the optional delivery address; shared with the owner only for a paid rental sent by parcel |
| Physical address | Y (optional) | Y | N | Delivery address; same sharing rule as the phone number |
| Other user contact info | Maybe | Y | N | |

### Location / Localisation

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Precise location | N (to confirm) | — | — | Read on the phone only, rounded to ~1 km before it leaves the app; the OS geocoder (Apple / Google) sees the exact position — **à valider par l’avocat** |
| Coarse location | Y (opt-in) | Y | N | ~1 km grid for « Près de moi » and the area on a post; city on the profile only if shown |

### Identifiers

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| User ID | Y | Y | N | Internal account id |
| Device ID | Maybe | Y/Maybe | N* | Device data collected by the Stripe React Native SDK (fraud signals) — **à vérifier** against Stripe’s own disclosure; *Tracking = N unless ATT + ads |
| Purchase History | Y | Y | N | Rentals as transactions (payment history), plus in-app purchases (Rota Pro, try-on credits) once enabled |

### Financial Info

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Payment info | Y* | Y | N | *Via Stripe; app may see brand/last4 only |
| Credit info | N | — | — | |
| Other financial | Maybe | Y | N | Payout IBAN via Stripe Connect |

### Photos / audiovisuel

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Photos or videos | Y | Y | N | Listings, posts, stories, avatars, pick-up/return claim evidence, authenticity proofs; try-on images sent to Decart (after consent, not stored by Rota) |
| User content (messages) | Y | Y | N | In-app chat |

### Contacts / carnet d’adresses

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Contacts | N (MVP) | — | — | Do not request unless feature exists |

### Sensitive / Government ID

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Government ID / ID photo | Y (via Stripe) | Y | N | Stripe Identity hosted flow (ID + selfie handled by Stripe); Rota receives only the status — declare per Apple’s guidance for third-party SDK collection, **à vérifier**; avocat on retention |
| Other sensitive | N | — | — | |

### Usage / diagnostics

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Product Interaction | N | — | — | No analytics SDK in the app (checked October 2026) |
| Advertising Data | N (MVP) | — | — | No ads assumed |
| Crash Data | N | — | — | No crash-reporting SDK in the app (checked October 2026) |
| Performance Data | Maybe | Maybe | N | |
| Other Diagnostic | Maybe | Maybe | N | |

### Search / browsing history

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Search History | Maybe | Y | N | In-app garment search |
| Browsing History | Maybe | Y | N | Listing views — first party only |

---

## 3. Purposes (Apple purpose buckets) — mapping MVP

| Purpose | Used? | Examples |
|---------|-------|----------|
| App Functionality | Y | Account, listings, chat, Stripe holds/escrow, claims, KYC |
| Analytics | N | No analytics SDK; declare if one is added |
| Product Personalization | Maybe | Size/style recommendations |
| Developer Advertising | N (MVP) | |
| Third-Party Advertising | N (MVP) | |
| Other Purposes | Maybe | Fraud prevention / Trust & Safety (often under App Functionality) |

---

## 4. Tracking & ATT (iOS)

- MVP **without** ad networks / cross-app tracking → declare **Data Not Used to Track You** for listed types, and **no ATT prompt** unless a partner requires it.
- If later adding Meta/Google ads or sharing device IDs with ad partners → revisit Tracking = Y + ATT.
- **à vérifier avec un avocat** / privacy counsel before enabling ATT-triggering SDKs.

---

## 5. Third parties to list in privacy questionnaire

- **Stripe** (payments, Connect, Identity, Radar)  
- **Supabase** (database, auth, storage)  
- **RevenueCat** (in-app purchases and subscription status, once enabled; US, SCCs — **à valider par l’avocat**)  
- **Expo** (push: token and notification text; message text can be turned off with « Aperçu des messages »), then APNs / FCM  
- **Decart** (AI try-on, after the consent screen), **Anthropic** (listing moderation, Rota Pro outfit planner), **Resend** (e-mails), **Mux** (only if enabled)  
- No analytics or crash-reporting SDK

Each must match the Nutrition Label + Privacy Policy (`02`).

---

## 6. Google Play Data safety (mirror)

- Same inventory; mark collection, sharing, “ephemeral”, encryption in transit, deletion request flow.  
- Deletion: in-app or **[PLACEHOLDER privacy contact]** — wire to RGPD erasure process.

---

## 7. Pre-submit checklist

- [ ] SDK list frozen for the build  
- [ ] No undeclared precise location  
- [ ] KYC photo flow declared as Government ID / photos as applicable  
- [ ] Chat + listing photos declared as User Content / Photos  
- [ ] Stripe: Payment Info collected (linked)  
- [ ] Tracking = No unless ads live  
- [ ] Privacy Policy URL live & consistent  
- [ ] Account deletion path works (Apple requirement)  
- [ ] Avocat/privacy review of label vs `02` (**verify with counsel**)

---

*Update this file every release that changes data practices.*
