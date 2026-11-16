// Small key/value settings in the app_meta table (onboarding answers, data version, dev toggles).
import type { SqlDb } from './sqlDb';

export const META = {
  dataVersion: 'data_version',
  onboardingDone: 'onboarding_done',
  onboardingAnswers: 'onboarding_answers',
  /** Dev-only: '1' = pretend the user has Premium (CLAUDE.md §9). */
  simulatePremium: 'dev_simulate_premium',
} as const;

export async function getMeta(db: SqlDb, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setMeta(db: SqlDb, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', key, value);
}

export async function deleteMeta(db: SqlDb, key: string): Promise<void> {
  await db.runAsync('DELETE FROM app_meta WHERE key = ?', key);
}
