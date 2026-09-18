# Rota — Points à faire valider par un avocat français AVANT lancement

> **FR/EN** — Explicit counsel checklist.  
> These outlines are **not** final legal advice. Do **not** launch App Store / take real deposits until the items below are confirmed.  
> Ces outlines **ne sont pas** un avis juridique. Ne pas lancer / encaisser de cautions réelles tant que les points ci-dessous ne sont pas validés.

---

## A. Entity & marketplace status / Entité & qualification

| # | Topic | Why it matters | Status |
|---|--------|----------------|--------|
| A1 | **[PLACEHOLDER société]** — forme (SAS…), objet social, SIREN, RCS, capital | Mentions légales CGU / privacy | Open |
| A2 | Qualification **plateforme d’intermédiation** vs loueur / commissionnaire | Responsabilité, TVA, CGU « Rota n’est pas loueur » | **Avocat** |
| A3 | Application **DSA** / LCEN (hébergeur vs contenu) si seuils / rôle | Retrait annonces, signalements | **Avocat** |
| A4 | Statut des prêteurs (particuliers vs pro) — obligations info / facturation | Si sellers pro : règles renforcées | **Avocat** |
| A5 | Assujettissement TVA / régime marketplace | Facturation commission, Stripe tax tools | **Avocat** + expert-comptable |

---

## B. Consumer law / Droit de la consommation

| # | Topic | Why | Status |
|---|--------|-----|--------|
| B1 | **Information précontractuelle** (prix total, frais, identité) | C. conso — **fee disclosure** | **Avocat — flag obligatoire** |
| B2 | **Droit de rétractation** 14 j — applicable ou exception ? | Ne pas affirmer « aucun » sans conseil | **Avocat** |
| B3 | Clauses susceptibles d’être **abusives** (plafonds, sanctions, silent OK) | Nullité partielle CGU | **Avocat** |
| B4 | Médiation de la consommation — médiateur à désigner | Obligation fréquente e-commerce B2C | **Avocat** |
| B5 | Langue / opposabilité CGU clickwrap in-app | Preuve d’acceptation | **Avocat** |

---

## C. Deposit / caution language — FLAG OBLIGATOIRE

| # | Topic | Why | Status |
|---|--------|-----|--------|
| C1 | Qualification : **caution**, dépôt de garantie, **pré-autorisation** carte | Exécution, info client, litiges bancaires | **Avocat — critique** |
| C2 | Opposabilité des **paliers A–D** et formules (100 % loyer / 40–60–80–100 % retail) | Transparence + caractère disproportionné éventuel | **Avocat** |
| C3 | Capture caution pour retard / clean / repair / lost-item | Mandat, consentement, Stripe terms | **Avocat** |
| C4 | Hold échoué = no booking — formulation | | Review ops + avocat |

---

## D. Fees, cancellation, damage caps — FLAGS OBLIGATOIRES

| # | Topic | Why | Status |
|---|--------|-----|--------|
| D1 | **Disclosure des frais** (commission, service fees) avant paiement | Consumer law | **Avocat — flag** |
| D2 | **Politique d’annulation** (barèmes % encore [PLACEHOLDER]) | Clauses pénales / abusives | **Avocat — flag** |
| D3 | **Plafonds responsabilité dommages** (min(caution, ~50 % retail) ; Tier D ; retail listé lost-item / swap) | Opposabilité B2C | **Avocat — flag** |
| D4 | Pénalités retard (50 % puis 100 % daily, cap caution, J+3 lost-item) | Proportionnalité | **Avocat** |
| D5 | Silent OK 2 h / 24 h — forclusion des claims | Validité | **Avocat** |
| D6 | Escrow : pas de payout au handover — conformité / info | | Avocat + Stripe counsel pratique |

---

## E. Insurance / Assurance

| # | Topic | Why | Status |
|---|--------|-----|--------|
| E1 | Affirmer clairement **« assurance non incluse / TBD »** — aucune promesse de couverture | Risque pratique commerciale trompeuse | **Avocat** wording |
| E2 | Si partenaire assurance futur : agrément, distribution, IPID | Réglementation assurance | Future |

---

## F. KYC / AML / ID retention — FLAG OBLIGATOIRE

