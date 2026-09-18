# Rota — Politique frais, annulation, retard & dommages (MVP)

> **Statut :** règles **produit / ops verrouillées** (closetops) sous forme de politique draft.  
> **Pas un avis juridique.**  
> Flags **à vérifier avec un avocat** obligatoires sur : langage caution, disclosure des frais, annulation, plafonds de responsabilité dommages, conservation ID.  
> Complète les CGU (`01`) — les montants exacts de commission / grille nettoyage fine restent partiellement **[PLACEHOLDER]**.

---

## 1. Principes généraux

- Tous les paiements passent par **Stripe** (Connect marketplace — hypothèse).
- **Escrow du loyer** à la réservation ; **pas de payout au handover**.
- **Caution** : de préférence **hold / pré-autorisation carte** ; échec du hold = **pas de booking**.
- **Assurance : non incluse / TBD** — aucun transfert de risque assurantiel dans cette politique.
- Preuves centrales : **photos pick-up vs photos retour**.

---

## 2. Grille des frais plateforme

### 2.1 Commission Rota
- Commission sur le **loyer** : **[PLACEHOLDER %]** (ex. X % locataire et/ou Y % prêteur — modèle exact à figer produit).
- Affichage **avant confirmation** du total : loyer + frais service + mention caution/hold.  
  → **Disclosure des frais : à vérifier avec un avocat** (info précontractuelle consommateur).

### 2.2 Frais annexes possibles
| Type | Règle MVP | Note |
|------|-----------|------|
| Frais de service affichés | Inclus dans le total checkout | **[PLACEHOLDER]** détail |
| Frais de paiement Stripe | Absorbe Rota **ou** refacturé — **[PLACEHOLDER]** | Transparence |
| Ship (si activé) | Port payé selon flow **[PLACEHOLDER]** | |
| Nettoyage (claim) | **Forfait** par type de pièce (grille §6) | Pas au réel arbitraire |
| Réparation (claim) | Plafond §6 | |
| Retard | §5 | Cap = caution |

---

## 3. Caution / dépôt — paliers A–D (verrouillé)

> **Qualification juridique « caution / dépôt de garantie / pre-auth » et modalités d’appel : à vérifier avec un avocat.**

### 3.1 Calcul

Soit **R** = loyer (rental fee), **V** = valeur retail estimée déclarée / validée.

| Tier | Retail V | Caution |
|------|----------|---------|
| **A** | V &lt; 150 € | **100 % × R**, avec **minimum 25 €** |
| **B** | 150 € ≤ V ≤ 500 € | **max(150 % × R, 40 % × V)** |
| **C** | 500 € &lt; V ≤ 2 000 € | **60 % × V**, plafonné à **V** (donc ≤ retail) |
| **D** | V &gt; 2 000 € **ou** pièce difficilement remplaçable | **80–100 % × V** + **revue manuelle** obligatoire |

### 3.2 Mécanique
- Préférence : **autorisation de carte (hold)** du montant caution.
- Hold échoué / expiré / refusé → **réservation non créée**.
- Tier **C / D** (ou 1er booking high-value) : **KYC / ID stub** requis avant finalisation.
- Appel de caution (capture partielle/totale) uniquement selon motifs §5–§7 et décision claim.

### 3.3 Libération de la caution
Même déclencheur que le payout loyer (§4), **sauf si claim ouvert** :
- retour OK confirmé, **ou**
- **silent OK**, **ou**
- décision Rota clôturant sans débit.

---

## 4. Escrow & payout prêteur (verrouillé)

1. À la **réservation** : loyer (et frais) **encaissés / escrow** ; caution en **hold**.
2. Au **handover** : **aucun** payout au prêteur.
3. **Release loyer → prêteur** seulement si :
   - retour validé OK, **ou**
   - **silent OK** :
     - **Meet :** 2 heures après confirmation de retour sans claim ;
     - **Ship :** 24 heures après livraison / réception déclarée sans claim ;
   - **ou** décision Rota (litige tranché en faveur d’un payout).
