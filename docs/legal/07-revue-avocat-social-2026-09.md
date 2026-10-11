# Rota — Dossier de revue juridique : couche sociale, messagerie, IA, identité (septembre 2026)

> **À transmettre à l’avocat.** Ce document n’est pas un avis juridique. Il décrit ce que
> l’application fait réellement (code sur `main`, migrations 009 à 011) et propose des
> clauses **à valider ou réécrire**. Il complète `06-needs-avocat-review.md`, qui couvre
> la location, les frais et la caution.
>
> **Mise à jour octobre 2026** (migrations 029 à 034) : comptes tous publics, demandes de
> message, sourdine, limiter, mots masqués, corbeille de 30 jours, 18 ans et plus,
> localisation arrondie à ~1 km, métadonnées photo supprimées, export et fermeture
> complets. Voir §1 bis.

## 1. Ce qui a changé dans le produit

| Fonction | Ce que fait l’app | Données personnelles |
|---|---|---|
| Publications (« fits », « dumps ») | Photos de tenues, légende, défi hebdomadaire, pièces taguées renvoyant vers des annonces | Photos (dont visages), pseudonyme, quartier approximatif (optionnel) |
| Commentaires, likes, abonnements, tableaux | Interactions publiques entre membres ; tableaux privés par défaut | Pseudonyme, contenu des commentaires |
| Messagerie | Conversations 1-à-1, lieux de rencontre choisis dans une liste de lieux publics, avertissement si numéro / e-mail / appli de paiement saisis | Contenu des messages (lu par Rota uniquement sur signalement) |
| « Près de moi » | Carte des publications ; position arrondie à ~1 km (grille de 0,01°) côté téléphone **et** côté serveur, jamais d’adresse | Localisation approximative, uniquement si le membre l’active |
| Essayage virtuel (IA) | Image caméra ou photo envoyée à **Decart** (États-Unis) avec la photo de la pièce ; image/vidéo modifiée renvoyée ; écran de consentement avant tout envoi ; étiquette « Image générée par IA » | Image du visage et du corps ; non conservée par Rota |
| Vérification d’identité | **Stripe Identity** : pièce d’identité + selfie ; Rota ne reçoit que le statut | Données biométriques traitées par Stripe |
| Connexion Apple / Google | Compte créé à partir de l’e-mail fourni par Apple/Google ; pseudonyme choisi ensuite. Apple : seul l’e-mail est demandé. Google : l’authentification enregistre le nom et la photo du compte Google (pas copiés sur le profil Rota, effacés à la fermeture) | E-mail (éventuellement relais Apple) ; nom et photo Google |
| Modération | Signalement de publications, commentaires, messages, profils ; 3 signalements retirent le contenu en attente d’examen ; examen humain (objectif < 24 h) ; blocage réciproque ; journal d’audit des décisions | Signalements, notes, décisions |
| Suppression de compte | Dans l’app, immédiate (refusée tant qu’une location, un versement ou une réclamation est en cours) ; voir §1 bis pour ce qui est supprimé et ce qui est conservé sous pseudonyme | — |

## 1 bis. Contrôles de confidentialité (octobre 2026)

