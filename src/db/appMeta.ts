// Small key/value settings in the app_meta table (onboarding answers, data version, dev toggles).
import type { SqlDb } from './sqlDb';

export const META = {
  dataVersion: 'data_version',
  onboardingDone: 'onboarding_done',
  onboardingAnswers: 'onboarding_answers',
  /** '1' once the paywall was shown after the first vehicle report (CLAUDE.md §9 placements). */
  firstPaywallShown: 'first_paywall_shown',
  /** Id of the car whose inspection is the free one (CLAUDE.md §9). */
  freeInspectionCarId: 'free_inspection_car_id',
  /** Dev-only: '1' = pretend the user has Premium (CLAUDE.md §9). */
  simulatePremium: 'dev_simulate_premium',
  /** Dev-only: API mode picked in Settings (mock / direct / live). */
  apiMode: 'dev_api_mode',
  /** Region picked in Settings (us / uk / ro / eu / other); otherwise detected from the phone. */
  region: 'region',
  lang: 'lang',
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