4. Claim ouvert → **gel** payout **et** caution jusqu’à résolution.
5. Identité du compte payout **=** identité du compte Rota (mismatch = blocage / revue).

---

## 5. Annulation

> Barème % exact encore partiellement **[PLACEHOLDER]** — structure à valider produit + **à vérifier avec un avocat** (clauses abusives / droit de rétractation marketplace — **ne pas affirmer l’absence de rétractation sans conseil**).

### 5.1 Annulation par le locataire
- Avant acceptation prêteur : remboursement intégral loyer + frais **[PLACEHOLDER politique frais non remboursables]**.
- Après confirmation, selon délai avant début location :
  - **[PLACEHOLDER]** ex. &gt; 48 h : remboursement X % ;
  - **[PLACEHOLDER]** ex. &lt; 48 h : remboursement Y % ou frais forfaitaires ;
  - No-show locataire : règles assimilables + impact caution selon cas.
- Hold caution : libéré si annulation sans dommages (sous réserve frais Stripe **[PLACEHOLDER]**).

### 5.2 Annulation par le prêteur
- Annulation prêteur après confirmation : remboursement locataire **100 %** loyer + frais service (principe MVP).
- Sanctions prêteur possibles : pénalité **[PLACEHOLDER]**, downgrade ranking, suspension si récidive.
- Pièce indisponible / fausse annonce : traité comme faute prêteur.

### 5.3 Annulation Rota (fraude, sécurité, force majeure)
- Remboursement selon cause ; gel si enquête fraude.

### 5.4 Droit de rétractation
- Location de biens entre particuliers via plateforme : **applicabilité du droit de rétractation 14 jours à vérifier avec un avocat** (exceptions C. conso, qualification du service).  
  → Ne pas écrire « aucun droit de rétractation » sans validation.

---

## 6. Retard de retour (verrouillé)

### 6.1 Grace & échéance
- **Meet :** grâce de **30 minutes** après l’heure de retour convenue.
- **Ship :** la pièce doit être **déposée / expédiée au plus tard à la fin du jour de retour** prévu (pas de grâce 30 min équivalente ; tracking fait foi).

### 6.2 Pénalités de retard (après grace / après fin de jour ship)
- **Jour 1** de retard : **50 % du tarif journalier** (daily rate) de la location.
- **Chaque jour suivant** : **100 % du daily rate** / jour.
- **Plafond :** montant total des pénalités de retard **≤ caution**.
- Calcul daily rate : **[PLACEHOLDER formule]** (ex. loyer ÷ nombre de jours de location, minimum **[PLACEHOLDER]**).

### 6.3 Non-retour — voie « lost-item »
- À compter du **3ᵉ jour** sans retour effectif (après règles ci-dessus) → bascule **lost-item path**.
- Conséquences possibles (ops) :
  - capture caution ;
  - claim jusqu’à la **valeur retail listée** côté locataire selon preuves et décision Rota ;
  - gel / ban si fraude suspectée.
- **Plafonds & opposabilité : à vérifier avec un avocat.**

---

## 7. Dommages, nettoyage, réparation, fraude

### 7.1 Fenêtres de claim (verrouillé)
| Mode | Fenêtre pour ouvrir un claim |
|------|------------------------------|
| **Meet** | **2 heures** à compter de la confirmation de retour |
| **Ship** | **24 heures** à compter de la livraison / réception déclarée |

- Hors délai (silent OK atteint) : claim tardif refusé sauf fraude manifeste / exception Rota documentée.
- Pendant la fenêtre : payout + caution restent disponibles pour gel.

### 7.2 Preuves
- Comparaison **photos pick-up** vs **photos retour** (+ listing).
- Messages in-app, tracking ship, témoignages limités.
- Absence de photos pick-up affaiblit la position de la partie défaillante.

### 7.3 Usure normale vs dommage
- Usure normale : pas de débit.
- Dommage : tache, trou, brûlure, fermeture cassée, déformation, etc.

### 7.4 Nettoyage
- Facturation via **grille forfaitaire par type de pièce** (exemples à figer) :