| Contrôle | Ce que fait l’app |
|---|---|
| Comptes publics | **Tous les profils et toutes les stories sont publics** (pas de compte privé). Profil, posts, stories, highlights et annonces visibles par tous les membres sauf les membres bloqués ; annonces visibles aussi par les non-membres ; fichiers photo accessibles à toute personne qui a le lien. E-mail, adresse et téléphone jamais affichés |
| Qui peut m’écrire | « Tout le monde » ou « Personnes que je suis ». Avec « Tout le monde », le premier message d’une personne non suivie arrive dans **« Demandes »**, sans notification ni accusé de lecture. Avec « Personnes que je suis », les autres ne peuvent pas commencer de conversation. Un message lié à une annonce, une offre ou une location arrive toujours |
| Refus d’une demande | Les messages suivants du demandeur ne sont pas remis, et il n’en est pas informé. Exception : une offre (en attente ou acceptée) ou une location (ni clôturée ni annulée) entre les deux membres rouvre la conversation et les messages sont remis ; citer une annonce sans offre ni location ne suffit pas |
| Sourdine / Limiter | Sourdine : masque les posts et / ou stories d’un compte. Limiter : ses **nouveaux** avis sur mes posts ne sont visibles que par lui, ses **nouvelles** conversations vont dans Demandes (même pour une offre ou une location). Personne n’est notifié |
| Mots masqués, j’aime | Les nouveaux avis contenant les mots choisis sont masqués ; option pour masquer le nombre de j’aime sur ses posts |
| Corbeille | Post ou story supprimé : restaurable 30 jours, puis effacé (lignes et fichiers). Exceptions : conservé tant qu’un signalement ou un recours est ouvert, tant qu’un post attend l’examen, et jusqu’à 6 mois après la décision de modération ou de recours |
| Localisation | Arrondie à ~1 km sur le téléphone puis sur le serveur. Le nom du quartier vient du géocodeur du système (Apple / Google), qui reçoit la position exacte |
| Métadonnées photo | Photos réencodées sur le téléphone avant l’envoi : EXIF (GPS, date, numéro de série) supprimés. Marque, modèle et logiciel de l’appareil envoyés à part pour la modération des annonces. Les preuves d’authenticité gardent leurs métadonnées (lisibles par le membre et l’équipe Rota seulement) |
| **Risque résiduel** | Les **vidéos** gardent leurs métadonnées (dont une éventuelle position GPS) jusqu’à la version de développement de l’app |
| Aperçu des messages | Réglage qui retire le texte des messages des notifications push |
| Export | Fichier JSON : compte, profil, adresse, préférences, contenus, interactions, abonnements, blocages, sourdines, conversations et messages envoyés, offres, locations, réclamations, versements, achats in-app, consentements, signalements, recours, décisions, notifications. Autres membres par pseudonyme (un membre bloqué apparaît vide, sauf dans la liste de blocages) ; ni identifiant Stripe ni jeton push. Lien signé valable 7 jours vers la preuve d’authenticité, dans sa version d’origine (métadonnées comprises). Le fichier est effacé du téléphone au prochain export ou au prochain lancement de l’app. **Absents** : décisions de risque, états des lieux, messages reçus, données de l’identité Google |
| Fermeture | **Supprimé** : profil, photo, bio, ville, adresse, préférences, jeton push, posts, stories, commentaires, j’aime, abonnements, blocages, sourdines, mots masqués, favoris, notifications, fichiers du membre ; annonces retirées et vidées ; e-mail remplacé, connexion Apple / Google supprimée. **Conservé sous pseudonyme** (liste à valider par l’avocat) : locations, paiements et versements, compte de paiement (références Stripe), consentements de paiement, réclamations et photos de remise / retour, états des lieux, vérifications de remise, messages échangés, signalements faits, décisions de risque, restrictions de compte, incidents de sécurité, dossiers de modération, décisions et recours, médias d’annonces en quarantaine, historique des achats in-app (identifiant aléatoire) |

## 2. Questions à trancher (par ordre de priorité)

### A. DSA (Règlement (UE) 2022/2065) — Rota devient une plateforme en ligne

| # | Point | Proposition à valider |
|---|---|---|
| A1 | Qualification : **plateforme en ligne** (hébergement + diffusion au public) ; micro/petite entreprise ? | Si micro/petite entreprise : exemptions des art. 19 et s. à vérifier ; les art. 11-18 restent applicables |
| A2 | **Points de contact** autorités (art. 11) et utilisateurs (art. 12) | `rota_support@therotaapp.com`, affiché dans l’app (Règles de la communauté, Réglages) et les CGU |
| A3 | **Mécanisme de notification** (art. 16) : signalement de contenus illicites, y compris par des non-membres | Dans l’app : oui. À ajouter : formulaire web public pour les non-membres |
| A4 | **Exposé des motifs** (art. 17) à chaque retrait / limitation / suspension | À construire : notification au membre avec motif, base (CGU ou loi), voie de recours. Aujourd’hui : statut visible sur la publication, pas de message motivé |
| A5 | **Réclamation interne** (art. 20) et règlement extrajudiciaire (art. 21) | Recours in-app existe pour les annonces (migration 003) ; à étendre aux publications et suspensions |
| A6 | **Protection des mineurs** (art. 28) | Service réservé aux 18 ans et plus ; pas de profilage publicitaire ; aucune publicité |
| A7 | Statut de **commerçant** dans l’App Store (DSA) et vérification des prêteurs professionnels (art. 30) | À décider : les prêteurs sont-ils tous des particuliers ? Sinon, collecte des informations art. 30 |

### B. RGPD

