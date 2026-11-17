// Opens the local SQLite database, runs migrations and records the seed data version.
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { setApiMode, type ApiMode } from '@/core/api/mode';
import { setLang, type Lang } from '@/core/i18n/i18n';
import { setRegion, type Region } from '@/core/region';
import { setAnalyticsOptOut } from '@/analytics/analytics';
import { getFlags, setFlags } from '@/state/appFlags';
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
    // Browser preview has no exclusive transactions; a plain transaction is fine there (single tab).
    if (Platform.OS === 'web') await db.withTransactionAsync(() => db.execAsync(MIGRATIONS[v]));
    else
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
  // Browser preview only: the SQLite web worker can't start while the page waits on a sync call, so open the
  // database once asynchronously first (starts the worker). No effect on iOS/Android.
  if (Platform.OS === 'web' && !sqlite) await openDatabaseAsync(DB_NAME);
  const db = getDb();
  await migrate(db);
  if ((await getMeta(db, META.dataVersion)) !== DATA_VERSION) await setMeta(db, META.dataVersion, DATA_VERSION);
}

/** Re-applies settings saved in app_meta: region, language, and (dev) the API mode. */
export async function restoreSettings(): Promise<void> {
  const db = getDb();
  const mode = await getMeta(db, META.apiMode);
  if (mode) setApiMode(mode as ApiMode);
  const region = await getMeta(db, META.region);
  if (region) setRegion(region as Region);
  const lang = await getMeta(db, META.lang);
  if (lang) setLang(lang as Lang);
  setFlags({
    onboardingDone: (await getMeta(db, META.onboardingDone)) === '1',
    firstPaywallShown: (await getMeta(db, META.firstPaywallShown)) === '1',
    simulatePremium: __DEV__ && (await getMeta(db, META.simulatePremium)) === '1',
    analyticsOff: (await getMeta(db, META.analyticsOff)) === '1',
  });
  setAnalyticsOptOut(getFlags().analyticsOff);
}

/** Saves a flag both in memory and in app_meta. */
export async function saveFlag(
  key: 'onboardingDone' | 'firstPaywallShown' | 'simulatePremium' | 'analyticsOff',
  value: boolean,
): Promise<void> {
  setFlags({ [key]: value });
  if (key === 'analyticsOff') setAnalyticsOptOut(value);
  const metaKey = {
    onboardingDone: META.onboardingDone,
    firstPaywallShown: META.firstPaywallShown,
    simulatePremium: META.simulatePremium,
    analyticsOff: META.analyticsOff,
  }[key];
  await setMeta(getDb(), metaKey, value ? '1' : '0');
}

export async function saveRegion(region: Region): Promise<void> {
  setRegion(region);
  await setMeta(getDb(), META.region, region);
}

export async function saveLang(lang: Lang): Promise<void> {
  setLang(lang);
  await setMeta(getDb(), META.lang, lang);
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
  setFlags({ onboardingDone: false, firstPaywallShown: false, simulatePremium: false, analyticsOff: false });
  setAnalyticsOptOut(false);
}
