// Analytics events (CLAUDE.md §14) and their allowed properties. Typed so nothing else can be sent: no VINs, prices,
// free text, names or photos — only ids from our own data, enums, counts and buckets. Pure TS.
import type { Verdict } from './types';

export type CarAddedMethod = 'vin_scan' | 'vin_photo' | 'vin_typed' | 'ymm' | 'model_list';

export interface AnalyticsEvents {
  onboarding_answer: { question: string; answer: string };
  onboarding_completed: { stage: string | null; seller: string | null; confidence: string | null; worry: string | null };
  car_added: { method: CarAddedMethod; powertrain: string; has_report: boolean };
  vin_check_digit_failed: Record<string, never>;
  vehicle_report_viewed: { recalls_count: string; has_complaints: boolean; coverage: 'nhtsa' | 'none' };
  inspection_started: Record<string, never>;
  item_answered: { item_id: string; answer: string };
  photo_check_completed: { photo_type: string; findings_count: number; latency_ms: number; sample: boolean };
  photo_finding_confirmed: { code: string };
  photo_finding_dismissed: { code: string };
  verdict_shown: { verdict: Verdict; coverage: string };
  script_copied: { tone: string };
  listing_check_result: { overall: string; source: 'paste' | 'screenshot' };
  price_check_done: { comps_count: number; position: string };
  compare_opened: { cars: number };
  paywall_shown: { placement: string };
  purchase_started: { product: string };
  purchase_completed: { product: string };
  share_card_shared: { verdict: Verdict; format: string };
  data_deleted: Record<string, never>;
}
export type AnalyticsEvent = keyof AnalyticsEvents;

/** Recall count in coarse buckets (§14 "recalls_count bucket"). */
export function recallsBucket(n: number | null | undefined): string {
  if (n == null) return 'unknown';
  if (n === 0) return '0';
  if (n <= 2) return '1-2';
  if (n <= 5) return '3-5';
  return '6+';
}

/** Inspection coverage (0–1) in buckets (§14 "coverage bucket"). */
export function coverageBucket(coverage: number): string {
  if (coverage < 0.4) return '<40%';
  if (coverage < 0.8) return '40-79%';
  if (coverage < 1) return '80-99%';
  return '100%';
}
