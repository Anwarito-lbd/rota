/**
 * Static demo catalogue. Everything the prototype shows comes from here so a
 * real API can replace this module wholesale without touching the screens.
 */

import { FEES as MONEY } from '../lib/fees';

/** Unsplash still, sized for the device. */
export const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Public sample clips used until lenders upload their own videos. */
export const SAMPLE_VIDEOS = [
  'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://download.samplelib.com/mp4/sample-5s.mp4',
] as const;

/** Stills reused across the grids, boards and search results. */
export const PHOTO_POOL = [
  img('photo-1595777457583-95e059d581b8'),
  img('photo-1566174053879-31528523f8ae'),
  img('photo-1551028719-00167b16eac5'),
  img('photo-1591369822096-ffd140ec948f'),
  img('photo-1572804013309-59a88b7e92f1'),
  img('photo-1483985988355-763728e1935b'),
  img('photo-1539533018447-63fcce2678e3'),
  img('photo-1490481651871-ab68de25d43d'),
  img('photo-1541099649105-f69ad21f3246'),
  img('photo-1584917865442-de89df76afd3'),
  img('photo-1515372039744-b8f02a3ae446'),
  img('photo-1521223890158-f9f7c3d5d504'),
];

/** Stable pick from the pool, so a given slot always shows the same photo. */
export function photoFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PHOTO_POOL[h % PHOTO_POOL.length];
}

export interface Piece {
  id: string;
  title: string;
  brand: string;
  price: number;
  retail: number;
  size: string;
  city: string;
  handle: string;
  name: string;
  likes: string;
  comments: string;
  occasion: string;
  badge: string;
  wornCount: string;
  rating: string;
  /** Certified account, the way Instagram and TikTok mark verified profiles. */
  certified: boolean;
  /** Proof the lender uploaded so the piece can be sold as authentic. */
  authenticity: 'receipt' | 'tag' | null;
  /**
   * `byLender` means the renter must NOT wash the piece — the lender has it
   * cleaned and charges `fee` for it. Otherwise the renter returns it clean
   * and nothing is charged.
   */
  cleaning: { byLender: boolean; fee: number };
  /** House rules the renter has to accept before paying. */
  rules: string[];
  photo: string;
  video?: string;
  avatar: string;
}

export const pieces: Piece[] = [
  {
    id: 'f1',
    title: 'Nuisette en biais, ivoire',
    brand: 'Réalisation Par',
    price: 24,
    retail: 340,
    size: 'S',
    city: 'Paris 11e',
    handle: 'camille.b',
    name: 'Camille B.',
    likes: '12,4k',
    comments: '318',
    occasion: 'Dîner',
    badge: 'Réservation immédiate',
    wornCount: 'louée 9×',
    rating: '4,9',
    certified: true,
    authenticity: 'receipt',
    cleaning: { byLender: false, fee: 0 },
    rules: [
      'Lavage à la main uniquement, eau froide',
      'Pas de parfum ni de cigarette sur le tissu',
      'Retour dans la housse fournie',
    ],
    photo: img('photo-1595777457583-95e059d581b8'),
    video: SAMPLE_VIDEOS[0],
    avatar: img('photo-1524504388940-b1c1722653e1', 200),
  },
  {
    id: 'f2',
    title: 'Trench en cuir vintage',
    brand: "Pièce d'archive",
    price: 31,
    retail: 620,
    size: 'M',
    city: 'Lyon 2e',
    handle: 'yasmine.k',
    name: 'Yasmine K.',
    likes: '8,1k',
    comments: '204',
    occasion: 'Tous les jours',
    badge: 'Livraison offerte',
    wornCount: 'louée 23×',
    rating: '5,0',
    certified: false,
    authenticity: 'tag',
    cleaning: { byLender: true, fee: 14 },
    rules: ['Ne pas laver : cuir nettoyé par mes soins', 'Pas de pluie prolongée'],
    photo: img('photo-1551028719-00167b16eac5'),
    avatar: img('photo-1494790108377-be9c29b29330', 200),
  },
  {
    id: 'f3',
    title: 'Robe colonne à sequins',
    brand: 'Rasario',
    price: 58,
    retail: 1480,
    size: 'S–M',
    city: 'Paris 9e',
    handle: 'juliette.m',
    name: 'Juliette M.',
    likes: '31,2k',
    comments: '1,1k',
    occasion: 'Gala',
    badge: 'Créateur',
    wornCount: 'louée 4×',
    rating: '4,96',
    certified: true,
    authenticity: 'receipt',
    cleaning: { byLender: true, fee: 18 },
    rules: [
      'Ne pas laver ni repasser : pressing spécialisé à mes frais',
      'Pas de maquillage sur le col',
      'Retour sous 48 h après la date de fin',
    ],
    photo: img('photo-1566174053879-31528523f8ae'),
    video: SAMPLE_VIDEOS[1],
    avatar: img('photo-1517841905240-472988babdf9', 200),
  },
];

