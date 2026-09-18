# Rota — Outline CGU / Conditions Générales d’Utilisation (MVP)

> **Statut :** trame de travail — **pas un avis juridique**.  
> **À vérifier avec un avocat** avant publication.  
> **Droit applicable cible :** France / UE.  
> **Produit :** location P2P d’outfits / pièces mode (pas de revente).  
> **Paiements :** Stripe Connect (hypothèse marketplace).

---

## 0. Préambule & objet

- Rota est une **plateforme numérique d’intermédiation** mettant en relation des **prêteurs** (owners / lenders) et des **locataires** (renters) pour la **location temporaire** de vêtements / outfits.
- Rota **n’est pas le loueur** des pièces : le contrat de location se forme **entre utilisateurs** via la plateforme.  
  → **à vérifier avec un avocat** (qualification marketplace / intermédiaire / éventuelle requalification).
- Objet des CGU : conditions d’accès et d’usage de l’app / site Rota, règles de location, paiements, responsabilités, sanctions.
- Acceptation : création de compte et/ou première réservation = acceptation des CGU + Politique de confidentialité + Guidelines communauté + Politique frais/annulation/dommages.

---

## 1. Mentions légales / éditeur

- Éditeur : **[PLACEHOLDER société]** (forme, capital, siège, SIREN, RCS).  
- Directeur de publication : **[PLACEHOLDER]**.  
- Hébergeur : **[PLACEHOLDER hébergeur]** (UE préféré).  
- Contact : **[PLACEHOLDER contact]** (ex. legal@rota… / support@rota…).  
- TVA / facturation : **à vérifier avec un avocat** (obligations plateforme, factures Stripe, status auto-entrepreneur prêteurs).

---

## 2. Rôle de Rota (plateforme d’intermédiation, pas loueur)

- Rota fournit : annonces, messagerie in-app, matching, escrow / holds via Stripe, outils de claim, support.
- Rota **ne garantit pas** l’état réel d’une pièce hors processus photos / claims décrits.
- Rota **n’est pas partie** au contrat de location P2P (sauf dispositions impératives — **à vérifier avec un avocat**).
- Rota peut intervenir pour : gel de fonds, décisions de litige selon politique interne, suspension de comptes.
- **Assurance :** aucun produit d’assurance n’est inclus pour l’instant (**non inclus / TBD**). Ne pas présenter Rota comme assureur.  
  → **à vérifier avec un avocat** toute formulation « couverture » / « protection ».

---

## 3. Comptes, éligibilité, âge

- Compte personnel obligatoire pour louer ou prêter.
- **Âge minimum :** 18 ans (majorité). Compte mineur = interdit.  
  → **à vérifier avec un avocat** (éventuel 16–18 avec tutelle — non prévu MVP).
- Un compte = une personne physique (ou statut pro déclaré — **[PLACEHOLDER]** si sellers pro autorisés).
- Exactitude des infos : nom, email, téléphone, IBAN / payout Stripe.
- **Identité payout** doit correspondre au titulaire du compte (anti-fraude).
- **KYC / vérification d’identité (stub MVP) :**
  - Obligatoire (ou fortement requis) pour **Tier C / D** de caution, ou pour le **premier booking high-value**.
  - Prestataire : **[PLACEHOLDER KYC provider]** (ex. Stripe Identity).
  - Échec / refus KYC = impossible de finaliser la réservation concernée.
  - Conservation des pièces d’identité : **à vérifier avec un avocat** (durée, base légale, minimisation).
- Interdiction : multi-comptes frauduleux, usurpation, comptes partagés pour contourner sanctions.

---

## 4. Annonces / listings (prêteur)

- Le prêteur garantit être **propriétaire** ou disposer des droits pour louer la pièce.
- Contenu requis : photos claires (plusieurs angles), description, taille/marque, **état** (neuf / très bon / bon / défauts visibles), prix de location, **valeur retail estimée** (pour calcul caution — voir §7 et doc `04`).
- Photos honnêtes : pas de filtres trompeurs ; défauts visibles doivent être mentionnés.
- **Interdiction de contrefaçon / faux** : listing d’articles contrefaits = **ban** (voir Guidelines). Signalement possible.
- Rota peut retirer une annonce (suspecte, illicite, non conforme).
- Le prêteur reste responsable du contenu de son annonce (IP tiers, marques, droits à l’image).

