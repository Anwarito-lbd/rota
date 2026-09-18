# Rota — Pack juridique MVP (outlines)

**Marque :** Rota  
**Produit :** marketplace peer-to-peer de **location** d’outfits / pièces mode (pas de revente)  
**Géo :** France, Paris-first  
**Paiements :** Stripe (hypothèse Connect marketplace)  
**Audience :** drafts pour Anwar (fondateur) → revue par avocat français  
**Agent :** rotalegal  

---

## ⚠️ AVERTISSEMENT — PAS UN AVIS JURIDIQUE

Ces documents sont des **trames de travail (outlines)** destinées à être développées et validées par un **avocat français**.  
Ils **ne constituent pas** un conseil juridique, des CGU finales, ni une politique de confidentialité opposable.  
Toute formulation marquée **« à vérifier avec un avocat »** ou **« verify with counsel »** doit être confirmée avant publication / lancement App Store.

---

## Index du pack

| Fichier | Contenu |
|---------|---------|
| `01-cgu-outline.md` | Outline CGU / Terms of Use (FR) |
| `02-privacy-outline.md` | Outline Politique de confidentialité RGPD (FR) |
| `03-community-guidelines.md` | Règles communauté & sécurité (FR) |
| `04-fees-cancellation-damage.md` | Frais, annulation, retard, dommages (FR) — **règles produit verrouillées** |
| `05-app-store-privacy-nutrition.md` | Checklist App Store Privacy Nutrition Labels (FR/EN) |
| `06-needs-avocat-review.md` | Liste explicite à faire valider par avocat (FR/EN) |

---

## Décisions produit / ops verrouillées (closetops)

À refléter dans les drafts (ne pas laisser générique là où la règle est décidée) :

1. **Cautions par paliers A–D** (formules retail / loyer) ; hold carte préféré ; échec hold = pas de réservation.  
2. **Escrow** du loyer à la réservation ; **pas de payout au handover** ; release après retour OK / silent OK / décision Rota.  
3. **Fenêtres de claim** : rencontre 2 h / livraison 24 h ; preuves photos prise / retour.  
4. **Nettoyage** : grille forfaitaire par type de pièce. **Réparation** plafonnée (min(caution, ~50 % retail) sauf Tier D).  
5. **Retard** : grâce 30 min (meet) ; ship = fin du jour de retour ; Day1 50 % daily ; puis 100 %/jour ; cap caution ; J+3 → lost-item.  
6. **KYC/ID** stub Tier C/D ou 1er booking high-value ; identité payout = compte.  
7. **Pas de produit d’assurance** pour l’instant → « non inclus / TBD ».  
8. Paiements hors app interdits ; meetups publics ; contrefaçon = ban.

---

## Placeholders restants à confirmer

- `[PLACEHOLDER société]` — raison sociale / SIREN / forme (SAS, etc.)  
- `[PLACEHOLDER contact]` — email légal / support / DPO  
- `[PLACEHOLDER hébergeur]` — hébergeur UE  
- `[PLACEHOLDER KYC provider]` — prestataire identité (Stripe Identity, Onfido, etc.)  
- Grille forfaitaire **nettoyage** détaillée (types de pièces / montants exacts)  
- Politique d’**annulation** montants exacts (si grille % non encore figée)  
- Assurance : toujours **non incluse / TBD** jusqu’à partenaire

---

## Usage recommandé

1. Anwar lit `04` + `01` (cautions / responsabilité / escrow).  
2. Confirme placeholders société / contacts.  
3. Envoie le pack + `06-needs-avocat-review.md` à l’avocat.  
4. Ne publier App Store / Play qu’après revue des points listés dans `06`.