/** Per-piece negotiation policy: whether offers are accepted and the floor. */
export const negotiation: Record<string, { nego: boolean; min: number }> = {
  f1: { nego: true, min: 18 },
  f2: { nego: false, min: 0 },
  f3: { nego: true, min: 46 },
};

export const SIZES = ['XS', 'S', 'M', 'L'];

export const OCCASIONS = [
  'Gala',
  'Mariage',
  'Tous les jours',
  'Festival',
  'Entretien',
  'Dîner',
];

export const CATEGORIES = [
  'Robes',
  'Manteaux',
  'Tailoring',
  'Soirée',
  'Chaussures',
  'Sacs',
  'Vintage',
];

export const IDEAS = [
  'Saison des galas',
  'Invitée de mariage',
  "Denim d'archive",
  'Festival',
  'Bureau',
  'Soirée',
];

export const SORT_OPTIONS = ['Recommandé', 'Prix croissant', 'Nouveautés', 'Au plus près'];

/** Days already taken on the active piece's calendar. */
export const BOOKED_DAYS = [24, 25, 26];

/**
 * One fee source. The money maths live in lib/fees (two-sided 10% service fee,
 * deposit tiers by item value); the rest is copy shown around the app.
 */
export const FEES = {
  ...MONEY,
  /** Suggested cleaning fee when a lender chooses to clean the piece herself. */
  cleaningSuggested: 12,
  /** Damage cover ceiling, per rental. */
  coverCap: 1500,
  /** What the lender loses to the platform, as a fraction of the rent. */
  commission: MONEY.lenderServiceRate,
  /** Credit offered for posting a post-rental video. */
  videoCredit: 10,
};

export interface Rule {
  title: string;
  body: string;
}

export const rules: Rule[] = [
  {
    title: 'Send it back as it arrived',
    body: 'Cleaning is priced into every booking. Stains happen — tell the lender instead of hiding them.',
  },
  {
    title: 'Real pieces, real photos',
    body: 'No counterfeits, no stock images, no listing something you do not own.',
  },
  {
    title: 'Keep it in the app',
    body: 'Payments, offers and messages stay on Rota. Off-app deals lose all cover.',
  },
  {
    title: 'Be kind at handover',
    body: "No pressure, no comments on anyone's body. Meet in public places.",
  },
];

export const permissions: { key: 'camera' | 'microphone' | 'photos' | 'location'; title: string; body: string }[] = [
  {
    key: 'camera',
    title: 'Appareil photo',
    body: 'Pour filmer la vidéo d’une annonce ou photographier une pièce au retour.',
  },
  {
    key: 'microphone',
    title: 'Micro',
    body: 'Pour le son de vos vidéos d’annonce. Jamais en arrière-plan.',
  },
  {
    key: 'photos',
    title: 'Photos',
    body: 'Pour choisir des photos dans votre galerie. Seules celles que vous sélectionnez sont lues.',
  },
  {
    key: 'location',
    title: 'Position',
    body: 'Pour montrer les pièces proches et suggérer des points de remise publics. Jamais en arrière-plan.',
  },
];

export interface Pin {
  id: string;
  title: string;
  price: number;
  h: string;
  handle: string;
  size: string;
  to: string;
}

