import { createHash, randomBytes } from 'node:crypto';
import { SEED_LISTINGS, SEED_USERS } from '@rota/shared';
import { db, migrate } from './db.js';

function hashPassword(pw: string) {
  const salt = 'rota-mvp-v1';
  return createHash('sha256').update(`${salt}:${pw}`).digest('hex');
}

migrate();

const clear = db.transaction(() => {
  db.exec('DELETE FROM bookings; DELETE FROM sessions; DELETE FROM listings; DELETE FROM users;');
});
clear();

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, handle, name, city, bio, avatar_url, certified, founding_closet, created_at)
  VALUES (@id, @email, @password_hash, @handle, @name, @city, @bio, @avatar_url, @certified, @founding_closet, @created_at)
`);

const insertListing = db.prepare(`
  INSERT INTO listings (
    id, owner_id, title, brand, description, price_per_day, retail, size, category, occasion,
    city, neighborhood, media_json, badge, worn_count, rating, authenticity,
    cleaning_by_lender, cleaning_fee, rules_json, instant_book, likes, created_at
  ) VALUES (
    @id, @owner_id, @title, @brand, @description, @price_per_day, @retail, @size, @category, @occasion,
    @city, @neighborhood, @media_json, @badge, @worn_count, @rating, @authenticity,
    @cleaning_by_lender, @cleaning_fee, @rules_json, @instant_book, @likes, @created_at
  )
`);

const seedTx = db.transaction(() => {
  for (const u of SEED_USERS) {
    insertUser.run({
      id: u.id,
      email: u.email,
      password_hash: hashPassword('rota1234'),
      handle: u.handle,
      name: u.name,
      city: u.city,
      bio: u.bio ?? null,
      avatar_url: u.avatarUrl ?? null,
      certified: u.certified ? 1 : 0,
      founding_closet: u.foundingCloset ? 1 : 0,
      created_at: u.createdAt,
    });
  }

  const now = new Date().toISOString();
  for (const l of SEED_LISTINGS) {
    insertListing.run({
      id: l.id,
      owner_id: l.ownerId,
      title: l.title,
      brand: l.brand,
      description: l.description,
      price_per_day: l.pricePerDay,
      retail: l.retail,
      size: l.size,
      category: l.category,
      occasion: l.occasion,
      city: l.city,
      neighborhood: l.neighborhood,
      media_json: JSON.stringify(l.media),
      badge: l.badge ?? null,
      worn_count: l.wornCount,
      rating: l.rating,
      authenticity: l.authenticity,
      cleaning_by_lender: l.cleaningByLender ? 1 : 0,
      cleaning_fee: l.cleaningFee,
      rules_json: JSON.stringify(l.rules),
      instant_book: l.instantBook ? 1 : 0,
      likes: l.likes,
      created_at: now,
    });
  }
});

seedTx();

console.log(`Seeded ${SEED_USERS.length} users and ${SEED_LISTINGS.length} listings.`);
console.log('Demo login: demo@rota.app / rota1234');
console.log(`Token helper salt ok (${randomBytes(4).toString('hex')})`);
