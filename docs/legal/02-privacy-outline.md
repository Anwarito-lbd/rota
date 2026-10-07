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
- Identifiants : email et mot de passe (hash), ou connexion Apple / Google (identifiant, e-mail, éventuellement relais Apple).
- Profil **public** : nom d’utilisateur (pseudonyme), photo de profil (optionnelle), bio courte, badges ; ville affichée seulement si le membre l’active.
- Rota ne demande **ni nom complet ni numéro de téléphone** pour créer un compte.
- Déclaration « J’ai 18 ans ou plus » à l’inscription, horodatée.
- Préférences taille / style (si collectées).

### 2.1 bis Adresse de livraison (facultative)
- Nom du destinataire, adresse, téléphone (facultatif). C’est le **seul** endroit où Rota collecte un nom complet et un numéro de téléphone.
- Transmise à l’autre membre (le prêteur) **uniquement** pour une location **payée** et **envoyée par colis**, tant qu’elle n’est ni annulée ni clôturée.
- Jamais affichée sur le profil.

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
- Achats in-app (Rota Pro, crédits d’essayage) : payés à Apple / Google, relayés à Rota par **RevenueCat** (produit, type d’événement, date, échéance de l’abonnement). L’identifiant RevenueCat est l’identifiant de compte Rota.

### 2.4 Listings & photos
- Photos d’annonces, descriptions, prix, valeur retail déclarée, état, historique de locations.
- Photos **pick-up** et **retour** (preuves claims).
- **Métadonnées photo :** toute photo (annonce, post, story, avatar, photos de remise / retour) est réencodée en JPEG sur le téléphone avant l’envoi ; les métadonnées EXIF (position GPS, date de prise de vue, numéro de série de l’appareil) sont supprimées.
  - Pour la modération des annonces, seuls la marque, le modèle et le logiciel de l’appareil sont envoyés, dans des champs séparés (supprimés à la clôture du compte).
  - Exception : les **preuves d’authenticité** (ticket, étiquette) gardent leurs octets d’origine, donc leurs métadonnées ; elles ne sont lisibles que par le membre et l’équipe Rota.
  - **Risque résiduel :** les **vidéos** gardent leurs métadonnées (dont une éventuelle position GPS) jusqu’à la version de développement de l’app (impossible à nettoyer dans Expo Go). À mentionner dans la politique finale — **à valider par l’avocat**.

### 2.5 Géolocalisation
- Uniquement si le membre l’active : carte « Près de moi », quartier sur un post, ville du profil. Premier plan uniquement, **aucune localisation en arrière-plan**.
- La position est arrondie à environ **1 km** (grille de 0,01°) **sur le téléphone**, puis de nouveau sur le serveur. La position exacte n’est jamais enregistrée par Rota.
- Pour trouver le nom du quartier ou de la ville, le téléphone interroge le service de géocodage du système (Apple ou Google) avec la position exacte. Destinataire à mentionner ou non — **à valider par l’avocat**.
- Base : consentement si non strictement nécessaire au service — **à vérifier avec un avocat**.

### 2.6 Messages in-app
- Contenu des conversations prêteur ↔ locataire, métadonnées (horodatage), signalements.
- Conservés pour exécution du contrat, sécurité, litiges.
- Demandes de message : voir §2.9.

### 2.7 Device / technique
- Jeton push du téléphone (Expo) et préférences de notification.
- Journaux techniques côté serveur (sécurité, erreurs, éventuellement adresse IP) chez l’hébergeur — contenu et durée **à confirmer**.
- **Aucun SDK d’analytics, de crash reporting ni de publicité** dans l’app (dépendances vérifiées en octobre 2026). À revoir à chaque ajout de SDK.

### 2.8 Support & claims
- Tickets support, preuves uploadées (photos dommages), décisions de litige, motifs de suspension.

### 2.9 Contrôles de confidentialité offerts aux membres
- **Tous les profils et toutes les stories sont publics** : profil, posts, stories, highlights et annonces sont visibles par tous les membres. Il n’existe pas de compte privé.
- **Qui peut m’écrire** : « Tout le monde » ou « Personnes que je suis ».
  - « Tout le monde » : le premier message d’une personne que le membre ne suit pas arrive dans **« Demandes »**, sans notification ni accusé de lecture.
  - « Personnes que je suis » : les autres ne peuvent pas commencer de conversation.
  - Dans les deux cas, un message lié à une annonce du membre, une offre ou une location arrive quand même (dans Demandes ou directement).
  - Si le membre **refuse** une demande, les messages suivants de cette personne ne lui sont pas remis, sans que l’expéditeur en soit informé.