| Type de pièce (ex.) | Forfait nettoyage **[PLACEHOLDER €]** |
|---------------------|----------------------------------------|
| Top / t-shirt / chemise | **[PLACEHOLDER]** |
| Bas / jupe / pantalon | **[PLACEHOLDER]** |
| Robe / jumpsuit | **[PLACEHOLDER]** |
| Blazer / manteau léger | **[PLACEHOLDER]** |
| Pièce delicate / soie / couture | **[PLACEHOLDER]** |
| Accessoire (sac, ceinture) | **[PLACEHOLDER]** |

- Prélèvement sur caution ou facturation locataire selon décision claim.
- Pas de « pressing au réel » non plafonné sans accord.

### 7.5 Réparation
- Coût de réparation plafonné au **moindre de** :
  1. le montant de **caution**, et  
  2. environ **50 % de la valeur retail V**,  
  **sauf Tier D** (revue manuelle ; traitement spécifique, pouvant s’approcher du retail selon gravité).
- Devis / preuve photo exigés quand possible.
- **Opposabilité des plafonds aux consommateurs : à vérifier avec un avocat.**

### 7.6 Mauvais article / suspect fake / swap
- Dès signalement crédible :
  - **freeze** immédiat **caution + payout** ;
  - **revue fraude** Trust & Safety ;
  - issues possibles : restitution, ban, capture jusqu’à **valeur retail listée** à la charge du locataire (si swap / faux retour), ou sanctions prêteur (si listing contrefait) ;
  - listing contrefaçon prêteur → **ban**.
- Coopération KYC / pièces supplémentaires possible.

### 7.7 Vol / perte sous garde locataire
- Traité via lost-item / claim ; pas d’assurance Rota (**non inclus / TBD**).
- Déclaration police : **[PLACEHOLDER]** si exigée pour certains tiers.

---

## 8. Process litiges & délais

1. Ouverture claim in-app dans la fenêtre §7.1.  
2. Gel automatique fonds concernés.  
3. Chaque partie upload preuves (délai réponse **[PLACEHOLDER]** ex. 48 h).  
4. Décision Rota (ops) selon politique + preuves.  
5. Exécution : release / capture partielle / refund / ban.  
6. Contestation interne : **[PLACEHOLDER]** délai recours interne.  
7. Médiation / voies légales : voir CGU — **à vérifier avec un avocat**.

Délais de traitement cibles ops : **[PLACEHOLDER]** (ex. 5–10 jours ouvrés hors fraude complexe).

---

## 9. Tableaux récapitulatifs

### 9.1 Déclencheurs fonds

| Événement | Loyer (escrow) | Caution (hold) |
|-----------|----------------|----------------|
| Booking OK | Capturé / escrow | Hold OK requis |
| Handover | Pas de payout | Inchangé |
| Retour OK / silent OK | Release → prêteur | Libération hold |
| Claim ouvert | Gel | Gel |
| Décision Rota | Selon décision | Selon décision |
| Retard | — | Peut être capturé (pénalités) |
| Lost-item J+3 | Gel / compensation | Capture possible |

### 9.2 KYC
- Tier C / D ou 1er high-value : ID stub obligatoire.
- Refus / échec : pas de booking.
- **Rétention des pièces ID : à vérifier avec un avocat.**

---

## 10. Exclusions & non-couverture

- **Pas d’assurance** incluse (TBD partenaire futur).
- Dommages corporels / accidents de trajet meetup : hors politique location (responsabilité de droit commun — **à vérifier avec un avocat**).
- Dommages dus à un défaut non visible et non détectable même avec photos : arbitrage Rota au cas par cas.

---

## 11. Modifications

- Rota peut faire évoluer les grilles avec préavis in-app / versioning.  
- Les locations déjà confirmées restent régies par la politique acceptée au checkout (**à vérifier avec un avocat**).

---

## 12. Contact

- Claims / support : **[PLACEHOLDER contact]**  
- Fraude / contrefaçon : **[PLACEHOLDER contact]**

---

*Fin politique frais / annulation / dommages — montants [PLACEHOLDER] à figer ; flags avocat avant publication.*
