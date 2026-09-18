import { createHash, randomBytes } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { FEES } from '@rota/shared';
import { db, migrate } from './db.js';

migrate();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 8787);
const STRIPE_PUBLISHABLE = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_rota_placeholder';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || 'sk_test_rota_placeholder';

function hashPassword(pw: string) {
  return createHash('sha256').update(`rota-mvp-v1:${pw}`).digest('hex');
}

function mapUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    handle: row.handle,
    name: row.name,
    city: row.city,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    certified: !!row.certified,
    foundingCloset: !!row.founding_closet,
    createdAt: row.created_at,
  };
}

function mapListing(row: any) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    brand: row.brand,
    description: row.description,
    pricePerDay: row.price_per_day,
    retail: row.retail,
    size: row.size,
    category: row.category,
    occasion: row.occasion,
    city: row.city,
    neighborhood: row.neighborhood,
    media: JSON.parse(row.media_json),
    badge: row.badge ?? undefined,
    wornCount: row.worn_count,
    rating: row.rating,
    authenticity: row.authenticity,
    cleaningByLender: !!row.cleaning_by_lender,
    cleaningFee: row.cleaning_fee,
    rules: JSON.parse(row.rules_json),
    instantBook: !!row.instant_book,
    likes: row.likes,
    createdAt: row.created_at,
    owner: row.owner_handle
      ? {
          id: row.owner_id,
          handle: row.owner_handle,
          name: row.owner_name,
          avatarUrl: row.owner_avatar ?? undefined,
          certified: !!row.owner_certified,
          foundingCloset: !!row.owner_founding,
        }
      : undefined,
  };
}

function mapBooking(row: any) {
  return {
    id: row.id,
    listingId: row.listing_id,
    renterId: row.renter_id,
    lenderId: row.lender_id,
    startDate: row.start_date,
    endDate: row.end_date,
    delivery: row.delivery,
    status: row.status,
    totalCents: row.total_cents,
    depositCents: row.deposit_cents,
    createdAt: row.created_at,
    listingTitle: row.listing_title,
    listingMedia: row.media_json ? JSON.parse(row.media_json) : undefined,
  };
}

function authUser(req: express.Request) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as any;
  return row ? mapUser(row) : null;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'rota-api', stripeConfigured: !STRIPE_SECRET.includes('placeholder') });
});

app.get('/config', (_req, res) => {
  res.json({
    stripePublishableKey: STRIPE_PUBLISHABLE,
    fees: FEES,
    city: 'Paris',
    locale: 'fr-FR',
  });
});

app.post('/auth/signup', (req, res) => {
  const { email, password, name, handle } = req.body || {};
  if (!email || !password || !name || !handle) {
    return res.status(400).json({ error: 'email, password, name et handle requis' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR handle = ?').get(email, handle);
  if (existing) return res.status(409).json({ error: 'Email ou handle déjà utilisé' });

  const id = `u_${randomBytes(6).toString('hex')}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, handle, name, city, bio, avatar_url, certified, founding_closet, created_at)
     VALUES (?, ?, ?, ?, ?, 'Paris', ?, NULL, 0, 0, ?)`,
  ).run(id, email.toLowerCase(), hashPassword(password), handle.replace(/^@/, ''), name, 'Nouveau sur Rota', createdAt);

  const token = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, id, createdAt);
  const user = mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  res.json({ token, user });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email et password requis' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase()) as any;
  if (!row || row.password_hash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  const token = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    row.id,
    new Date().toISOString(),
  );
  res.json({ token, user: mapUser(row) });
});

app.post('/auth/magic-link', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email requis' });
  let row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase()) as any;
  if (!row) {
    const id = `u_${randomBytes(6).toString('hex')}`;
    const handle = String(email).split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'member';
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, handle, name, city, bio, avatar_url, certified, founding_closet, created_at)
       VALUES (?, ?, ?, ?, ?, 'Paris', 'Via lien magique', NULL, 0, 0, ?)`,
    ).run(id, String(email).toLowerCase(), hashPassword(randomBytes(8).toString('hex')), handle, handle, createdAt);
    row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  const token = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    row.id,
    new Date().toISOString(),
  );
  // MVP: return token directly (no email send). Documented as stub.
  res.json({ token, user: mapUser(row), note: 'MVP: lien magique simulé — session créée immédiatement' });
});

app.get('/auth/me', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  res.json({ user });
});

app.post('/auth/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

const listingSelect = `
  SELECT l.*, u.handle AS owner_handle, u.name AS owner_name, u.avatar_url AS owner_avatar,
         u.certified AS owner_certified, u.founding_closet AS owner_founding
  FROM listings l JOIN users u ON u.id = l.owner_id
`;

app.get('/listings', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  const occasion = String(req.query.occasion || '').trim();
  let rows = db.prepare(`${listingSelect} ORDER BY l.likes DESC`).all() as any[];
  if (q) {
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.neighborhood.toLowerCase().includes(q) ||
        r.owner_handle.toLowerCase().includes(q),
    );
  }
  if (category) rows = rows.filter((r) => r.category === category);
  if (occasion) rows = rows.filter((r) => r.occasion === occasion);
  res.json({ listings: rows.map(mapListing) });
});

app.get('/listings/:id', (req, res) => {
  const row = db.prepare(`${listingSelect} WHERE l.id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Pièce introuvable' });
  res.json({ listing: mapListing(row) });
});

