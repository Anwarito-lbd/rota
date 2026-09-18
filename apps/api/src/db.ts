import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.ROTA_DB_PATH || path.join(dataDir, 'rota.sqlite');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      handle TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Paris',
      bio TEXT,
      avatar_url TEXT,
      certified INTEGER NOT NULL DEFAULT 0,
      founding_closet INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      brand TEXT NOT NULL,
      description TEXT NOT NULL,
      price_per_day REAL NOT NULL,
      retail REAL NOT NULL,
      size TEXT NOT NULL,
      category TEXT NOT NULL,
      occasion TEXT NOT NULL,
      city TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      media_json TEXT NOT NULL,
      badge TEXT,
      worn_count INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 5,
      authenticity TEXT,
      cleaning_by_lender INTEGER NOT NULL DEFAULT 0,
      cleaning_fee REAL NOT NULL DEFAULT 0,
      rules_json TEXT NOT NULL,
      instant_book INTEGER NOT NULL DEFAULT 1,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      renter_id TEXT NOT NULL REFERENCES users(id),
      lender_id TEXT NOT NULL REFERENCES users(id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      delivery TEXT NOT NULL,
      status TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      deposit_cents INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
