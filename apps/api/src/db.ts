import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.ROTA_DB_PATH || path.join(dataDir, 'rota.sqlite');

/**
 * Thin better-sqlite3-compatible wrapper over Node's built-in `node:sqlite`
 * (DatabaseSync). Requires Node.js 22.5+ (stable/unflagged from 22.13+;
 * Node 24 on Windows includes it — no Visual Studio / native compile).
 */
type SqlParams = unknown[];

type StatementLike = {
  get(...params: SqlParams): unknown;
  all(...params: SqlParams): unknown[];
  run(...params: SqlParams): { changes: number | bigint; lastInsertRowid: number | bigint };
};

type DbLike = {
  exec(sql: string): void;
  prepare(sql: string): StatementLike;
  pragma(pragma: string): void;
  transaction<T>(fn: () => T): () => T;
};

function wrapDatabase(raw: DatabaseSync): DbLike {
  return {
    exec(sql: string) {
      raw.exec(sql);
    },
    prepare(sql: string): StatementLike {
      const stmt = raw.prepare(sql);
      return {
        get(...params: SqlParams) {
          return stmt.get(...(params as never[]));
        },
        all(...params: SqlParams) {
          return stmt.all(...(params as never[])) as unknown[];
        },
        run(...params: SqlParams) {
          return stmt.run(...(params as never[]));
        },
      };
    },
    pragma(pragma: string) {
      // better-sqlite3: db.pragma('journal_mode = WAL')
      raw.exec(`PRAGMA ${pragma}`);
    },
    transaction<T>(fn: () => T): () => T {
      return () => {
        raw.exec('BEGIN');
        try {
          const result = fn();
          raw.exec('COMMIT');
          return result;
        } catch (err) {
          try {
            raw.exec('ROLLBACK');
          } catch {
            /* ignore rollback errors */
          }
          throw err;
        }
      };
    },
  };
}

const raw = new DatabaseSync(dbPath);
export const db = wrapDatabase(raw);
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