app.post('/listings', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const b = req.body || {};
  if (!b.title || !b.brand || !b.pricePerDay || !b.size) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const id = `f_${randomBytes(5).toString('hex')}`;
  const createdAt = new Date().toISOString();
  const media = b.media?.length
    ? b.media
    : [{ url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80', kind: 'image' }];
  db.prepare(
    `INSERT INTO listings (
      id, owner_id, title, brand, description, price_per_day, retail, size, category, occasion,
      city, neighborhood, media_json, badge, worn_count, rating, authenticity,
      cleaning_by_lender, cleaning_fee, rules_json, instant_book, likes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paris', ?, ?, ?, 0, 5, ?, ?, ?, ?, 1, 0, ?)`,
  ).run(
    id,
    user.id,
    b.title,
    b.brand,
    b.description || '',
    Number(b.pricePerDay),
    Number(b.retail || b.pricePerDay * 10),
    b.size,
    b.category || 'Robes',
    b.occasion || 'Tous les jours',
    b.neighborhood || 'Paris',
    JSON.stringify(media),
    b.badge || null,
    b.authenticity || null,
    b.cleaningByLender ? 1 : 0,
    Number(b.cleaningFee || 0),
    JSON.stringify(b.rules || ['Retour propre', 'Paiement in-app uniquement']),
    createdAt,
  );
  const row = db.prepare(`${listingSelect} WHERE l.id = ?`).get(id);
  res.status(201).json({ listing: mapListing(row) });
});

app.get('/users/:handle', (req, res) => {
  const handle = req.params.handle.replace(/^@/, '');
  const row = db.prepare('SELECT * FROM users WHERE handle = ?').get(handle) as any;
  if (!row) return res.status(404).json({ error: 'Profil introuvable' });
  const listings = db
    .prepare(`${listingSelect} WHERE l.owner_id = ? ORDER BY l.created_at DESC`)
    .all(row.id)
    .map(mapListing);
  res.json({ user: mapUser(row), listings });
});

app.post('/bookings', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const { listingId, startDate, endDate, delivery } = req.body || {};
  if (!listingId || !startDate || !endDate) {
    return res.status(400).json({ error: 'listingId, startDate, endDate requis' });
  }
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(listingId) as any;
  if (!listing) return res.status(404).json({ error: 'Pièce introuvable' });
  if (listing.owner_id === user.id) return res.status(400).json({ error: 'Vous ne pouvez pas louer votre propre pièce' });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const rental = listing.price_per_day * days;
  const cleaning = listing.cleaning_by_lender ? listing.cleaning_fee : 0;
  // Shipping paid by renter unless listing badge grants free shipping
  const freeShip = String(listing.badge || '').toLowerCase().includes('livraison offerte');
  const shipping = delivery === 'ship' && !freeShip ? FEES.shipping : 0;
  const total = Math.round((rental + cleaning + shipping + FEES.cover) * 100);
  const deposit = Math.round(FEES.deposit * 100); // €150 default (prototype FEES.deposit)

  const id = `b_${randomBytes(6).toString('hex')}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO bookings (id, listing_id, renter_id, lender_id, start_date, end_date, delivery, status, total_cents, deposit_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
  ).run(id, listingId, user.id, listing.owner_id, startDate, endDate, delivery === 'ship' ? 'ship' : 'meet', total, deposit, createdAt);

  const row = db
    .prepare(
      `SELECT b.*, l.title AS listing_title, l.media_json FROM bookings b JOIN listings l ON l.id = b.listing_id WHERE b.id = ?`,
    )
    .get(id);
  res.status(201).json({
    booking: mapBooking(row),
    checkout: {
      mode: 'stripe_test_stub',
      publishableKey: STRIPE_PUBLISHABLE,
      clientSecret: `pi_test_${id}_secret`,
      amountCents: total,
      depositCents: deposit,
      currency: 'eur',
      note: 'Checkout Stripe en mode test stub — brancher PaymentIntent réel avec STRIPE_SECRET_KEY',
    },
  });
});

app.get('/bookings', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const tab = String(req.query.tab || 'renting');
  const sql =
    tab === 'lending'
      ? `SELECT b.*, l.title AS listing_title, l.media_json FROM bookings b JOIN listings l ON l.id = b.listing_id WHERE b.lender_id = ? ORDER BY b.created_at DESC`
      : `SELECT b.*, l.title AS listing_title, l.media_json FROM bookings b JOIN listings l ON l.id = b.listing_id WHERE b.renter_id = ? ORDER BY b.created_at DESC`;
  const rows = db.prepare(sql).all(user.id).map(mapBooking);
  res.json({ bookings: rows });
});

app.get('/closet', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const listings = db
    .prepare(`${listingSelect} WHERE l.owner_id = ? ORDER BY l.created_at DESC`)
    .all(user.id)
    .map(mapListing);
  res.json({ listings });
});

app.post('/checkout/confirm', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  const { bookingId } = req.body || {};
  const row = db.prepare('SELECT * FROM bookings WHERE id = ? AND renter_id = ?').get(bookingId, user.id) as any;
  if (!row) return res.status(404).json({ error: 'Réservation introuvable' });
  db.prepare(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`).run(bookingId);
  res.json({
    ok: true,
    paymentIntentId: `pi_test_${bookingId}`,
    status: 'succeeded',
    note: 'Paiement simulé (Stripe test stub)',
  });
});

app.get('/referral', (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié' });
  res.json({
    code: `ROTA-${user.handle.toUpperCase().slice(0, 8)}`,
    shareUrl: `https://rota.app/u/${user.handle}`,
    foundingCloset: user.foundingCloset,
    rewardEur: 15,
    message: user.foundingCloset
      ? 'Badge Closet fondateur actif — invitez 3 amies à Paris.'
      : 'Parrainez des closets à Paris et débloquez le badge Closet fondateur.',
  });
});

app.listen(PORT, () => {
  console.log(`Rota API listening on http://localhost:${PORT}`);
});
