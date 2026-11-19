// The normalized vehicle report returned by /vehicle (and by the mock client).
// Every fact here comes from an NHTSA response (CLAUDE.md §2.2); nothing is generated.
import type { Powertrain } from '../types';

export interface VehicleDecode {
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body: string | null;
  powertrain: Powertrain;
  /** e.g. "2.0L 4-cyl turbo", or "Electric motor" for EVs. */
  engineDesc: string | null;
  /** e.g. "FWD", "AWD", "4WD", "RWD". */
  drive: string | null;
  plantCountry: string | null;
  /** vPIC error codes other than "0" (e.g. "1" = check digit). Empty when the decode was clean. */
  decodeWarnings: string[];
}

export interface Recall {
  campaign: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  /** ISO date (YYYY-MM-DD) or null. */
  reportDate: string | null;
  /** NHTSA "park it" advisory: don't drive until repaired. */
  parkIt: boolean;
  /** NHTSA "park outside" advisory: fire risk. */
  parkOutside: boolean;
}

export interface ComplaintGroupStat {
  /** A key of _meta.complaint_keyword_groups in inspection_checklist.json. */
  group: string;
  count: number;
  /** Up to 3 short quotes (≤ 200 chars) from NHTSA complaint summaries. */
  samples: string[];
}

export interface ComplaintSummary {
  total: number;
  crashes: number;
  fires: number;
  injuries: number;
  deaths: number;
  /** Sorted by count, highest first. Only groups with at least one complaint. */
  groups: ComplaintGroupStat[];
  /** Complaints whose components matched none of our groups. */
  ungrouped: number;
}

export interface SafetyRating {
  /** NHTSA overall 5-star rating, or null when "Not Rated". */
  overall: number | null;
  vehicleDescription: string;
}

export interface VehicleReport {
  decode: VehicleDecode;
  /** null = this section couldn't be loaded (partial results are fine, CLAUDE.md §7.1). */
  recalls: Recall[] | null;
  complaints: ComplaintSummary | null;
  safety: SafetyRating | null;
  /**
   * Where recall/complaint data could come from: "nhtsa" (US-market car) or "none" (other markets: no official
   * source yet, so those sections show "not available for this car's market" instead of "couldn't load").
   */
  coverage?: 'nhtsa' | 'none';
  /** Epoch ms. */
  fetchedAt: number;
}
