// Deterministic verdict engine (CLAUDE.md §8). Implemented, with table-driven tests, in Milestone 3.
import type { ChecklistItem, ListingFlag } from '../data/seedSchema';
import { notImplemented } from '../notImplemented';
import type { Answer, CostRange, PricePosition, Verdict } from '../types';

export interface VerdictInput {
  askingPrice: number | null;
  /** Items that apply to this car (after the powertrain filter). */
  items: readonly ChecklistItem[];
  /** Only confirmed answers count (AI suggestions must be confirmed first, CLAUDE.md §2.3). */
  answers: Readonly<Record<string, Answer>>;
  openRecallCount: number;
  topComplaintGroups: readonly string[];
  listingFlags: readonly ListingFlag[];
  pricePosition: PricePosition;
}

export interface VerdictResult {
  verdict: Verdict;
  /** "Possible scam" variant of WALK_AWAY. */
  possibleScam: boolean;
  coverage: number;
  repairEstimate: CostRange | null;
  reasons: string[];
  knownIssueOverlap: string[];
}

export function computeVerdict(_input: VerdictInput): VerdictResult {
  return notImplemented('computeVerdict', 'M3');
}
