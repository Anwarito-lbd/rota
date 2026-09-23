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
| Name / Nom | Y | Y | N | Account, KYC name match |
| Email address | Y | Y | N | Login, receipts |
| Phone number | Y | Y | N | Account, meetup coordination |
| Physical address | Maybe | Y | N | Only if shipping address collected |
| Other user contact info | Maybe | Y | N | |

### Location / Localisation

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Precise location | Maybe | Y | N | Only if meetup distance / map; prefer foreground; **consent** |
| Coarse location | Maybe | Y | N | City = Paris default possible without GPS |

### Identifiers

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| User ID | Y | Y | N | Internal account id |
| Device ID | Maybe | Y/Maybe | N* | Crash / anti-fraud; *Tracking = N unless ATT + ads |
| Purchase History | Y | Y | N | Rentals as transactions (not IAP classic, but payment history) |

### Financial Info

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Payment info | Y* | Y | N | *Via Stripe; app may see brand/last4 only |
| Credit info | N | — | — | |
| Other financial | Maybe | Y | N | Payout IBAN via Stripe Connect |

### Photos / audiovisuel

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Photos or videos | Y | Y | N | Listings + pick-up/return claim evidence |
| User content (messages) | Y | Y | N | In-app chat |

### Contacts / carnet d’adresses

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Contacts | N (MVP) | — | — | Do not request unless feature exists |

### Sensitive / Government ID

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Government ID / ID photo | Y (Tier C/D / high-value) | Y | N | KYC stub — **[PLACEHOLDER KYC provider]**; avocat on retention |
| Other sensitive | N | — | — | |

### Usage / diagnostics

| Data type | Collected? | Linked to user? | Tracking? | Notes |
|-----------|------------|-----------------|-----------|-------|
| Product Interaction | Y | Maybe | N* | Funnels; *N if not used for cross-app ads |
| Advertising Data | N (MVP) | — | — | No ads assumed |
| Crash Data | Y | Maybe | N | |
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
| Analytics | Maybe | Product metrics — declare if SDK present |
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

- **Stripe** (payments, Connect, possibly Identity)  
- **[PLACEHOLDER KYC provider]** if not Stripe  
- **[PLACEHOLDER hébergeur / analytics / crash]** (e.g. Sentry, Mixpanel, etc.)  
- Push: APNs / FCM (tokens)

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