| # | Topic | Why | Status |
|---|--------|-----|--------|
| F1 | Rota est-elle **assujettie LCB-FT** (AML) pour marketplace + Stripe Connect ? | Obligations KYC/AML | **Avocat** |
| F2 | KYC stub Tier C/D / high-value — base légale RGPD | | **Avocat** |
| F3 | **Durée de conservation des pièces d’identité** | Minimisation RGPD — **flag critique** | **Avocat — flag** |
| F4 | Matching identité payout = compte | Fraude vs discrimination | Avocat + privacy |
| F5 | Contrat DPA avec **[PLACEHOLDER KYC provider]** / Stripe Identity | Art. 28 RGPD | **Avocat** |

---

## G. Privacy / RGPD

| # | Topic | Why | Status |
|---|--------|-----|--------|
| G1 | Registre des traitements + AIPD si KYC / scoring fraude | | DPO / avocat |
| G2 | Bases légales table (`02`) | | **Avocat** |
| G3 | Transferts hors UE (Stripe US, etc.) | SCC / DPF | **Avocat** |
| G4 | Cookies / ATT / analytics SDKs | CNIL | **Avocat** / CNIL practice |
| G5 | Désignation DPO | | **Avocat** |
| G6 | Process breach 72 h | | Internal + avocat |
| G7 | App Store Nutrition Label vs politique | Consistency | Privacy + avocat |

---

## H. CGU enforceability & liability split / Opposabilité CGU

| # | Topic | Why | Status |
|---|--------|-----|--------|
| H1 | Rédaction intégrale CGU (pas seulement outline) | | **Avocat** |
| H2 | Split responsabilité locataire / prêteur / plateforme | | **Avocat** |
| H3 | Licence IP sur photos utilisateurs | | **Avocat** |
| H4 | Suspension / ban — procédure & recours | | **Avocat** |
| H5 | Droit applicable / juridiction + consommateurs UE | | **Avocat** |
| H6 | Contrefaçon — procédure signalement + immunité relative | | **Avocat** |

---

## I. Payments / Stripe Connect

| # | Topic | Why | Status |
|---|--------|-----|--------|
| I1 | Modèle Connect (Express/Custom) adapté marketplace FR | Stripe + avocat | Open |
| I2 | Escrow / delayed payout vs règles Stripe & monnaie électronique | | **Avocat** / Stripe |
| I3 | Interdiction paiements hors app — sanctions proportionnées | | **Avocat** |
| I4 | Refunds, chargebacks, répartition risque | | Ops + avocat |

---

## J. Safety / community / meetings

| # | Topic | Why | Status |
|---|--------|-----|--------|
| J1 | Meetups publics only — duty of care plateforme | | **Avocat** (light) |
| J2 | Guidelines vs CGU hierarchy | | **Avocat** |
| J3 | Harassment / illegal content reporting flows | DSA if applicable | **Avocat** |

---

## K. Product placeholders Anwar must confirm (non-legal but block launch copy)

- [ ] Raison sociale / SIREN / adresse  
- [ ] Emails legal / support / privacy / DPO  
- [ ] Hébergeur UE  
- [ ] KYC provider  
- [ ] **Commission %** exacte (qui paie : renter / lender / split)  
- [ ] Grille **nettoyage** € par type de pièce  
- [ ] Barème **annulation** % par fenêtre  
- [ ] Formule **daily rate** pour retards  
- [ ] Médiateur de la consommation  
- [ ] Assurance : rester **non inclus / TBD** jusqu’à partenaire  
- [ ] Shipping activé ou Paris-meet only au MVP  

---

## L. Recommended counsel pack to send / Dossier à envoyer à l’avocat

1. `00-README.md`  
2. `01` → `04` outlines  
3. `05` App Store checklist  
4. Ce fichier `06`  
5. Screenshots checkout (prix + caution + hold)  
6. Stripe Connect architecture note  
7. Flow KYC Tier C/D  

**Ask counsel for:** redlines on deposit wording, fee disclosure, cancellation, damage caps, ID retention, marketplace qualification, and a go / no-go for MVP launch in France.

---

## M. Explicit “do not publish yet” list

Ne pas publier en l’état sans revue :

1. Langage **caution / dépôt / pre-auth**  
2. **Disclosure frais** checkout  
3. **Annulation** (barèmes + rétractation)  
4. **Plafonds dommages** / lost-item / retail capture  
5. **Conservation ID** KYC  
6. Toute phrase suggérant une **assurance** ou « couverture Rota »  
7. CGU complètes click-accept  

---

*Checklist vivante — mettre à jour après chaque retour avocat.*