---

## 5. Location P2P — période, remise, retour

### 5.1 Formation de la location
- Demande de réservation → acceptation prêteur (ou instant book si activé) → **paiement / hold** validés → confirmation.
- Sans hold caution réussi = **pas de réservation**.

### 5.2 Remise (handover)
- Modes MVP : **rencontre en personne** (Paris-first) et/ou **envoi** (ship) si activé.
- **Rencontres : lieux publics uniquement** (cafés, halls, points de rencontre visibles). Pas de domicile privé imposé.
- Remise : photos de **prise en charge (pick-up)** encouragées / requises selon flow produit.
- **Le payout noyer n’est PAS déclenché au handover** (voir §7).

### 5.3 Période de location
- Dates/heures convenues in-app ; fin = date/heure de retour prévue.

### 5.4 Retour
- Retour : même mode (meet / ship) selon réservation.
- Photos de **retour** requises pour le process claims.
- **Silent OK :**
  - Meet : absence de claim dans les **2 heures** après confirmation de retour → retour considéré OK.
  - Ship : absence de claim dans les **24 heures** après livraison / réception déclarée → retour considéré OK.
- Après silent OK (ou validation manuelle), déclenchement possible du **release** loyer + restitution hold caution (sauf claim ouvert).

---

## 6. Interdiction des paiements hors app

- **Strictement interdit** : espèces, virement direct, PayPal/Venmo hors Stripe Rota, « arrangements » pour contourner la commission.
- Motifs : protection utilisateurs, escrow, traçabilité, lutte fraude, conformité marketplace.
- Contournement = suspension / ban + annulation éventuelle des protections Rota sur le litige.
- Toute demande d’un autre utilisateur de payer hors app doit être **signalée**.

---

## 7. Prix, commission, Stripe, escrow, caution

### 7.1 Prix
- Prix de location fixé par le prêteur (dans limites éventuelles produit).
- Affichage TTC / frais : **à vérifier avec un avocat** (info précontractuelle consommateur, art. L.111-1 et s. C. conso — **ne pas inventer le texte**).

### 7.2 Commission plateforme
- Rota prélève une **commission** sur la location (**[PLACEHOLDER %]** à confirmer produit).
- Grille détaillée : voir `04-fees-cancellation-damage.md`.
- **Disclosure des frais** : **à vérifier avec un avocat** (clarté affichage avant paiement).

### 7.3 Stripe
- Paiements traités par Stripe ; Rota utilise (hypothèse) **Stripe Connect**.
- Rota ne stocke pas les numéros de carte complets.
- Conditions Stripe s’appliquent en plus des CGU.

### 7.4 Escrow du loyer (règle produit verrouillée)
- Le **montant de location** (rental fee) est **encaissé / mis en escrow à la réservation**.
- **Non versé au prêteur au moment de la remise (handover).**
- **Release au prêteur uniquement après :**
  1. retour validé OK, **ou**
  2. **silent OK** (meet 2 h / ship 24 h), **ou**
  3. **décision Rota** sur litige.
- Si claim ouvert : payout et/ou caution restent gelés jusqu’à résolution.

### 7.5 Caution / dépôt (règle produit verrouillée — paliers)

> **Langage « caution / dépôt de garantie / autorisation de pré-autorisation » : à vérifier avec un avocat** (qualification civile, exécution, plafond, info consommateur).

Préférence produit : **autorisation / hold carte** (pre-auth). Échec du hold = **réservation impossible**.

| Tier | Valeur retail estimée | Calcul caution |
|------|------------------------|----------------|
| **A** | &lt; 150 € | 100 % du loyer, **minimum 25 €** |
| **B** | 150–500 € | **max**(150 % du loyer, 40 % du retail) |
| **C** | 500–2 000 € | **60 % du retail**, plafonné au retail |
| **D** | &gt; 2 000 € / remplacement difficile | **80–100 % du retail** + **revue manuelle** |

- Restitution du hold / caution : même déclencheur que le payout (retour OK / silent OK / décision Rota), **sauf claim ouvert**.
- Utilisation de la caution : retards, dommages, nettoyage forfaitaire, fraude / swap — selon `04`.
- **Plafonds de responsabilité dommages** : **à vérifier avec un avocat**.