export const pins: Pin[] = [
  { id: 'p1', title: 'Robe colonne à sequins', price: 58, h: '268px', handle: '@juliette.m', size: 'S–M', to: 'f3' },
  { id: 'p2', title: 'Nuisette en biais', price: 24, h: '188px', handle: '@camille.b', size: 'S', to: 'f1' },
  { id: 'p3', title: 'Trench en cuir', price: 31, h: '222px', handle: '@yasmine.k', size: 'M', to: 'f2' },
  { id: 'p4', title: 'Mini à plumes', price: 47, h: '296px', handle: '@dana.p', size: 'S', to: 'f3' },
  { id: 'p5', title: 'Blazer en velours', price: 19, h: '172px', handle: '@lea.m', size: 'S', to: 'f2' },
  { id: 'p6', title: 'Top résille', price: 14, h: '240px', handle: '@ines.d', size: 'XS', to: 'f1' },
  { id: 'p7', title: 'Manteau en laine', price: 27, h: '206px', handle: '@mira.s', size: 'L', to: 'f2' },
  { id: 'p8', title: 'Mini robe perlée', price: 41, h: '278px', handle: '@manon.l', size: 'M', to: 'f3' },
];

export interface SearchResult {
  slot: string;
  title: string;
  brand: string;
  price: number;
  size: string;
  dist: string;
  handle: string;
  favCount: string;
  status: string;
  id: string;
}

export const searchResults: SearchResult[] = [
  { slot: 'r1', title: 'Robe colonne à sequins', brand: 'Rasario', price: 58, size: 'S–M', dist: '3,1 km', handle: '@juliette.m', favCount: '312', status: 'Libre 18–21', id: 'f3' },
  { slot: 'r2', title: 'Nuisette satin, huître', brand: 'Réalisation', price: 22, size: 'S', dist: '1,4 km', handle: '@camille.b', favCount: '184', status: 'Immédiat', id: 'f1' },
  { slot: 'r3', title: 'Mini robe perlée', brand: 'Self-Portrait', price: 41, size: 'M', dist: '4,8 km', handle: '@manon.l', favCount: '96', status: 'Main propre', id: 'f3' },
  { slot: 'r4', title: 'Blazer en velours', brand: 'Ganni', price: 19, size: 'S', dist: 'Livraison', handle: '@lea.m', favCount: '71', status: 'Livraison offerte', id: 'f2' },
  { slot: 'r5', title: 'Robe à plumes', brand: '16Arlington', price: 47, size: 'S', dist: '2,2 km', handle: '@dana.p', favCount: '228', status: 'Prise vendredi', id: 'f3' },
  { slot: 'r6', title: 'Trench en cuir', brand: 'Archive', price: 31, size: 'M', dist: 'Livraison', handle: '@yasmine.k', favCount: '403', status: 'Louée 23×', id: 'f2' },
];

export interface Board {
  id: string;
  name: string;
  count: number;
  meta: string;
}

/** `meta` may interpolate a price, so it is built from the currency formatter. */
export const boards = (m: (n: number) => string): Board[] => [
  { id: 'b1', name: 'Saison des galas', count: 18, meta: '6 libres 18–21 sept.' },
  { id: 'b2', name: 'Invitée de mariage', count: 24, meta: '4 livrables chez vous' },
  { id: 'b3', name: 'Tailoring 90s', count: 11, meta: 'surtout en local' },
  { id: 'b4', name: 'Festival', count: 9, meta: `à partir de ${m(9)} / jour` },
];

export interface SavedLook {
  slot: string;
  title: string;
  price: number;
  h: string;
  tag: string;
  tagTone: 'clay' | 'plum' | 'dark';
  id: string;
}

export const savedLooks: SavedLook[] = [
  { slot: 'w1', title: 'Nuisette en biais, ivoire', price: 24, h: '206px', tag: 'Libre ce week-end', tagTone: 'clay', id: 'f1' },
  { slot: 'w2', title: 'Robe colonne à sequins', price: 58, h: '258px', tag: 'Réservée 18–21', tagTone: 'dark', id: 'f3' },
  { slot: 'w3', title: 'Top résille manches longues', price: 14, h: '166px', tag: 'À 1,2 km', tagTone: 'dark', id: 'f1' },
  { slot: 'w4', title: 'Manteau en laine, camel', price: 27, h: '232px', tag: 'Prix baissé', tagTone: 'plum', id: 'f2' },
  { slot: 'w5', title: 'Mini robe perlée, jais', price: 41, h: '190px', tag: 'Livraison offerte', tagTone: 'dark', id: 'f3' },
  { slot: 'w6', title: "Gants d'opéra en satin", price: 9, h: '150px', tag: 'À combiner', tagTone: 'clay', id: 'f1' },
];

export interface Thread {
  id: string;
  name: string;
  time: string;
  preview: string;
  unread: boolean;
}