- **Sourdine** : masque les posts et / ou les stories d’un compte pour le membre. **Limiter** : les avis du compte limité sur les posts du membre ne sont visibles que par lui, ses messages arrivent dans Demandes. Aucun des deux n’est notifié.
- **Mots masqués** : les nouveaux avis contenant ces mots (et, en option, des insultes courantes) sont masqués. **Masquer le nombre de j’aime** sur ses posts.
- **Aperçu des messages** : retire le texte des messages des notifications push.
- **Corbeille « Récemment supprimé »** : un post ou une story supprimé est restaurable pendant **30 jours**, puis effacé définitivement (lignes et fichiers). Voir §6 pour les exceptions.
- Bloquer et signaler : sur les profils, posts, commentaires et messages.

### 2.10 Export des données (art. 15 / 20)
- Dans l’app : Paramètres de confidentialité › Télécharger une copie de mes données. Fichier JSON produit par le serveur, partagé via la feuille de partage du téléphone, puis **effacé du téléphone**.
- Contenu : compte (e-mail, date de création), profil, adresse, préférences (sans le jeton push), annonces, posts, commentaires et avis, j’aime, republications, stories, highlights, tableaux, abonnements / abonnés, blocages, sourdines, comptes limités, mots masqués, conversations et messages envoyés, offres, favoris, droits et achats in-app, informations professionnelles, locations, réclamations, versements, état du compte de paiement (sans identifiant Stripe), consentements de paiement, signalements, recours, décisions de modération, notifications.
- Les autres membres y figurent par leur nom d’utilisateur, jamais par leur identifiant interne ; un membre bloqué (dans un sens ou dans l’autre) apparaît vide.

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
| Mesure d’audience | **Non utilisée** (aucun SDK d’analytics) | Si ajoutée : consentement probable — **à vérifier** |
| Localisation approximative | position arrondie à ~1 km | Consentement (permission système, activation par le membre) — **à vérifier** |
| Essayage virtuel IA (Decart) | image caméra / photo, photo de la pièce | **Consentement** (écran dédié avant tout envoi) |
| Notifications push (Expo) | jeton push, texte de la notification | Exécution du contrat / consentement (permission système) — **à vérifier** |
| Marketing (si email promo) | email | **Consentement** (opt-in) sauf soft opt-in B2C limité — **à vérifier avec un avocat** |
| Obligations légales | facturation, réponses autorités | Obligation légale |
| Cookies / pub / tracking | IDs, ATT | **Consentement** (CNIL / ePrivacy) |

---

## 4. Destinataires

- **Équipe Rota** (support, trust & safety, ops) — accès besoin d’en connaître.
- **Autres membres** : tout le contenu du profil public (§2.9). L’adresse de livraison (nom, adresse, téléphone) du locataire va au prêteur **uniquement** pour une location payée envoyée par colis.
- **Supabase** : base de données, authentification, stockage, temps réel (région **[PLACEHOLDER]**, à confirmer).
- **Stripe** (Payments, Connect, Identity, Radar) : paiements, versements, vérification d’identité (Rota ne reçoit que le statut), fraude.
- **RevenueCat** (États-Unis) : achats in-app et statut d’abonnement, liés à l’identifiant de compte Rota. Transfert : clauses contractuelles types (CCT).
- **Expo** (États-Unis) : envoi des notifications push. Reçoit le jeton push et le texte de chaque notification (nom d’utilisateur de l’auteur, extrait du message, de l’avis ou de la réponse). Le membre retire le texte des messages avec « Aperçu des messages ». Expo relaie ensuite vers Apple (APNs) / Google (FCM).
- **Decart** (États-Unis) : essayage virtuel. Image caméra ou photo et photo de la pièce, envoyées seulement après l’écran de consentement ; non conservées par Rota.
- **Anthropic** (États-Unis, API Claude) : (1) analyse de modération des annonces (photos, images extraites des vidéos, textes) ; (2) planificateur de tenues Rota Pro, qui ne reçoit que des lignes d’annonces publiques (titre, marque, catégorie, occasion, prix), l’occasion et le budget choisis — aucune donnée de compte.
- **Mux** (États-Unis) : extraction d’images des vidéos d’annonces pour la modération, **uniquement si activé** côté serveur — à confirmer.
- **Resend** : e-mails de compte et rappels.
- **Apple / Google** : connexion (Sign in with Apple / Google), achats in-app, acheminement des notifications, géocodage (§2.5).
- **[PLACEHOLDER KYC provider]** si distinct de Stripe.
- Autorités si obligation légale.
- Pas de vente de données personnelles à des brokers.

