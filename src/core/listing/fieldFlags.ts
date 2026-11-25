// Listing warning signs raised from numbers instead of phrases (CLAUDE.md §6.6 "field-based flags"): an asking
// price far below the similar listings the user added, and no mileage anywhere. The texts live in
// data/listing_red_flags.json ("field_flags"); this file only decides when they apply. Pure TS.
import { FIELD_FLAGS } from '../data/seed';
import type { FieldFlag, ListingFlag } from '../data/seedSchema';
import type { PriceCheckResult } from '../price/priceCheck';
import { matchListingFlags, sortMatches, type ListingFlagMatch } from './matchListingFlags';

/** "Far below" = under 75% of the fitted price (or, with fewer listings, of their median). */
export const FAR_BELOW_SHARE = 0.75;

export function priceFarBelowSimilar(askingPrice: number | null, price: PriceCheckResult | null): boolean {
  if (askingPrice == null || askingPrice <= 0 || !price) return false;
  const reference = price.predicted ?? (price.stats && price.stats.count >= 2 ? price.stats.median : null);
  return reference != null && reference > 0 && askingPrice < reference * FAR_BELOW_SHARE;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const MILEAGE_PATTERNS = [
  /\b\d{1,3}(?:[,. ]\d{3})+\s*(?:mi|miles|km|kms|kilomet\w*)\b/, // 112,000 miles · 180.000 km
  /\b\d{2,7}\s*(?:mi|miles|km|kms|kilomet\w*)\b/, // 98000 miles · 180000km
  /\b\d{1,3}(?:[.,]\d)?\s*k\b/, // 112k · 112k miles · 150k km
  /\b(?:mileage|odometer|odo|kilometraj|rulaj|km reali)\s*[:\-]?\s*\d/, // Mileage: 112000 · rulaj 180000
];

/** Does the listing text state the mileage anywhere? Errs on "yes" (a missed warning is a caution only). */
export function mentionsMileage(text: string): boolean {
  const t = fold(text);
  return MILEAGE_PATTERNS.some((re) => re.test(t));
}

const asListingFlag = (f: FieldFlag): ListingFlag => ({ id: f.id, match: [], severity: f.severity, explanation: f.explanation, ask_seller: f.ask_seller });

export interface ListingInput {
  listingText: string | null;
  askingPrice: number | null;
  /** The mileage the user entered for the car (if any). */
  mileage: number | null;
}

/**
 * Every listing warning sign for a car: phrase matches in the listing text plus the field-based ones. Used by the
 * listing card and the verdict, so both always agree.
 */
export function listingFlagsForCar(
  car: ListingInput,
  price: PriceCheckResult | null,
  fieldFlags: readonly FieldFlag[] = FIELD_FLAGS,
): ListingFlagMatch[] {
  const text = car.listingText?.trim() ?? '';
  const out: ListingFlagMatch[] = text ? matchListingFlags(text) : [];
  for (const f of fieldFlags) {
    const applies =
      f.when === 'price_far_below_similar'
        ? priceFarBelowSimilar(car.askingPrice, price)
        : f.when === 'mileage_missing'
          ? !!text && car.mileage == null && !mentionsMileage(text)
          : false;
    if (applies) out.push({ flag: asListingFlag(f), matched: [] });
  }
  return sortMatches(out);
}