export const threads: Thread[] = [
  { id: 't1', name: 'Juliette M.', time: '2 min', preview: 'Défroissée et prête — jeudi soir, ça te va ?', unread: true },
  { id: 't2', name: 'Jess T.', time: '1 h', preview: 'Tu ferais 26–29 sept. pour la veste en tweed ?', unread: true },
  { id: 't3', name: 'Yasmine K.', time: 'Hier', preview: 'Retour scanné, caution libérée — merci !', unread: false },
];

export const bubbles: { me: boolean; text: string }[] = [
  { me: false, text: 'Salut ! La robe est libre 18–21, je viens de la défroisser.' },
  { me: true, text: 'Parfait. Je fais 1,68 m — la longueur traîne ?' },
  { me: false, text: "Elle touche un peu au sol sur moi (1,70 m). Avec des talons c'est réglé. Je peux ajouter l'étole." },
  { me: true, text: 'Oui volontiers. Je réserve — en livraison, pas en main propre.' },
  { me: false, text: 'Étiquette envoyée. Le sachet retour est dans la housse.' },
];

export interface MarketBand {
  low: number;
  med: number;
  high: number;
  count: number;
  label: string;
}

export const marketData: Record<string, MarketBand> = {
  'T-shirt': { low: 3, med: 5, high: 9, count: 412, label: 'T-shirts' },
  Nuisette: { low: 14, med: 22, high: 31, count: 68, label: 'nuisettes' },
  Jean: { low: 6, med: 9, high: 15, count: 231, label: 'jeans' },
  Manteau: { low: 12, med: 20, high: 29, count: 97, label: 'manteaux' },
  'Robe de soirée': { low: 28, med: 46, high: 74, count: 156, label: 'robes de soirée' },
};

export const closetPieces = [
  { slot: 'c1', title: 'Veste en tweed courte', meta: 'Taille S · louée 6×', state: '1 demande en attente', tone: 'plum' as const, price: 32 },
  { slot: 'c2', title: 'Maxi robe en soie, olive', meta: 'Taille M · louée 11×', state: "Sortie jusqu'au 15 sept.", tone: 'clay' as const, price: 26 },
  { slot: 'c3', title: 'Bottines plateforme', meta: '39 · louées 2×', state: 'Disponible', tone: 'mute' as const, price: 15 },
];

export const reportReasons = [
  'Contrefaçon ou pièce fausse',
  "Photos qui ne sont pas les siennes",
  'Paiement hors application',
  'Harcèlement ou propos déplacés',
  'Annonce inexacte ou trompeuse',
  'Autre',
];

export const claimKinds = ['Tache ou marque', 'Déchirure ou couture', 'Pièce non rendue', 'Autre chose'];

export const ratingTags = [
  'Ponctuelle',
  'Pièce comme décrite',
  'Emballage impeccable',
  'Communication claire',
  'Flexible sur les dates',
];

export const safetyTips: Rule[] = [
  {
    title: 'Retrouvez-vous dans un lieu public',
    body: 'Cafés, halls de gare, boutiques. Les points suggérés sont ouverts et passants.',
  },
  {
    title: 'Vérifiez le code de remise',
    body: "Chacune montre un code à 4 chiffres dans l'app. Pas de code, pas de remise.",
  },
  {
    title: 'Partagez votre trajet',
    body: "Envoyez l'heure et le lieu à un proche depuis l'app, sans partager votre adresse.",
  },
  {
    title: 'Photographiez la pièce ensemble',
    body: 'Deux photos à la remise protègent les deux parties en cas de litige.',
  },
];

export const blockedAccounts = [
  { slot: 'bl1', handle: '@compte.spam', meta: 'bloqué le 2 sept. · signalé pour paiement hors app' },
  { slot: 'bl2', handle: '@fake.designer', meta: 'bloqué le 21 août · contrefaçon' },
];

export const myReviews = [
  { slot: 'rv1', name: 'Yasmine K.', stars: '★★★★★', time: 'il y a 3 j', body: 'Rendue impeccable et repassée. Locataire idéale.' },
  { slot: 'rv2', name: 'Dana P.', stars: '★★★★☆', time: 'il y a 2 sem.', body: 'Retour un jour en retard mais prévenue à l\'avance, aucun souci.' },
];

