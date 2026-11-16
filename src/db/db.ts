// Opens the local SQLite database, runs migrations and records the seed data version.
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { DATA_VERSION } from '@/core/data/seed';

import { META, getMeta, setMeta } from './appMeta';
import { MIGRATIONS } from './migrations';

export const DB_NAME = 'used-car-check.db';

let sqlite: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!sqlite) {
    sqlite = openDatabaseSync(DB_NAME);
    sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  }
  return sqlite;
}

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[v]);
    });
    await db.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}

/**
 * Call once at startup before any query. Seed data (checklist, costs, flags) is bundled JSON read directly,
 * so there is nothing to import; we only record its version so later milestones can react to data updates.
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();
  await migrate(db);
  if ((await getMeta(db, META.dataVersion)) !== DATA_VERSION) await setMeta(db, META.dataVersion, DATA_VERSION);
}
