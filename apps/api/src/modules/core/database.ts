import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** DI token for the shared SQLite connection. */
export const SQLITE_DB = Symbol("SQLITE_DB");

/** A generic SQLite row (column name -> value). */
export type Row = Record<string, string | number | null>;

export interface Migration {
  id: string;
  up: string;
}

/**
 * Ordered schema migrations. Append new entries — never edit applied ones.
 * Each runs once, inside a transaction, tracked in `schema_migrations`.
 */
export const MIGRATIONS: Migration[] = [
  {
    id: "0001_init",
    up: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        name TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE drivers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        online INTEGER NOT NULL DEFAULT 0,
        rating REAL NOT NULL DEFAULT 5,
        acceptance_rate REAL NOT NULL DEFAULT 100,
        location_json TEXT,
        vehicle_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE memberships (
        driver_id TEXT PRIMARY KEY,
        id TEXT NOT NULL,
        plan TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE rides (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        rider_id TEXT NOT NULL,
        driver_id TEXT,
        pickup_json TEXT NOT NULL,
        dropoff_json TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        fare REAL NOT NULL,
        estimate_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        accepted_at TEXT,
        completed_at TEXT,
        cancelled_at TEXT,
        events_json TEXT NOT NULL
      );

      CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        created_at TEXT NOT NULL,
        ride_id TEXT,
        rider_id TEXT,
        driver_id TEXT,
        plan TEXT
      );

      CREATE TABLE ledger (
        id TEXT PRIMARY KEY,
        driver_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        ride_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_rides_status ON rides(status);
      CREATE INDEX idx_rides_driver ON rides(driver_id);
      CREATE INDEX idx_ledger_driver ON ledger(driver_id);
      CREATE INDEX idx_payments_type ON payments(type);
    `,
  },
];

/** Resolve the SQLite file path from env, defaulting to ./data/todo.db (cwd). */
export function resolveDbPath(): string {
  const fromEnv = process.env.SQLITE_PATH;
  if (fromEnv && fromEnv !== ":memory:") return resolve(fromEnv);
  if (fromEnv === ":memory:") return ":memory:";
  return resolve(process.cwd(), "data", "todo.db");
}

/** Open (creating dirs as needed), configure, and migrate a SQLite database. */
export function openDatabase(path: string = resolveDbPath()): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  runMigrations(db);
  return db;
}

/** Apply any pending migrations in order, each in its own transaction. */
export function runMigrations(db: DatabaseSync): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const appliedRows = db.prepare("SELECT id FROM schema_migrations").all() as Row[];
  const applied = new Set(appliedRows.map((r) => String(r.id)));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(migration.up);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