export const ratingBars = [
  { label: 'Pièce conforme', value: '5,0', w: '100%' },
  { label: 'Propreté', value: '4,9', w: '96%' },
  { label: 'Communication', value: '5,0', w: '100%' },
  { label: 'Remise et retour', value: '4,8', w: '92%' },
];

export const itemReviews = [
  {
    slot: 'irv1',
    name: 'Maya D.',
    meta: 'louée 3 jours · sept. 2026',
    stars: '★★★★★',
    body: 'Arrivée repassée dans une housse. Portée à un mariage, repartie le lundi dans le sachet retour.',
    tags: ['Comme sur les photos', 'Prêteuse ponctuelle'],
  },
  {
    slot: 'irv2',
    name: 'Inès R.',
    meta: 'louée 2 jours · août 2026',
    stars: '★★★★☆',
    body: "Impeccable, un fil tiré à l'ourlet signalé avant la location — rien de gênant. Remise en main propre en 5 minutes.",
    tags: ['État conforme', 'Remise facile'],
  },
];

export const listSteps = [
  {
    label: 'Étape 1 sur 3',
    title: 'Montrez-la en mouvement',
    body: "Une vidéo verticale et deux photos. C'est la vidéo qui fait scroller.",
  },
  {
    label: 'Étape 2 sur 3',
    title: 'Ce que les locataires demandent',
    body: 'Marque, taille réelle, et comment ça tombe sur vous.',
  },
  {
    label: 'Étape 3 sur 3',
    title: 'Prix et disponibilité',
    body: 'On suggère un tarif à partir de ce que gagnent les pièces similaires près de vous.',
  },
];

import type { PayMethod } from '../state/types';

export const payMethods: { key: PayMethod; label: string; detail: string }[] = [
  { key: 'applepay', label: 'Apple Pay', detail: 'Face ID · carte par défaut' },
  { key: 'googlepay', label: 'Google Pay', detail: 'Compte Google' },
  { key: 'paypal', label: 'PayPal', detail: 'camille@exemple.fr' },
  { key: 'card', label: 'Carte bancaire', detail: 'Visa, Mastercard, CB' },
  { key: 'wallet', label: 'Porte-monnaie Rota', detail: 'Solde de vos locations' },
];

export const identityDocs: { key: 'cni' | 'passport' | 'licence'; label: string; detail: string }[] = [
  { key: 'cni', label: "Carte nationale d'identité", detail: 'Recto et verso' },
  { key: 'passport', label: 'Passeport', detail: 'Page photo' },
  { key: 'licence', label: 'Permis de conduire', detail: 'Recto et verso' },
];

/** Accepted proof that a branded piece is genuine, as on Vinted. */
export const authenticityProofs = [
  {
    key: 'receipt',
    label: 'Facture ou ticket de caisse',
    body: "Photo du ticket ou de la facture, avec la marque et la date lisibles. Masquez votre numéro de carte.",
  },
  {
    key: 'tag',
    label: 'Étiquette de la pièce',
    body: 'Photo nette de l’étiquette intérieure : marque, taille, composition et numéro de série.',
  },
  {
    key: 'extras',
    label: 'Preuves complémentaires',
    body: 'Carte d’authenticité, dustbag, boîte, e-mail de confirmation de commande.',
  },
];

export const helpTopics = [
  { label: 'Louer une pièce', detail: 'Dates, remise, retour' },
  { label: 'Mettre en location', detail: 'Photos, prix, règles' },
  { label: 'Paiements et versements', detail: 'Moyens de paiement, délais' },
  { label: 'Dommages et litiges', detail: 'Protection, caution' },
  { label: 'Authenticité et contrefaçons', detail: 'Preuves acceptées' },
  { label: 'Compte et sécurité', detail: 'Mot de passe, 2FA, identité' },
];

export const claimSteps = [
  {
    label: 'Étape 1 sur 3',
    title: "Qu'est-ce qui s'est passé ?",
    body: 'Signalez dans les 24 h après le retour pour rester couvert.',
  },
  {
    label: 'Étape 2 sur 3',
    title: 'Montrez les dégâts',
    body: 'Deux photos minimum, dont une de près. Les photos du jour du retour sont acceptées.',
  },
  {
    label: 'Étape 3 sur 3',
    title: 'Ce qui se passe ensuite',
    body: "Notre équipe répond en 48 h. La caution reste bloquée pendant l'examen, sans prélèvement automatique.",
  },
];
