# Rota — Outline Politique de confidentialité (RGPD / France)

> **Statut :** trame de travail — **pas un avis juridique**.  
> **à vérifier avec un avocat** / DPO avant publication.  
> Cadre : **RGPD** (UE) + loi Informatique et Libertés (France).  
> Ne pas présenter ce document comme politique finale opposable.

---

## 1. Responsable de traitement

- Responsable : **[PLACEHOLDER société]** (raison sociale, siège, SIREN).  
- Contact privacy / DPO : **[PLACEHOLDER contact DPO / privacy]**  
  - Si pas de DPO désigné : indiquer le contact privacy et **à vérifier avec un avocat** l’obligation de désignation DPO.
- Hébergeur / sous-traitant technique : **[PLACEHOLDER hébergeur]**.

---

## 2. Données collectées (catégories)

### 2.1 Compte & profil
- Identifiants : email, mot de passe (hash), téléphone.
- Profil : prénom/nom, photo de profil (optionnelle), bio courte, ville (ex. Paris).
- Préférences taille / style (si collectées).

### 2.2 Identité / KYC (stub MVP)
- Déclenché pour **Tier C / D** de caution, ou **premier booking high-value**.
- Données typiques : pièce d’identité (image / scan), selfie de vérification, statut de vérification, scores / résultats du prestataire.
- Prestataire : **[PLACEHOLDER KYC provider]** (ex. Stripe Identity).
- **Conservation des documents d’identité : à vérifier avec un avocat** (durée minimale/maximale, base légale, minimisation, interdiction de conservation excessive).  
  → Flag avocat **obligatoire** avant go-live.

### 2.3 Paiements (Stripe)
- Données transactionnelles : montants, dates, statut escrow / hold / release / refund.
- Identifiants Stripe (customer id, payment method brand/last4, Connect account id).
- Coordonnées payout (IBAN / compte Connect) — souvent chez Stripe.
- Rota **ne stocke pas** le PAN complet ni le CVC.
- **Identité payout** doit matcher le compte (traitement anti-fraude).

### 2.4 Listings & photos
- Photos d’annonces, descriptions, prix, valeur retail déclarée, état, historique de locations.
- Photos **pick-up** et **retour** (preuves claims) — peuvent contenir métadonnées EXIF ; politique de strip EXIF à décider produit.

### 2.5 Géolocalisation
- Si utilisée (ex. suggestions Paris, distance meetup) : précision, moment (foreground only recommandé MVP).
- Base : consentement si non strictement nécessaire au service — **à vérifier avec un avocat**.
- Pas de tracking de localisation en arrière-plan sans nécessité claire + info.

### 2.6 Messages in-app
- Contenu des conversations prêteur ↔ locataire, métadonnées (horodatage), signalements.
- Conservés pour exécution du contrat, sécurité, litiges.

### 2.7 Device / technique / analytics
- Identifiants device, OS, version app, logs crash, adresse IP, logs sécurité.
- Analytics produit (événements anonymisés ou pseudonymisés autant que possible).
- SDKs tiers : lister précisément avant soumission App Store (**[PLACEHOLDER liste SDK]**).

### 2.8 Support & claims
- Tickets support, preuves uploadées (photos dommages), décisions de litige, motifs de suspension.

---

## 3. Finalités & bases légales (RGPD)

> Mapping indicatif — **chaque finalité à valider avec un avocat / DPO**.

| Finalité | Exemples de données | Base légale indicative |
|----------|---------------------|------------------------|
| Création / gestion de compte | compte, contact | Exécution du contrat |
| Mise en relation & location P2P | profil, listings, messages | Exécution du contrat |
| Paiements, escrow, holds, payouts | paiements Stripe | Exécution du contrat ; obligations légales (compta) |
| Calcul / gestion caution (tiers A–D) | retail, loyer, hold | Exécution du contrat |
| KYC high-value / anti-fraude | ID, selfie, matching payout | Intérêt légitime et/ou obligation légale (AML si applicable) — **à vérifier avec un avocat** |
| Claims, dommages, retards | photos, messages, transactions | Exécution du contrat ; intérêt légitime (prévention fraude) |
| Sécurité, prévention abus, bans | logs, signalements | Intérêt légitime |
| Support client | tickets | Exécution du contrat / intérêt légitime |
| Amélioration produit / analytics | device, events | Intérêt légitime **ou** consentement (selon outil) — **à vérifier** |
| Marketing (si email promo) | email | **Consentement** (opt-in) sauf soft opt-in B2C limité — **à vérifier avec un avocat** |
| Obligations légales | facturation, réponses autorités | Obligation légale |
| Cookies / pub / tracking | IDs, ATT | **Consentement** (CNIL / ePrivacy) |

