# Confidentialité : demandes de message, sourdine, limiter, corbeille, 18 ans et plus, export et fermeture

## Ce qui change pour les membres

- **Tous les comptes sont publics**, stories comprises. Il n’y a pas de compte privé.
- **Demandes de message.** Le premier message d’une personne que vous ne suivez pas arrive dans « Demandes », sans notification. Vous pouvez accepter, refuser ou bloquer. Si vous refusez, la personne n’est pas prévenue et ses messages suivants ne vous arrivent pas. Seule exception : une vraie offre ou une location en cours entre vous rouvre la conversation.
- **Qui peut m’écrire :** « Tout le monde » ou « Personnes que je suis ». Un message sur une de vos annonces, une offre ou une location arrive toujours.
- **Menu d’un membre** (depuis un post ou un profil) : mettre ses posts ou ses stories en sourdine, le limiter, le bloquer, le signaler. Personne n’est prévenu.
- **Limiter :** ses nouveaux avis sur vos posts ne sont visibles que par lui, et ses nouvelles conversations vont dans Demandes.
- **Avis :** vous choisissez qui peut laisser un avis (tout le monde, vos abonnés, personne). Vous pouvez aussi masquer des mots, avec une liste d’insultes courantes déjà prête, et masquer le nombre de j’aime.
- **Récemment supprimé :** un post ou une story supprimé se restaure pendant 30 jours, puis il est effacé avec ses fichiers.
- **18 ans et plus :** une case à cocher à l’inscription.
- **Position** arrondie à environ 1 km.
- **Photos :** leurs métadonnées (GPS, date, numéro de série) sont retirées avant l’envoi.
- **Mes données :** l’export est complet (sans identifiant Stripe ni jeton push). La fermeture du compte efface le profil, les contenus et les fichiers, et garde le reste sous pseudonyme.
- **Location :**
  - « Mettre une pièce en location » est un bouton clair dans le Dressing.
  - Le brouillon est gardé pendant la vérification d’identité.
  - Le prix d’achat « 1 200,50 » est bien lu comme 1 200 €.
  - Au plus 10 règles, de 1 à 120 caractères.
- **Le « + »** propose seulement Fit ou Story.
- **Retour** ramène là où vous étiez.

## Base de données : migrations 029 à 035b, toutes appliquées en production

`029_private_accounts`, `029b_private_accounts_fixes`, `030_mute_restrict_reviews`, `030b_reviews_fixes`, `031_message_requests`, `031b_message_requests_fixes`, `031c_shadow_drop_oracles`, `031d_rental_context_reopens`, `031e_offer_reopen_pending`, `032_bin_and_highlights`, `032b_bin_and_highlights_fixes`, `032c_bin_fixes`, `033_export_and_closure`, `033b_export_closure_fixes`, `033c_notification_rename_fix`, `033d_drop_identity`, `033e_path_ownership`, `033f_path_allowlist`, `034_public_accounts`, `034b_listings_grants`, `035_listing_rules_limits`, `035b_listing_rules_ok_grants`.

- Chaque fichier a sa migration en production, sous le même nom sans le numéro.
- Une seule entrée en plus en production : `private_accounts_trigger_grants`. C’est la fin de 029, appliquée à part ; c’est noté en tête de 029.
- L’ordre d’application en production n’est pas celui des noms de fichiers :
  - 031d et 031e ont été appliquées après 034 ;
  - 033c à 033f ont été appliquées après 034.

  J’ai vérifié qu’aucune fonction, politique ou index n’est redéfini dans un ordre différent. Rejouer les fichiers dans l’ordre des noms donne donc le même résultat.

## Edge Functions redéployées

- `worker` v6 : purge de la corbeille de 30 jours, textes push.
- `account` v5 : export avec liens, effacement récursif, suppression de la connexion Apple / Google.

## Tests

SQL (`supabase/tests/privacy/`, chacun avec `_prelude.sql`, sur la base de production ; chaque test est annulé à la fin) : **250 / 250 vrais**.

