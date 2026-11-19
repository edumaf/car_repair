// Price check against comparable listings the user entered (CLAUDE.md §6.7). Pure maths on the user's own
// numbers; never a price from the LLM.
//
// ≥ 3 comparables with mileage (and the car's mileage known): least-squares fit price ≈ a + b·mileage over the
// comparables (same model, ±1 year when years are known), predicted price at this car's mileage, and a fair range of
// ± max(residual standard deviation, 5% of the predicted price). Otherwise: min / median / max only.
import type { PricePosition } from '../types';

export interface Comparable {
  price: number;
  mileage: number | null;
  year: number | null;
}

export interface PriceCheckResult {
  position: PricePosition;
  /** With ≥ 3 usable comps: the fitted price at this car's mileage and a residual-based band around it. */
  predicted: number | null;
  fairRange: { low: number; high: number } | null;
  /** Always present when there's at least one comp. */
  stats: { min: number; median: number; max: number; count: number } | null;
  /** Why the result is limited, for the UI. */
  note: 'ok' | 'need_more_comps' | 'need_mileage' | 'no_comps';
  compsUsed: number;
}

export const MIN_COMPS_FOR_FIT = 3;
const MIN_BAND_SHARE = 0.05;

const round50 = (n: number) => Math.round(n / 50) * 50;

export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Ordinary least squares y = a + b·x. Returns slope 0 when all x are equal. */
export function linearFit(points: readonly { x: number; y: number }[]): { a: number; b: number } {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  return { a: my - b * mx, b };
}

export function priceCheck(
  car: { askingPrice: number | null; mileage: number | null; year: number | null },
  comps: readonly Comparable[],
): PriceCheckResult {
  const valid = comps.filter((c) => Number.isFinite(c.price) && c.price > 0);
  if (valid.length === 0) return { position: 'unknown', predicted: null, fairRange: null, stats: null, note: 'no_comps', compsUsed: 0 };

  // Same model ±1 year when both years are known.
  const sameYears = car.year == null ? valid : valid.filter((c) => c.year == null || Math.abs(c.year - car.year!) <= 1);
  const pool = sameYears.length ? sameYears : valid;
  const prices = pool.map((c) => c.price);
  const stats = { min: Math.min(...prices), median: median(prices), max: Math.max(...prices), count: pool.length };

  const withMileage = pool.filter((c) => c.mileage != null && c.mileage >= 0) as (Comparable & { mileage: number })[];
  if (withMileage.length < MIN_COMPS_FOR_FIT || car.mileage == null) {
    return {
      position: 'unknown',
      predicted: null,
      fairRange: null,
      stats,
      note: car.mileage == null && withMileage.length >= MIN_COMPS_FOR_FIT ? 'need_mileage' : 'need_more_comps',
      compsUsed: pool.length,
    };
  }

  const { a, b } = linearFit(withMileage.map((c) => ({ x: c.mileage, y: c.price })));
  const predictedRaw = Math.max(0, a + b * car.mileage);
  const residuals = withMileage.map((c) => c.price - (a + b * c.mileage));
  const dof = Math.max(1, withMileage.length - 2);
  const sd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / dof);
  const band = Math.max(sd, predictedRaw * MIN_BAND_SHARE);
  const fairRange = { low: Math.max(0, round50(predictedRaw - band)), high: round50(predictedRaw + band) };

  let position: PricePosition = 'unknown';
  if (car.askingPrice != null && car.askingPrice > 0) {
    position = car.askingPrice > fairRange.high ? 'above' : car.askingPrice < fairRange.low ? 'below' : 'within';
  }
  return { position, predicted: round50(predictedRaw), fairRange, stats, note: 'ok', compsUsed: withMileage.length };
}
