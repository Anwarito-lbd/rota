/**
 * Contenu juridique in-app (FR) — synthèses des outlines docs/legal/*.
 * Pas un avis juridique. Brouillons en attente de revue avocat.
 */

export type LegalSlug = 'mentions' | 'cgu' | 'privacy' | 'fees' | 'community';

export type LegalSection = {
  heading: string;
  body: string[];
  /** Highlight rows (e.g. deposit tiers table) */
  table?: { headers: string[]; rows: string[][] };
  callout?: { tone: 'warn' | 'draft' | 'info'; text: string };
};

export type LegalDoc = {
  slug: LegalSlug;
  title: string;
  subtitle: string;
  source: string;
  sections: LegalSection[];
};

export const LEGAL_BANNER =
  'Brouillons — en attente de revue par un avocat français. Pas un avis juridique. Ne pas lancer / encaisser de cautions réelles avant validation (voir docs/legal/06).';

/**
 * PÉRIMÉ vs le produit. Les sections « caution — paliers A–D » ci-dessous
 * décrivent l’ancien modèle : une caution pour chaque location. Le produit
 * applique désormais la stratégie Trust & Protection (P0) : location sans
 * caution par défaut, empreinte uniquement sur décision de risque, et
 * responsabilité plafonnée par la valeur approuvée (voir lib/policy.ts et
 * supabase/migrations/002_trust_protection.sql). Ces brouillons doivent être
 * réécrits avec l’avocat avant toute publication.
 */
