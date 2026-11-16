// Price check against user-entered comparables (CLAUDE.md §6.7). Implemented in Milestone 4.
// Never generate a price with the LLM.
import { notImplemented } from '../notImplemented';
import type { PricePosition } from '../types';

export interface Comparable {
  price: number;
  mileage: number | null;
  year: number | null;
}

export interface PriceCheckResult {
  position: PricePosition;
  /** Present with ≥ 3 comps: residual-based fair range from a price ~ mileage fit. */
  fairRange: { low: number; high: number } | null;
  /** Present with 1–2 comps (and alongside fairRange). */
  stats: { min: number; median: number; max: number } | null;
}

export function priceCheck(
  _car: { askingPrice: number; mileage: number | null; year: number | null },
  _comps: readonly Comparable[],
): PriceCheckResult {
  return notImplemented('priceCheck', 'M4');
}
