/**
 * Create a local backup + JSON export of the SQLite database.
 *
 * Build first, then run:  pnpm --filter @todo/api db:backup
 * (equivalently: node dist/apps/api/src/scripts/backup.js)
 *
 * Outputs go under <dataDir>/backups and <dataDir>/exports. Upload these to
 * the Google Drive backup/export folders configured in your environment —
 * Google Drive is for backups/exports only, never the primary database.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { openDatabase, resolveDbPath, Row } from "../modules/core/database";

const TABLES = ["users", "drivers", "memberships", "rides", "payments", "ledger"];

function backup() {
  const path = resolveDbPath();
  const dataDir = dirname(path);
  const db = openDatabase(path);

  // Fold the WAL back into the main file so the copied .db is self-contained.
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");

  const dump: Record<string, Row[]> = {};
  for (const table of TABLES) {
    dump[table] = db.prepare(`SELECT * FROM ${table}`).all() as Row[];
  }
  db.close();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupsDir = join(dataDir, "backups");
  const exportsDir = join(dataDir, "exports");
  mkdirSync(backupsDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });

  const dbBackup = join(backupsDir, `todo-${stamp}.db`);
  const jsonExport = join(exportsDir, `todo-export-${stamp}.json`);
  copyFileSync(path, dbBackup);
  writeFileSync(jsonExport, JSON.stringify({ generatedAt: new Date().toISOString(), tables: dump }, null, 2));

  const counts = Object.fromEntries(TABLES.map((t) => [t, dump[t].length]));
  console.log("Backup complete.");
  console.log(`  DB snapshot : ${dbBackup}`);
  console.log(`  JSON export : ${jsonExport}`);
  console.log(`  Row counts  : ${JSON.stringify(counts)}`);
  console.log("Upload these files to your Google Drive backups/exports folder.");
}

backup();
