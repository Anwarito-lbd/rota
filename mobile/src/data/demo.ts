/**
 * Demo mode: what the app shows when mobile/.env has no Supabase project.
 * Everything here stays on the phone and is reset when the app restarts.
 * Real members, posts and rentals only ever come from Supabase.
 */
import type { Listing } from './listings';
import { SEED_LISTINGS, SEED_USERS } from './seed';

export const DEMO_ME = {
  id: 'u_demo',
  username: 'demo.rota',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
};

const img = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export interface DemoMember {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  bio: string;
  certified: boolean;
  identityVerified: boolean;
}

export const DEMO_MEMBERS: DemoMember[] = SEED_USERS.map((u, i) => ({
  id: u.id,
  username: u.handle,
  name: u.name,
  avatar: u.avatarUrl ?? null,
  bio: u.bio ?? '',
  certified: u.certified,
  // Every other member has finished the Stripe Identity check.
  identityVerified: u.certified || i % 2 === 0,
}));

const memberById = (id: string) => DEMO_MEMBERS.find((m) => m.id === id) ?? DEMO_MEMBERS[0];

export const DEMO_LISTINGS: Listing[] = SEED_LISTINGS.map((s, i) => {
  const owner = memberById(s.ownerId);
  return {
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    brand: s.brand,
    category: s.category,
    categoryId: null,
    sizeFit: 0,
    sizes: [s.size],
    occasion: s.occasion,
    price: s.pricePerDay,
    retail: s.retail,
    approvedValue: s.retail,
    valueStatus: 'approved',
    city: s.neighborhood || s.city,
    rules: s.rules,
    cleaning: { byLender: s.cleaningByLender, fee: s.cleaningFee },
    acceptOffers: true,
    minOffer: Math.round(s.pricePerDay * 0.8),
    instantBook: s.instantBook,
    authenticity: s.authenticity ? 'verified' : 'none',
    photos: s.media.filter((m) => m.kind === 'image').map((m) => m.url),
    video: null,
    distribution: 'public',
    distributionReason: null,
    distributionNote: null,
    createdAt: new Date(Date.now() - i * 36e5 * 7).toISOString(),
    owner: {
      username: owner.username,
      avatar: owner.avatar,
      certified: owner.certified,
      identityVerified: owner.identityVerified,
    },
  };
});

/** Approximate areas, already on the ~550 m grid the server enforces. */
const AREAS = {
  marais: { lat: 48.86, lng: 2.36, label: 'Le Marais' },
  onzieme: { lat: 48.86, lng: 2.38, label: 'Paris 11e' },
  pigalle: { lat: 48.88, lng: 2.335, label: 'Pigalle' },
  sgp: { lat: 48.855, lng: 2.335, label: 'Saint-Germain' },
  canal: { lat: 48.87, lng: 2.365, label: 'Canal Saint-Martin' },
  belleville: { lat: 48.87, lng: 2.385, label: 'Belleville' },
  batignolles: { lat: 48.885, lng: 2.315, label: 'Batignolles' },
  bastille: { lat: 48.855, lng: 2.37, label: 'Bastille' },
} as const;

export interface DemoPostSeed {
  id: string;
  authorId: string;
  kind: 'fit' | 'dump';
  photos: string[];
  caption: string;
  challengeId: string | null;
  area: { lat: number; lng: number; label: string } | null;
  tags: { listingId: string; mediaIndex: number; x: number; y: number }[];
  likes: number;
  hoursAgo: number;
}