Sous-traitants : DPA / art. 28 RGPD — **à vérifier avec un avocat**.

---

## 5. Transferts hors UE

- Prestataires aux États-Unis : Stripe, RevenueCat, Expo, Decart, Anthropic, Resend, Apple / Google, Mux si activé (§4).
- RevenueCat : clauses contractuelles types (CCT / SCC).
- Autres : clauses types (SCC), mesures complémentaires, éventuel Data Privacy Framework — **à vérifier avec un avocat** pour chacun.
- Informer clairement dans la politique finale la liste des pays / mécanismes.
- Préférence : hébergement UE pour données cœur.

---

## 6. Durées de conservation

> Durées indicatives MVP — **à calibrer avec avocat / comptable**.

| Catégorie | Durée indicative | Note |
|-----------|------------------|------|
| Compte actif | Durée du compte | |
| Compte fermé | Voir ci-dessous ; durées **[PLACEHOLDER]** | Minimisation |
| Post / story supprimé | 30 jours dans « Récemment supprimé », puis effacement définitif (lignes et fichiers) | Exceptions ci-dessous |
| Contenu visé par la modération | Conservé tant qu’un signalement ou un recours est ouvert, tant qu’un post attend l’examen, et jusqu’à **6 mois** après la décision de modération ou de recours | Délai de contestation DSA art. 20 — **à valider par l’avocat** |
| Story expirée (hors highlight) | Effacée 30 jours après son expiration (24 h après publication) | |
| Transactions / compta | **[PLACEHOLDER]** (souvent jusqu’à 10 ans pièces comptables FR) | **à vérifier** |
| Messages / claims | Durée litige + **[PLACEHOLDER]** | |
| Photos pick-up / retour | Durée utile claims + **[PLACEHOLDER]** | |
| **Documents KYC / ID** | **Durée minimale nécessaire** — **à vérifier avec un avocat** (flag critique) | Ne pas sur-conserver |
| Logs sécurité | **[PLACEHOLDER]** (ex. 6–12 mois) | |
| Marketing opt-in | jusqu’au retrait | |

**Fermeture du compte (dans l’app).** Refusée tant qu’une location, un versement ou une réclamation est en cours.
- **Supprimé :** profil (nom d’utilisateur remplacé par un pseudonyme `deleted_…`), photo, bio, ville, adresse, préférences et jeton push, posts, commentaires, j’aime, stories, highlights, republications, tableaux, abonnements, blocages, sourdines, comptes limités, mots masqués, favoris, notifications, offres non utilisées, informations professionnelles, droits in-app, métadonnées appareil de modération ; fichiers du membre (avatars, photos et vidéos d’annonces, posts et stories, preuves d’authenticité, images de modération). Les annonces sont retirées et perdent ville, description, photos, vidéo et preuve (titre, marque, catégorie et prix restent). L’e-mail est remplacé, la connexion Apple / Google supprimée, les sessions fermées. Dans les notifications des autres membres, le nom est remplacé et les extraits de messages retirés.
- **Conservé sous pseudonyme**, pour des raisons légales (comptabilité, preuve en cas de litige) : locations, paiements et versements, réclamations et leurs photos de remise / retour, messages échangés (visibles par l’autre membre sous le pseudonyme), offres utilisées, décisions de modération et journal d’audit, historique des achats in-app (sous un identifiant aléatoire).
- Durées de conservation de chaque catégorie : **à valider par l’avocat** / comptable.

---

## 7. Droits des personnes (RGPD)

- Accès, rectification, effacement, limitation, opposition, portabilité (selon base).
- Retrait du consentement (cookies, marketing, géoloc non essentielle).
- Directives post-mortem (FR) — mention possible.
- Réclamation CNIL : https://www.cnil.fr  
- Modalités : email **[PLACEHOLDER contact privacy]** ; délai 1 mois (prolongeable).
- Dans l’app : export JSON (§2.10) et fermeture du compte (§6).
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
