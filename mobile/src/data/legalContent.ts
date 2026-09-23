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
          'Compte & profil : email, mot de passe (hash), téléphone, prénom/nom, photo, bio, ville.',
          'KYC (stub) : pièce d’identité, selfie, statut — Tier C/D ou premier booking high-value. Conservation : à vérifier avec un avocat.',
          'Paiements (Stripe) : montants, statuts escrow/hold ; Rota ne stocke pas le PAN complet ni le CVC.',
          'Listings & photos (y compris pick-up / retour), messages in-app, device / logs / analytics, support & claims.',
        ],
      },
      {
        heading: 'Géolocalisation',
        body: [
          'Si utilisée (suggestions Paris, distance meetup) : précision et moment à clarifier ; pas de tracking arrière-plan sans nécessité claire + info.',
        ],
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