| Test | Vérifications | Résultat |
|---|---|---|
| 029 private_accounts | 29 | toutes vraies |
| 030 mute_restrict_reviews | 33 | toutes vraies |
| 031 message_requests | 57 | toutes vraies |
| 032 bin_and_highlights | 32 | toutes vraies |
| 033 export_and_closure | 36 (+ `missing: []`) | toutes vraies |
| 033d drop_identity | 5 | toutes vraies |
| 033e path_ownership | 23 | toutes vraies |
| 034 public_accounts | 9 | toutes vraies |
| 034b listings_grants | 14 | toutes vraies |
| 035 listing_rules_limits | 12 | toutes vraies |

App :
- `npx tsc --noEmit` ne signale aucune erreur.
- `node scripts/check-purchase-price.mjs` : 10 cas sur 10.
- Ajouts sur la branche :
  - aucun `debugger`, `TODO` ni `FIXME` ;
  - un seul `console.log`, qui est la sortie voulue du script de vérification ;
  - aucun secret ; les mentions de `service_role` sont des noms de rôle dans des droits SQL ;
  - aucun `.env` versionné.

Advisors Supabase : rien de nouveau en sécurité au-delà de ce qui est voulu :
- les RPC `security definer` exécutables par les membres ;
- l’INFO sur `storage_orphans`, réservée au service.

En performance, deux points mineurs :
- deux politiques DELETE permissives sur `follows` (029) ;
- des clés étrangères non indexées sur `offers` et `social_reports`, que lisent les nouvelles requêtes 031d, 031e et 032c.

Parcours démo sur le web, en taille mobile :
- inscription avec la case 18+ ;
- feed → profil → retour ;
- `…` d’un post → menu du membre ;
- Messages → Demandes, puis accepter, refuser ou bloquer ;
- Réglages → Confidentialité, avec chaque sous-page ;
- Dressing → « Mettre une pièce en location » : formulaire rempli, vérification démo, photo, puis publication. Le message démo s’affiche ;
- « + » → Fit / Story.

Une seule erreur console, sur le web uniquement : `findNodeHandle is not supported on web`, à l’ouverture du menu du membre (`mobile/src/ui/MemberMenu.tsx:62`). Le menu fonctionne quand même. La correction tient en une ligne : sauter ce code quand `Platform.OS === 'web'`.

## Non vérifié

- Appareils réels iOS et Android.
- Le retour Android (bouton et geste).
- Les lecteurs d’écran (VoiceOver et TalkBack). Sur le web, les états cochés et sélectionnés ne sont pas exposés aux lecteurs d’écran ; ce schéma existait déjà avant la branche.
- Les vrais chemins Stripe et d’envoi de fichiers en production. La démo n’envoie rien.

## Décision à prendre (propriétaire)

**Vérification d’identité côté serveur pour mettre en location.**
- Aujourd’hui, seule l’app demande la vérification d’identité avant « Mettre en location ».
- La base accepte une annonce d’un membre non vérifié. Le test 035 en insère une en tant que membre non vérifié.
- Faut-il ajouter cette règle dans la base, par une politique ou un trigger sur `listings` ?

## Points pour l’avocat

Voir `docs/legal/07-revue-avocat-social-2026-09.md` §1 bis et les encadrés « brouillon » de `mobile/src/data/legalContent.ts` :
- **Conservation :**
  - 30 jours dans la corbeille ;
  - 6 mois après une décision de modération ou de recours (DSA) ;
  - liste, durées et base légale des données gardées sous pseudonyme après la fermeture.
- **Âge :** une case « J’ai 18 ans ou plus », horodatée. Faut-il un mécanisme de vérification plus fort ?
- **Demandes refusées :** les messages sont conservés mais jamais remis, sans prévenir l’expéditeur. Ce qu’il faut conserver et dire aux membres reste à valider.
- **Vidéos :** elles gardent leurs métadonnées, dont le GPS, jusqu’à la version de développement. Une information dans la politique suffit-elle, ou faut-il bloquer les vidéos d’ici là ?
- **Export :**
  - Il manque encore les décisions de risque, les états des lieux, les messages reçus et les données de l’identité Google. Faut-il les ajouter (art. 15 / 20) ?
  - Le lien vers la preuve d’authenticité est valable 7 jours.
- **Géocodage :** le géocodeur Apple / Google reçoit la position exacte pour nommer le quartier. Faut-il le mentionner ?
- **Sous-traitants hors UE :** pays, garanties de transfert et contrats pour RevenueCat, Expo, Anthropic, Decart et Mux.
- Formulation du risque vidéo dans la fiche App Store.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