export const LEGAL_OUTDATED_NOTICE =
  'Ces brouillons décrivent l’ancien modèle de caution systématique. Le produit applique la stratégie Trust & Protection : sans caution par défaut.';

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  mentions: {
    slug: 'mentions',
    title: 'Mentions légales',
    subtitle: 'Éditeur, hébergeur & contact (placeholders)',
    source: 'docs/legal/01-cgu-outline.md §1 + 00-README',
    sections: [
      {
        heading: 'Éditeur',
        body: [
          'Éditeur : [PLACEHOLDER société] (forme, capital, siège, SIREN, RCS).',
          'Directeur de publication : [PLACEHOLDER].',
          'Contact : [PLACEHOLDER contact] (ex. legal@rota… / support@rota…).',
        ],
      },
      {
        heading: 'Hébergeur',
        body: ['Hébergeur : [PLACEHOLDER hébergeur] (UE préféré).'],
      },
      {
        heading: 'Produit',
        body: [
          'Rota est une plateforme numérique d’intermédiation mettant en relation des prêteurs et des locataires pour la location temporaire de vêtements / outfits (pas de revente).',
          'Rota n’est pas le loueur des pièces : le contrat de location se forme entre utilisateurs via la plateforme — qualification à vérifier avec un avocat.',
        ],
      },
      {
        heading: 'Statut de ce texte',
        body: [
          'Trame de travail destinée à être développée et validée par un avocat français. Ne constitue pas un conseil juridique ni des mentions finales opposables.',
        ],
        callout: { tone: 'warn', text: LEGAL_BANNER },
      },
    ],
  },

  cgu: {
    slug: 'cgu',
    title: 'Conditions générales (CGU)',
    subtitle: 'Outline — acceptation à la création de compte / réservation',
    source: 'docs/legal/01-cgu-outline.md',
    sections: [
      {
        heading: 'Objet',
        body: [
          'Les présentes CGU régissent l’accès et l’usage de l’app / site Rota, les règles de location, paiements, responsabilités et sanctions.',
          'Acceptation : création de compte et/ou première réservation = acceptation des CGU + Politique de confidentialité + Guidelines communauté + Politique frais / annulation / dommages.',
        ],
        callout: { tone: 'warn', text: LEGAL_BANNER },
      },
      {
        heading: 'Rôle de Rota',
        body: [
          'Rota fournit : annonces, messagerie in-app, matching, escrow / holds via Stripe, outils de claim, support.',
          'Rota n’est pas partie au contrat de location P2P (sauf dispositions impératives — à vérifier avec un avocat).',
          'Assurance : aucun produit d’assurance n’est inclus pour l’instant (non inclus / TBD).',
        ],
      },
      {
        heading: 'Comptes & âge',
        body: [
          'Compte personnel obligatoire pour louer ou prêter.',
          'Âge minimum : 18 ans. Compte mineur = interdit.',
          'Identité payout doit correspondre au titulaire du compte.',
          'KYC / vérification d’identité (stub) pour Tier C / D de caution, ou premier booking high-value.',
        ],
      },
      {
        heading: 'Annonces',
        body: [
          'Le prêteur garantit être propriétaire ou disposer des droits pour louer la pièce.',
          'Photos honnêtes ; défauts visibles mentionnés ; valeur retail estimée pour le calcul de caution.',
          'Interdiction de contrefaçon / faux : ban.',
        ],
      },
      {
        heading: 'Location, remise & retour',
        body: [
          'Sans hold caution réussi = pas de réservation.',
          'Modes MVP : rencontre (lieux publics) et/ou envoi si activé.',
          'Le payout loyer n’est PAS déclenché au handover.',
          'Silent OK : Meet 2 h / Ship 24 h après confirmation de retour sans claim.',
        ],
      },
      {
        heading: 'Paiements hors app',
        body: [
          'Strictement interdit : espèces, virement direct, PayPal hors Stripe Rota, arrangements pour contourner la commission.',
          'Contournement = suspension / ban + perte éventuelle des protections Rota.',
        ],
      },
    ],
  },

  privacy: {
    slug: 'privacy',
    title: 'Confidentialité',
    subtitle: 'Outline RGPD — pas une politique finale',
    source: 'docs/legal/02-privacy-outline.md',
    sections: [
      {
        heading: 'Responsable de traitement',
        body: [
          'Responsable : [PLACEHOLDER société].',
          'Contact privacy / DPO : [PLACEHOLDER contact DPO / privacy].',
          'Hébergeur / sous-traitant : [PLACEHOLDER hébergeur].',
        ],
        callout: { tone: 'warn', text: LEGAL_BANNER },
      },
      {
        heading: 'Données collectées (catégories)',
        body: [
          'Compte : e-mail et mot de passe (stocké chiffré), ou connexion Apple / Google ; date à laquelle vous avez déclaré avoir 18 ans ou plus.',
          'Profil public : nom d’utilisateur, photo, bio, badges ; votre ville seulement si vous choisissez de l’afficher. Rota ne demande ni votre nom complet ni votre numéro de téléphone pour créer un compte.',
          'Adresse de livraison (facultative) : nom du destinataire, adresse et téléphone. Ils ne sont transmis à l’autre membre que pour une location payée envoyée par colis.',
          'Vérification d’identité : réalisée par Stripe Identity (pièce d’identité et selfie) ; Rota ne reçoit que le résultat.',
          'Paiements (Stripe) : montants et statuts ; Rota ne stocke ni le numéro complet de votre carte ni le CVC. Achats in-app (Rota Pro, essayages) : produit et date, transmis par Apple / Google via RevenueCat.',
          'Contenus : annonces, posts, stories, avis, messages, photos de remise et de retour, signalements, recours et décisions de modération.',
          'Notifications : jeton push de votre téléphone et vos préférences.',
          'L’app n’intègre aucun outil de mesure d’audience ni de publicité. Le serveur garde des journaux techniques (sécurité, erreurs) ; durée à fixer.',
        ],
      },
      {
        heading: 'Ce qui est public',
        body: [
          'Tous les comptes sont publics : votre profil, vos posts, vos stories, vos highlights et vos annonces sont visibles par tous les membres.',
          'Votre e-mail, votre adresse et votre téléphone n’apparaissent jamais sur votre profil.',
        ],
      },
      {
        heading: 'Vos réglages de confidentialité',
        body: [
          'Qui peut vous écrire : tout le monde, ou seulement les personnes que vous suivez. Les messages des personnes que vous ne suivez pas arrivent dans « Demandes », sans notification. Ceux qui concernent une de vos annonces, une offre ou une location arrivent quand même.',
          'Si vous refusez une demande, les messages suivants de cette personne ne vous sont pas remis, et elle n’en est pas informée.',
          'Sourdine : les posts ou les stories d’un compte ne s’affichent plus pour vous. Limiter : ses avis sur vos posts ne sont visibles que par lui, et ses messages arrivent dans Demandes. Ces personnes ne sont pas prévenues.',
          'Mots masqués : les nouveaux avis sur vos posts qui contiennent ces mots sont masqués. Vous pouvez aussi masquer le nombre de j’aime de vos posts.',
          '« Aperçu des messages » : choisissez si le texte des messages s’affiche dans les notifications.',
          'Bloquer et signaler restent possibles sur chaque profil, post et message.',
        ],
      },
      {
        heading: 'Suppression et corbeille',
        body: [
          'Un post ou une story supprimé va dans « Récemment supprimé » : vous pouvez le restaurer pendant 30 jours, puis il est effacé définitivement, fichiers compris.',
          'Exception : un contenu visé par une décision de modération, un signalement ou un recours en cours est conservé jusqu’à 6 mois après la décision, pour permettre la contestation.',
        ],
        callout: { tone: 'draft', text: 'Durée de 6 mois (recours DSA) à valider par l’avocat.' },
      },
      {
        heading: 'Localisation et photos',
        body: [
          'Si vous l’activez (carte « Près de moi », quartier sur un post), votre position est arrondie à environ 1 km sur le téléphone, puis de nouveau sur le serveur. Rota n’enregistre jamais votre position exacte et ne vous localise pas en arrière-plan.',
          'Les photos sont réencodées sur le téléphone avant l’envoi : leurs métadonnées (position GPS, date de prise de vue, numéro de série de l’appareil) sont supprimées. Pour la modération des annonces, seuls la marque, le modèle et le logiciel de l’appareil sont transmis, à part.',
          'Exception : les preuves d’authenticité (ticket, étiquette) sont envoyées telles quelles et ne sont visibles que par vous et l’équipe Rota.',
        ],
        callout: {
          tone: 'warn',
          text: 'Risque résiduel : les vidéos gardent leurs métadonnées (dont une éventuelle position GPS) jusqu’à la version de développement de l’app.',
        },
      },
      {
        heading: 'Prestataires',
        body: [
          'Supabase : base de données, connexion, fichiers, temps réel.',
          'Stripe : paiements, versements, vérification d’identité, lutte contre la fraude.',
          'Apple / Google : connexion, achats in-app, acheminement des notifications.',
          'RevenueCat (États-Unis) : achats in-app et statut d’abonnement, liés à votre identifiant Rota. Transfert encadré par des clauses contractuelles types.',
          'Expo (États-Unis) : envoi des notifications push ; reçoit le jeton de votre téléphone et le texte de la notification. « Aperçu des messages » retire le texte des messages.',
          'Decart (États-Unis) : essayage virtuel. Votre image n’est envoyée qu’après votre accord sur l’écran de consentement ; Rota ne la conserve pas.',
          'Anthropic (États-Unis) : analyse de modération des annonces (photos et textes) et planificateur de tenues Rota Pro, qui ne reçoit que des annonces publiques, l’occasion et le budget.',
          'Resend : e-mails de compte et rappels.',
        ],
        callout: { tone: 'draft', text: 'Pays, garanties de transfert et contrats de sous-traitance à valider par l’avocat.' },
      },
      {
        heading: 'Télécharger vos données',
        body: [
          'Paramètres de confidentialité › Télécharger une copie de mes données : un fichier JSON avec votre compte, profil, adresse, préférences, annonces, posts, stories, highlights, commentaires et avis, j’aime, republications, tableaux, abonnements, blocages, sourdines, comptes limités, mots masqués, conversations et messages envoyés, offres, favoris, locations, réclamations, versements, achats in-app, consentements de paiement, signalements, recours, décisions de modération et notifications.',
          'Les autres membres y figurent par leur nom d’utilisateur, sauf ceux que vous avez bloqués ou qui vous ont bloqué. Le fichier ne contient ni identifiant Stripe ni jeton push, et il est effacé du téléphone après le partage.',
        ],
      },
      {
        heading: 'Fermer votre compte',
        body: [
          'Impossible tant qu’une location, un versement ou une réclamation est en cours.',
          'Supprimé : votre profil (nom d’utilisateur remplacé par un pseudonyme), photo, bio, ville, adresse, préférences et jeton push, posts, stories, highlights, commentaires, j’aime, republications, tableaux, abonnements, blocages, sourdines, mots masqués, favoris, notifications, offres non utilisées, vos photos de profil, d’annonces, de posts et de stories, et vos preuves d’authenticité. Vos annonces sont retirées et perdent photos et description. Votre e-mail est remplacé et la connexion Apple / Google est supprimée.',
          'Conservé sous pseudonyme, pour des raisons légales : locations, paiements et versements, réclamations et leurs photos, messages échangés, décisions de modération, et historique de vos achats in-app (sous un identifiant aléatoire).',
        ],
        callout: { tone: 'draft', text: 'Durées de conservation de ces données à valider par l’avocat.' },
      },
      {
        heading: 'Mineurs',
        body: ['Rota est réservé aux personnes de 18 ans et plus, ce que vous déclarez à l’inscription.'],
      },
      {
        heading: 'Vos droits',
        body: [
          'Accès, rectification, effacement, limitation, opposition, portabilité — selon le RGPD.',
          'Modalités exactes et délais : à finaliser avec un avocat / DPO avant publication.',
        ],
      },
    ],
  },

  community: {
    slug: 'community',
    title: 'Règles de la communauté',
    subtitle: 'Confiance & sécurité — Paris-first',
    source: 'docs/legal/03-community-guidelines.md',
    sections: [
      {
        heading: 'Esprit Rota',
        body: [
          'Location d’outfits entre particuliers — pas un marché de revente.',
          'Bienveillance, ponctualité, honnêteté sur l’état des pièces.',
          'Protection via escrow / holds / claims — pas via une assurance (non inclus / TBD).',
        ],
        callout: { tone: 'info', text: 'Complète les CGU ; en cas de conflit, CGU + loi prévalent (hiérarchie à valider avocat).' },
      },
      {
        heading: 'Respect',
        body: [
          'Interdit : insultes, menaces, harcèlement, discrimination, doxxing, contenu sexuel non sollicité.',
          'Signalement plutôt que riposte. Sanctions : warning → suspension → ban.',
        ],
      },
      {
        heading: 'Paiements & pièces',
        body: [
          'Toute location passe par l’app (Stripe). Paiements hors app interdits.',
          'Usure normale acceptée ; taches, brûlures, déchirures, odeurs fortes = hors usure → claim possible.',
          'Photos listing / pick-up / retour honnêtes et utiles pour les claims.',
        ],
      },
      {
        heading: 'Sécurité meetups',
        body: [
          'Rencontres en lieux publics uniquement. Pas de domicile privé imposé.',
          'Contrefaçon = ban. Signalez tout comportement suspect.',
        ],
      },
    ],
  },

  fees: {
    slug: 'fees',
    title: 'Frais & caution',
    subtitle: 'Règles produit verrouillées (paliers A–D) — frais 10 % × 2 (locataire + prêteur, bêta)',
    source: 'docs/legal/04-fees-cancellation-damage.md',
    sections: [
      {
        heading: 'Avertissement',
        body: [
          'Politique draft produit / ops. Pas un avis juridique.',
          'Flags avocat obligatoires : langage caution, disclosure des frais, annulation, plafonds dommages, conservation ID.',
        ],
        callout: { tone: 'warn', text: LEGAL_BANNER },
      },
      {
        heading: 'Frais de service (bêta Closets fondateurs)',
        body: [
          'Modèle bilatéral 10 % (bêta) : le locataire paie loyer + 10 % ; le prêteur reçoit loyer − 10 %.',
          'Exemple : pièce à 10 €/jour, 1 jour → locataire paie 11 € (hors livraison / caution) ; prêteur reçoit 9 € ; plateforme 2 €.',
          'Prix / jour = loyer listé (pas le net prêteur). Affichage avant paiement : loyer + frais service locataire + livraison + nettoyage (si applicable) + caution en hold.',
          'Assurance : non incluse.',
        ],
        callout: {
          tone: 'draft',
          text: 'Frais bilatéraux 10 % + 10 % (bêta Closets fondateurs) — règles brouillon soumises à revue avocat ; pas des conditions juridiques finales.',
        },
      },
      {
        heading: 'Caution — paliers A–D (verrouillé)',
        body: [
          'R = loyer (rental fee), V = valeur retail estimée déclarée / validée.',
          'Préférence : autorisation de carte (hold). Hold échoué / refusé → réservation non créée.',
          'Tier C / D (ou 1er booking high-value) : KYC / ID stub requis.',
          'Qualification juridique « caution / dépôt / pré-autorisation » : à vérifier avec un avocat.',
        ],
        table: {
          headers: ['Tier', 'Retail V', 'Caution'],
          rows: [
            ['A', 'V < 150 €', '100 % × R, minimum 25 €'],
            ['B', '150 € ≤ V ≤ 500 €', 'max(150 % × R, 40 % × V)'],
            ['C', '500 € < V ≤ 2 000 €', '60 % × V, plafonné à V'],
            ['D', 'V > 2 000 € ou pièce rare', '80–100 % × V + revue manuelle'],
          ],
        },
      },
      {
        heading: 'Escrow & payout',
        body: [
          'À la réservation : loyer (et frais) en escrow ; caution en hold.',
          'Au handover : aucun payout au prêteur.',
          'Release loyer après retour OK, silent OK (Meet 2 h / Ship 24 h), ou décision Rota.',
          'Claim ouvert → gel payout et caution jusqu’à résolution.',
        ],
      },
      {
        heading: 'Annulation (structure)',
        body: [
          'Barèmes % encore partiellement [PLACEHOLDER] — à valider produit + avocat.',
          'Annulation prêteur après confirmation : remboursement locataire 100 % loyer + frais service (principe MVP).',
          'Droit de rétractation 14 j : applicabilité à vérifier avec un avocat — ne pas affirmer « aucun » sans conseil.',
        ],
        callout: { tone: 'draft', text: 'Barèmes d’annulation — brouillon — à confirmer.' },
      },
      {
        heading: 'Retard de retour (verrouillé)',
        body: [
          'Meet : grâce 30 minutes. Ship : dépôt / expédition au plus tard fin du jour de retour.',
          'Jour 1 de retard : 50 % du daily rate ; chaque jour suivant : 100 % / jour.',
          'Plafond des pénalités de retard ≤ caution.',
          'À compter du 3ᵉ jour sans retour → voie lost-item (ops).',
        ],
      },
      {
        heading: 'Dommages & nettoyage',
        body: [
          'Fenêtres claim : Meet 2 h / Ship 24 h. Preuves : photos pick-up vs retour.',
          'Nettoyage : forfait par type de pièce (montants [PLACEHOLDER]).',
          'Réparation plafonnée au moindre de : caution, et ~50 % de V — sauf Tier D (revue manuelle).',
          'Assurance : non incluse / TBD.',
        ],
      },
    ],
  },
};

export const LEGAL_LINKS: { slug: LegalSlug; label: string }[] = [
  { slug: 'mentions', label: 'Mentions légales' },
  { slug: 'cgu', label: 'CGU' },
  { slug: 'privacy', label: 'Confidentialité' },
  { slug: 'fees', label: 'Frais & caution' },
  { slug: 'community', label: 'Communauté' },
];