---

## 4. Destinataires

- **Équipe Rota** (support, trust & safety, ops) — accès besoin d’en connaître.
- **Stripe** (paiements, Connect, éventuellement Identity).
- **[PLACEHOLDER KYC provider]** si distinct de Stripe.
- **Hébergeur / cloud** : **[PLACEHOLDER hébergeur]**.
- **Outils support / CRM / analytics** : **[PLACEHOLDER]**.
- Autorités si obligation légale.
- Pas de vente de données personnelles à des brokers.

Sous-traitants : DPA / art. 28 RGPD — **à vérifier avec un avocat**.

---

## 5. Transferts hors UE

- Si Stripe / outils US : clauses types (SCC), mesures complémentaires, éventuel Data Privacy Framework — **à vérifier avec un avocat**.
- Informer clairement dans la politique finale la liste des pays / mécanismes.
- Préférence : hébergement UE pour données cœur.

---

## 6. Durées de conservation

> Durées indicatives MVP — **à calibrer avec avocat / comptable**.

| Catégorie | Durée indicative | Note |
|-----------|------------------|------|
| Compte actif | Durée du compte | |
| Compte fermé | **[PLACEHOLDER]** (ex. 1–3 ans traces) | Minimisation |
| Transactions / compta | **[PLACEHOLDER]** (souvent jusqu’à 10 ans pièces comptables FR) | **à vérifier** |
| Messages / claims | Durée litige + **[PLACEHOLDER]** | |
| Photos pick-up / retour | Durée utile claims + **[PLACEHOLDER]** | |
| **Documents KYC / ID** | **Durée minimale nécessaire** — **à vérifier avec un avocat** (flag critique) | Ne pas sur-conserver |
| Logs sécurité | **[PLACEHOLDER]** (ex. 6–12 mois) | |
| Analytics | selon outil / consentement | |
| Marketing opt-in | jusqu’au retrait | |

---

## 7. Droits des personnes (RGPD)

- Accès, rectification, effacement, limitation, opposition, portabilité (selon base).
- Retrait du consentement (cookies, marketing, géoloc non essentielle).
- Directives post-mortem (FR) — mention possible.
- Réclamation CNIL : https://www.cnil.fr  
- Modalités : email **[PLACEHOLDER contact privacy]** ; délai 1 mois (prolongeable).
- Limites : conservation légale, preuves litiges, abus de droit — **à vérifier avec un avocat**.
- Effacement vs obligations anti-fraude / payouts en cours : expliquer clairement.

---

## 8. Cookies / traceurs

- Bannière / CMP conforme CNIL pour apps web / site.
- App native : SDK tracking, ATT (iOS) si tracking cross-app.
- Renvoi vers une **Politique cookies** dédiée (**[PLACEHOLDER]** à rédiger).
- Distinction : strictement nécessaires vs analytics vs pub.

---

## 9. Mineurs

- Service réservé aux **18+**.
- Pas de collecte volontaire de données de mineurs.
- Si compte mineur détecté : suppression / clôture.
- **à vérifier avec un avocat** toute nuance d’âge numérique.

---

## 10. Sécurité

- Mesures techniques : chiffrement en transit (TLS), contrôle d’accès, journalisation, séparation environnements.
- Breach : notification CNIL / personnes si risque — process interne **[PLACEHOLDER]** ; délais légaux **à vérifier avec un avocat**.

---

## 11. Modifications

- Notification utilisateurs en cas de changement matériel (email / in-app).
- Date de version en tête de politique finale.

---

## 12. Contact

- Privacy / DPO : **[PLACEHOLDER contact]**  
- Adresse postale : **[PLACEHOLDER société / adresse]**

---

*Fin outline privacy — à transformer en politique complète avec registre des traitements.*