| # | Point | Proposition à valider |
|---|---|---|
| B1 | Bases légales | Contrat (compte, location, messagerie) ; intérêt légitime (sécurité, modération, lutte contre la fraude) ; **consentement** (localisation, essayage IA) |
| B2 | Photos de personnes dans les publications | L’auteur garantit l’accord des personnes visibles (CGU) ; retrait sur demande |
| B3 | **Essayage IA** : image du visage transmise à Decart (US) | Consentement explicite in-app (fait) ; DPA avec Decart ; transfert : DPF ou CCT ; confirmer la non-conservation par Decart ; ce n’est **pas** une identification biométrique (à confirmer) |
| B4 | **Stripe Identity** : données biométriques (art. 9) | Consentement explicite recueilli par Stripe ; qualification Stripe (sous-traitant / responsable conjoint) à confirmer ; Rota ne stocke que le statut |
| B5 | Messagerie | Pas d’analyse automatique du contenu ; lecture par Rota uniquement du message signalé ; durée de conservation à fixer (proposition : durée du compte + 1 an pour les litiges) |
| B6 | Localisation | Arrondie à ~1 km, jamais stockée précisément, uniquement si activée ; pas de géolocalisation en arrière-plan. Le géocodeur du système (Apple / Google) reçoit la position exacte pour nommer le quartier : à mentionner ? |
| B7 | Âge | 18 ans et plus : case « J’ai 18 ans ou plus » à l’inscription (e-mail, Apple, Google), horodatée — mécanisme de vérification d’âge à discuter |
| B10 | Métadonnées des vidéos | Risque résiduel : les vidéos gardent leurs métadonnées (dont GPS) jusqu’à la version de développement. Information suffisante dans la politique, ou blocage des vidéos d’ici là ? |
| B11 | Conservation | Contenus supprimés : 30 jours, puis 6 mois après une décision de modération ou de recours ; données conservées sous pseudonyme après fermeture (locations, paiements, réclamations, messages, achats in-app) : durées et base légale à fixer |
| B12 | Demandes refusées | Les messages d’un demandeur refusé sont conservés mais jamais remis, sans l’en informer, sauf si une offre ou une location en cours rouvre la conversation : conservation et information à valider |
| B13 | Export incomplet | L’export ne contient pas encore les décisions de risque, les états des lieux, les messages reçus ni les données de l’identité Google (nom, photo) : faut-il les ajouter (art. 15 / 20) ? |
| B14 | Lien vers la preuve d’authenticité | L’export contient un lien signé valable 7 jours vers la preuve d’origine (métadonnées comprises) : durée et information à valider |
| B8 | Sous-traitants | Voir §3 ; mettre à jour la politique de confidentialité et le registre des traitements |
| B9 | AIPD (analyse d’impact) | Probablement requise : biométrie (Stripe), IA sur images, données de localisation, à grande échelle à terme |

### C. IA Act (Règlement (UE) 2024/1689)

| # | Point | Proposition à valider |
|---|---|---|
| C1 | Art. 50 : informer que l’utilisateur interagit avec une IA et marquer les contenus générés | Fait : écran de consentement nommant Decart, étiquette « Image générée par IA · Decart » sur le résultat |
| C2 | Interdiction de publier une image générée comme une vraie photo | Fait dans les Règles de la communauté ; à reprendre dans les CGU |
| C3 | Art. 4 : maîtrise de l’IA pour l’équipe | Tenir une courte note interne de formation |

### D. Droit de la consommation et CGU

| # | Point | Proposition à valider |
|---|---|---|
| D1 | Clauses contenu utilisateur : licence accordée à Rota sur les photos publiées | Licence non exclusive, gratuite, mondiale, pour la durée de publication, limitée à l’affichage dans Rota et à sa promotion — à valider |
| D2 | Sanctions et procédure (avertissement → retrait → suspension → fermeture) | Proportionnalité, motivation (A4), recours (A5) |
| D3 | Paiements hors application interdits | Clause + avertissement dans la messagerie (fait) |
| D4 | Rencontres physiques | Lieux publics recommandés ; Rota n’organise pas la rencontre ; responsabilité à cadrer |
| D5 | Rota Delivery | Désactivé tant que les étiquettes/transporteur ne sont pas intégrés ; clauses à rédiger avant activation |

## 3. Sous-traitants et destinataires