export const DEMO_POSTS: DemoPostSeed[] = [
  {
    id: 'p1',
    authorId: 'u_camille',
    kind: 'fit',
    photos: [img('photo-1595777457583-95e059d581b8')],
    caption: 'Dîner rue de Charonne, nuisette en biais et rien d’autre. #fitduvendredi',
    challengeId: 'fit-du-vendredi',
    area: AREAS.onzieme,
    tags: [{ listingId: 'f1', mediaIndex: 0, x: 0.52, y: 0.46 }],
    likes: 1284,
    hoursAgo: 2,
  },
  {
    id: 'p2',
    authorId: 'u_yasmine',
    kind: 'dump',
    photos: [
      img('photo-1551028719-00167b16eac5'),
      img('photo-1521223890158-f9f7c3d5d504'),
      img('photo-1541099649105-f69ad21f3246'),
      img('photo-1584917865442-de89df76afd3'),
    ],
    caption: 'Dump de la semaine : trench cuir, jean archive, baguette satin. Trois looks, zéro achat.',
    challengeId: 'dump-de-la-semaine',
    area: AREAS.marais,
    tags: [
      { listingId: 'f2', mediaIndex: 0, x: 0.5, y: 0.42 },
      { listingId: 'f9', mediaIndex: 2, x: 0.46, y: 0.62 },
      { listingId: 'f10', mediaIndex: 3, x: 0.55, y: 0.5 },
    ],
    likes: 3920,
    hoursAgo: 5,
  },
  {
    id: 'p3',
    authorId: 'u_juliette',
    kind: 'fit',
    photos: [img('photo-1566174053879-31528523f8ae')],
    caption: 'Gala au Palais de Tokyo. Sequins loués pour la soirée, rendus le lendemain midi.',
    challengeId: 'soiree',
    area: AREAS.pigalle,
    tags: [{ listingId: 'f3', mediaIndex: 0, x: 0.5, y: 0.5 }],
    likes: 8710,
    hoursAgo: 9,
  },
  {
    id: 'p4',
    authorId: 'u_lea',
    kind: 'fit',
    photos: [img('photo-1591369822096-ffd140ec948f')],
    caption: 'Blazer velours prune, le vendredi c’est permis. #fitduvendredi',
    challengeId: 'fit-du-vendredi',
    area: AREAS.bastille,
    tags: [{ listingId: 'f4', mediaIndex: 0, x: 0.48, y: 0.4 }],
    likes: 642,
    hoursAgo: 14,
  },
  {
    id: 'p5',
    authorId: 'u_manon',
    kind: 'dump',
    photos: [
      img('photo-1572804013309-59a88b7e92f1'),
      img('photo-1496747611176-843222e1e57c'),
      img('photo-1543163521-1bf539c55dd2'),
    ],
    caption: 'Mariage à Saint-Germain : mini robe perlée + sandales nude. Dump complet.',
    challengeId: 'dump-de-la-semaine',
    area: AREAS.sgp,
    tags: [
      { listingId: 'f5', mediaIndex: 0, x: 0.5, y: 0.48 },
      { listingId: 'f11', mediaIndex: 2, x: 0.5, y: 0.6 },
    ],
    likes: 2210,
    hoursAgo: 20,
  },
  {
    id: 'p6',
    authorId: 'u_camille',
    kind: 'fit',
    photos: [img('photo-1539533018447-63fcce2678e3')],
    caption: 'Manteau camel, jean, baskets. L’uniforme de novembre.',
    challengeId: null,
    area: AREAS.canal,
    tags: [{ listingId: 'f7', mediaIndex: 0, x: 0.5, y: 0.45 }],
    likes: 930,
    hoursAgo: 26,
  },
  {
    id: 'p7',
    authorId: 'u_yasmine',
    kind: 'fit',
    photos: [img('photo-1490481651871-ab68de25d43d')],
    caption: 'Plumes champagne pour un anniversaire. Je n’aurais jamais acheté ça.',
    challengeId: 'soiree',
    area: AREAS.belleville,
    tags: [{ listingId: 'f8', mediaIndex: 0, x: 0.5, y: 0.52 }],
    likes: 1570,
    hoursAgo: 31,
  },
  {
    id: 'p8',
    authorId: 'u_juliette',
    kind: 'dump',
    photos: [
      img('photo-1483985988355-763728e1935b'),
      img('photo-1469334031218-e382a71b716b'),
      img('photo-1515372039744-b8f02a3ae446'),
    ],
    caption: 'Fashion week off : résille, archives et beaucoup de marche.',
    challengeId: 'dump-de-la-semaine',
    area: AREAS.marais,
    tags: [{ listingId: 'f6', mediaIndex: 0, x: 0.5, y: 0.44 }],
    likes: 4402,
    hoursAgo: 40,
  },
  {
    id: 'p9',
    authorId: 'u_lea',
    kind: 'fit',
    photos: [img('photo-1591047139829-d91aecb6caea')],
    caption: 'Tweed court et bottes. Loué pour un entretien, gardé pour le verre après.',
    challengeId: 'fit-du-vendredi',
    area: AREAS.batignolles,
    tags: [{ listingId: 'f12', mediaIndex: 0, x: 0.5, y: 0.42 }],
    likes: 388,
    hoursAgo: 52,
  },
  {
    id: 'p10',
    authorId: 'u_manon',
    kind: 'fit',
    photos: [img('photo-1515347619252-60a4bf4fff4f')],
    caption: 'Détail sandales. Pointure 38, dispo ce week-end.',
    challengeId: null,
    area: AREAS.sgp,
    tags: [{ listingId: 'f11', mediaIndex: 0, x: 0.5, y: 0.55 }],
    likes: 212,
    hoursAgo: 70,
  },
];

export const DEMO_COMMENTS: Record<string, { authorId: string; body: string; minutesAgo: number; rating: number }[]> = {
  p1: [
    { authorId: 'u_juliette', body: 'Superbe coupe en biais, elle tombe parfaitement.', minutesAgo: 40, rating: 5 },
    { authorId: 'u_lea', body: 'Je l’ai louée le mois dernier, la soie est incroyable.', minutesAgo: 22, rating: 5 },
  ],
  p2: [
    { authorId: 'u_camille', body: 'Le jean archive taille un peu grand, prenez une taille en dessous.', minutesAgo: 180, rating: 4 },
    { authorId: 'u_manon', body: 'Dump parfait, je vole le trench', minutesAgo: 95, rating: 5 },
  ],
  p3: [{ authorId: 'u_yasmine', body: 'Iconique.', minutesAgo: 300, rating: 5 }],
  p5: [{ authorId: 'u_juliette', body: 'Les sandales avec la perlée, validé', minutesAgo: 600, rating: 4 }],
};

/** Members the demo account already follows. */
export const DEMO_FOLLOWING = ['u_camille', 'u_juliette'];
