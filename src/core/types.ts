// Shared domain types. Pure TS: nothing under src/core/** may import React Native (CLAUDE.md §4).

export const POWERTRAINS = ['gas', 'diesel', 'hybrid', 'ev'] as const;
export type Powertrain = (typeof POWERTRAINS)[number];

export const SEVERITIES = ['info', 'minor', 'major', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ANSWERS = ['ok', 'problem', 'not_sure', 'skip'] as const;
export type Answer = (typeof ANSWERS)[number];

export const PHOTO_CHECK_TYPES = [
  'tire',
  'rust',
  'paint_panel',
  'dashboard_lights',
  'engine_bay',
  'fluid',
  'interior_damage',
  'vin_plate',
  'odometer',
  'underbody',
  'document',
] as const;
export type PhotoCheckType = (typeof PHOTO_CHECK_TYPES)[number];

export const FLAG_SEVERITIES = ['scam', 'critical', 'major', 'caution'] as const;
export type FlagSeverity = (typeof FLAG_SEVERITIES)[number];

export const SELLER_TYPES = ['private', 'dealer', 'unknown'] as const;
export type SellerType = (typeof SELLER_TYPES)[number];

export const CAR_STATUSES = ['considering', 'bought', 'passed'] as const;
export type CarStatus = (typeof CAR_STATUSES)[number];

export const VERDICTS = ['WALK_AWAY', 'GET_PRO_INSPECTION', 'NEGOTIATE', 'LOOKS_GOOD_SO_FAR', 'INCOMPLETE'] as const;
export type Verdict = (typeof VERDICTS)[number];

export type PricePosition = 'below' | 'within' | 'above' | 'unknown';

/** A car the user is looking at (mirrors the `cars` SQLite table, decoded). */
export interface Car {
  id: string;
  createdAt: number;
  updatedAt: number;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body: string | null;
  powertrain: Powertrain;
  engineDesc: string | null;
  drive: string | null;
  askingPrice: number | null;
  mileage: number | null;
  mileageUnit: MileageUnit;
  sellerType: SellerType;
  listingText: string | null;
  nickname: string | null;
  status: CarStatus;
  /** Our model database entry (data/models/*.json), if matched or picked. */
  modelId: string | null;
  engineId: string | null;
}

export type MileageUnit = 'mi' | 'km';

/** A US dollar range. Always shown as a range, never a single number (CLAUDE.md §2.4). */
export interface CostRange {
  low: number;
  high: number;
}