| Prestataire | Rôle | Pays | Données |
|---|---|---|---|
| Supabase | Base de données, authentification, stockage, temps réel | UE (région à confirmer) / US | Compte, contenus, messages, médias |
| Stripe (Payments, Connect, Identity, Radar) | Paiement, versements, vérification d’identité, fraude | UE / US | Paiement, identité, biométrie (Identity) |
| Decart | Essayage virtuel IA | US | Image caméra/photo, photo de la pièce |
| Anthropic (API Claude) | Analyse de modération des annonces ; planificateur de tenues Rota Pro | US | Modération : photos, images de vidéos et textes d’annonces. Planificateur : lignes d’annonces publiques, occasion et budget, aucune donnée de compte |
| Mux | Images extraites des vidéos d’annonces pour la modération, **uniquement si activé** | US | Vidéos d’annonces (à confirmer) |
| RevenueCat | Achats in-app (Rota Pro, essayages) et statut d’abonnement, une fois les achats in-app activés | US (CCT, à valider par l’avocat) | Identifiant de compte Rota, produit, événements d’achat |
| Resend | E-mails de compte et rappels | US / UE | E-mail, contenu des e-mails |
| Apple / Google | Connexion, achats in-app, acheminement des notifications, géocodage | US | Identifiant, e-mail, achats, position exacte au moment du géocodage |
| Expo | Envoi des notifications push (et construction / mises à jour de l’app) | US | Jeton push, texte des notifications (pseudonyme, extrait de message ou d’avis) ; le membre retire le texte des messages avec « Aperçu des messages » |

## 4. Clauses proposées (brouillons à reprendre par l’avocat)

**CGU — Contenus publiés par les membres.**
« Vous pouvez publier des photos de vos tenues, des commentaires et des messages. Vous
garantissez détenir les droits sur ces contenus et l’accord des personnes qui y figurent ;
les personnes mineures ne doivent pas apparaître. Sont interdits : la nudité et les
contenus sexuels, les contenus violents, haineux ou harcelants, les contrefaçons, les
images générées par IA présentées comme réelles, et toute sollicitation de paiement hors
de Rota. Tout membre peut signaler un contenu ; Rota l’examine, en général sous 24 heures,
et peut le retirer, en limiter la diffusion, suspendre ou fermer un compte. Vous êtes
informé·e des mesures prises à votre égard, de leur motif et de la façon de les contester. »

**CGU — Messagerie.** « La messagerie sert à organiser vos locations. Proposez des lieux
publics ; ne partagez pas votre adresse. Les paiements et échanges hors de Rota ne sont
pas couverts par la protection Rota. Rota ne lit un message que s’il est signalé. »

**Confidentialité — Essayage virtuel.** « Si vous utilisez l’essayage virtuel et l’acceptez,
l’image de votre caméra ou la photo choisie est transmise à Decart (États-Unis), qui
génère une image ou une vidéo modifiée par intelligence artificielle. Rota ne conserve ni
ne publie ces images. Base légale : votre consentement, que vous pouvez retirer à tout
moment en n’utilisant plus la fonction. »

**Confidentialité — Localisation.** « Si vous l’activez, Rota utilise une position
approximative, arrondie à environ 1 kilomètre, pour afficher les looks et pièces proches
et, si vous le choisissez, votre quartier sur vos publications. Votre position exacte
n’est jamais enregistrée. »

**Confidentialité — Photos.** « Avant l’envoi, l’app supprime les métadonnées de vos photos
(position GPS, date de prise de vue, numéro de série de l’appareil). Pour vérifier les
annonces, elle transmet seulement la marque, le modèle et le logiciel de l’appareil. Les
vidéos gardent pour l’instant leurs métadonnées. Les preuves d’authenticité sont envoyées
telles quelles et ne sont vues que par vous et l’équipe Rota. » (Formulation du risque
vidéo à valider par l’avocat.)

**Confidentialité — Vérification d’identité.** « La vérification d’identité est réalisée
par Stripe Identity à partir d’une pièce d’identité et d’un selfie. Rota ne reçoit que le
résultat (vérifié ou non) et ne conserve pas vos documents. »

## 5. Ce que l’app doit encore faire après la revue

1. Publier les CGU, la politique de confidentialité et les mentions légales validées aux
   adresses déjà liées dans l’app (`therotaapp.com/conditions`, `/confidentialite`,
   `/regles`, `/aide`).
2. Motiver chaque mesure de modération (A4) et ouvrir le recours aux publications (A5).
3. Formulaire web public de signalement (A3).
4. Désigner un médiateur de la consommation.
5. Mettre à jour les étiquettes App Store et le formulaire Data Safety (voir
   `docs/STORE_ACCOUNTS.md`).
