// Opens the local SQLite database, runs migrations and records the seed data version.
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { setApiMode, type ApiMode } from '@/core/api/mode';
import { setRegion, type Region } from '@/core/region';
import { setFlags } from '@/state/appFlags';
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

/** Re-applies settings saved in app_meta: region, and (dev) the API mode. */
export async function restoreSettings(): Promise<void> {
  const db = getDb();
  const mode = await getMeta(db, META.apiMode);
  if (mode) setApiMode(mode as ApiMode);
  const region = await getMeta(db, META.region);
  if (region) setRegion(region as Region);
  setFlags({
    onboardingDone: (await getMeta(db, META.onboardingDone)) === '1',
    firstPaywallShown: (await getMeta(db, META.firstPaywallShown)) === '1',
    simulatePremium: __DEV__ && (await getMeta(db, META.simulatePremium)) === '1',
  });
}

/** Saves a flag both in memory and in app_meta. */
export async function saveFlag(key: 'onboardingDone' | 'firstPaywallShown' | 'simulatePremium', value: boolean): Promise<void> {
  setFlags({ [key]: value });
  const metaKey = { onboardingDone: META.onboardingDone, firstPaywallShown: META.firstPaywallShown, simulatePremium: META.simulatePremium }[
    key
  ];
  await setMeta(getDb(), metaKey, value ? '1' : '0');
}

export async function saveRegion(region: Region): Promise<void> {
  setRegion(region);
  await setMeta(getDb(), META.region, region);
}

export async function saveApiMode(mode: ApiMode): Promise<void> {
  setApiMode(mode);
  await setMeta(getDb(), META.apiMode, mode);
}

/** "Delete all my data" (CLAUDE.md §10): every car, answer, photo check, comparable and setting on this phone. */
export async function wipeLocalData(): Promise<void> {
  const db = getDb();
  await db.execAsync('DELETE FROM photo_checks; DELETE FROM answers; DELETE FROM comparables; DELETE FROM cars; DELETE FROM app_meta;');
  await setMeta(db, META.dataVersion, DATA_VERSION);
  setFlags({ onboardingDone: false, firstPaywallShown: false, simulatePremium: false });
}