### 7.6 Assurance
- **Non incluse / TBD.** Aucune police Rota n’est fournie au MVP.
- Les utilisateurs restent responsables selon le split §8 et la politique `04`.

---

## 8. Responsabilité — locataire vs prêteur vs plateforme (split)

> Split opérationnel MVP — **qualification juridique et plafonds : à vérifier avec un avocat**.

### 8.1 Locataire (renter)
- Utilise la pièce avec soin ; respect période et modalités de retour.
- Responsable des **dommages** au-delà de l’usure normale, **taches**, **perte**, **vol** sous sa garde, **retard**.
- Fournit photos pick-up / retour fidèles.
- Ne sous-loue pas, ne revend pas, ne modifie pas la pièce sans accord.

### 8.2 Prêteur (lender)
- Décrit honnêtement état et authenticité.
- Remet la pièce annoncée (bon article, taille, état).
- Responsable si **mauvais article**, défauts non déclarés majeurs, **contrefaçon**.
- Ne peut pas exiger paiement hors app.

### 8.3 Plateforme Rota
- Fournit outils techniques et process claims / escrow.
- **Obligation de moyens** sur le fonctionnement de la plateforme (sauf manquement prouvé — **à vérifier avec un avocat**).
- Pas responsable des actes des utilisateurs hors cadre légal impératif (ex. responsabilité hébergeur / plateforme — **à vérifier avec un avocat**, LCEN / DSA si applicable).
- Peut décider un litige selon politique `04` lorsque preuves insuffisantes ou conflictuelles.

### 8.4 Plafonds (produit)
- Réparation : plafonnée au **moindre de** (caution ; ~**50 % du retail**), **sauf Tier D** (traitement spécifique / revue).  
  → **à vérifier avec un avocat** (opposabilité des plafonds aux consommateurs).
- Article perdu / non retour J+3 : voie « lost-item » pouvant aller jusqu’à la **valeur retail listée** côté locataire (selon décision Rota + preuves).  
  → **à vérifier avec un avocat**.

---

## 9. Contenu, propriété intellectuelle, photos

- Rota : marque, logo, UI, code — propriété de **[PLACEHOLDER société]** / licenciés.
- Utilisateur conserve ses droits sur photos uploadées ; accorde à Rota une **licence non exclusive** mondiale pour héberger, afficher, modérer, promouvoir le listing (durée du compte + archives raisonnables).  
  → rédaction licence : **à vérifier avec un avocat**.
- Interdit : contenu illicite, diffamatoire, pornographique, haineux, contrefaisant.
- Photos d’autres personnes : consentement requis.

---

## 10. Suspension / résiliation

- Rota peut suspendre / résilier : fraude, contrefaçon, paiements hors app, harcèlement, multi-claims abusifs, KYC falsifié, non-respect CGU / Guidelines.
- Utilisateur peut fermer son compte : conditions payouts en cours, claims ouverts.
- Survie des clauses : IP, responsabilité limitée, droit applicable, litiges en cours.

---

## 11. Médiation / litiges consommateurs (stub)

- Process interne claims (voir `04`) en premier.
- Médiation de la consommation : **[PLACEHOLDER médiateur]** — **à vérifier avec un avocat** (obligation plateformes / e-commerce B2C).
- Ne pas écarter les droits impératifs du consommateur.

---

## 12. Droit applicable / juridiction

- Droit français.
- Juridiction : tribunaux français compétents ; pour consommateurs, règles protectrices de compétence / loi applicable **à vérifier avec un avocat** (règlements Bruxelles I bis, Rome I, C. conso).

---

## 13. Contact

- Support : **[PLACEHOLDER contact]**  
- Légal : **[PLACEHOLDER contact]**  
- Signalements sécurité / contrefaçon : via in-app + email **[PLACEHOLDER]**

---

## 14. Annexes (renvois)

- Politique frais / annulation / retard / dommages → `04-fees-cancellation-damage.md`
- Guidelines communauté → `03-community-guidelines.md`
- Confidentialité → `02-privacy-outline.md`

---

*Fin outline CGU — à développer en texte intégral par / avec avocat.*
