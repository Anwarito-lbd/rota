/**
 * Local SQLite catalog (expo-sqlite) — works offline; API syncs when available.
 */
import * as SQLite from 'expo-sqlite';
import { SEED_LISTINGS, SEED_USERS, type Listing, type User } from '@rota/shared';

let db: SQLite.SQLiteDatabase | null = null;
let ready = false;

export async function getDb() {
  if (!db) db = await SQLite.openDatabaseAsync('rota.db');
  return db;
}

export async function initLocalDb() {
  if (ready) return;
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const seeded = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'seeded'`,
  );
  if (!seeded) {
    const now = new Date().toISOString();
    for (const u of SEED_USERS) {
      await database.runAsync(`INSERT OR REPLACE INTO users (id, payload) VALUES (?, ?)`, [
        u.id,
        JSON.stringify(u),
      ]);
    }
    for (const l of SEED_LISTINGS) {
      const full: Listing = { ...l, createdAt: now };
      await database.runAsync(`INSERT OR REPLACE INTO listings (id, payload) VALUES (?, ?)`, [
        l.id,
        JSON.stringify(full),
      ]);
    }
    await database.runAsync(`INSERT INTO meta (key, value) VALUES ('seeded', '1')`);
  }
  ready = true;
}

export async function localListings(filters?: {
  q?: string;
  category?: string;
  occasion?: string;
}): Promise<Listing[]> {
  await initLocalDb();
  const database = await getDb();
  const rows = await database.getAllAsync<{ payload: string }>(`SELECT payload FROM listings`);
  let list = rows.map((r) => JSON.parse(r.payload) as Listing);
  const q = filters?.q?.toLowerCase().trim();
  if (q) {
    list = list.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.brand.toLowerCase().includes(q) ||
        l.neighborhood.toLowerCase().includes(q),
    );
  }
  if (filters?.category) list = list.filter((l) => l.category === filters.category);
  if (filters?.occasion) list = list.filter((l) => l.occasion === filters.occasion);
  return list.sort((a, b) => b.likes - a.likes);
}

export async function localListing(id: string): Promise<Listing | null> {
  await initLocalDb();
  const database = await getDb();
  const row = await database.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM listings WHERE id = ?`,
    [id],
  );
  return row ? (JSON.parse(row.payload) as Listing) : null;
}

export async function localUser(id: string): Promise<User | null> {
  await initLocalDb();
  const database = await getDb();
  const row = await database.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM users WHERE id = ?`,
    [id],
  );
  return row ? (JSON.parse(row.payload) as User) : null;
}

export async function localUserByHandle(handle: string): Promise<User | null> {
  await initLocalDb();
  const database = await getDb();
  const rows = await database.getAllAsync<{ payload: string }>(`SELECT payload FROM users`);
  const h = handle.replace(/^@/, '');
  for (const r of rows) {
    const u = JSON.parse(r.payload) as User;
    if (u.handle === h) return u;
  }
  return null;
}

export async function saveLocalListing(listing: Listing) {
  await initLocalDb();
  const database = await getDb();
  await database.runAsync(`INSERT OR REPLACE INTO listings (id, payload) VALUES (?, ?)`, [
    listing.id,
    JSON.stringify(listing),
  ]);
}

export async function saveLocalBooking(booking: unknown) {
  await initLocalDb();
  const database = await getDb();
  const b = booking as { id: string };
  await database.runAsync(`INSERT OR REPLACE INTO bookings (id, payload) VALUES (?, ?)`, [
    b.id,
    JSON.stringify(booking),
  ]);
}

export async function localBookings(): Promise<any[]> {
  await initLocalDb();
  const database = await getDb();
  const rows = await database.getAllAsync<{ payload: string }>(`SELECT payload FROM bookings`);
  return rows.map((r) => JSON.parse(r.payload));
}

export async function listingsByOwner(ownerId: string): Promise<Listing[]> {
  const all = await localListings();
  return all.filter((l) => l.ownerId === ownerId);
}
