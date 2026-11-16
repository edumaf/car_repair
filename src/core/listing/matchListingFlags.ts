// Offline listing red-flag matching (CLAUDE.md §6.6): case-insensitive whole-phrase match against
// data/listing_red_flags.json. Flags are "common warning signs — ask about it", never accusations (§2.6).
import { LISTING_FLAGS } from '../data/seed';
import type { ListingFlag } from '../data/seedSchema';

export interface ListingFlagMatch {
  flag: ListingFlag;
  /** The phrases from flag.match that were found. */
  matched: string[];
}

export type ListingOverall = 'looks_normal' | 'ask_questions' | 'possible_scam';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Normalizes curly quotes and whitespace so "as‑is" / "as  is" still match. */
const clean = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[‐-―]/g, '-').replace(/\s+/g, ' ');

const SEVERITY_ORDER = { scam: 0, critical: 1, major: 2, caution: 3 } as const;

export function matchListingFlags(text: string, flags: readonly ListingFlag[] = LISTING_FLAGS): ListingFlagMatch[] {
  const hay = clean(text);
  const out: ListingFlagMatch[] = [];
  for (const flag of flags) {
    const matched = flag.match.filter((phrase) => new RegExp(`(^|[^a-z0-9])${escape(clean(phrase))}(?=$|[^a-z0-9])`).test(hay));
    if (matched.length) out.push({ flag, matched });
  }
  return out.sort((a, b) => SEVERITY_ORDER[a.flag.severity] - SEVERITY_ORDER[b.flag.severity]);
}

export function listingOverall(matches: readonly ListingFlagMatch[]): ListingOverall {
  if (matches.some((m) => m.flag.severity === 'scam')) return 'possible_scam';
  return matches.length ? 'ask_questions' : 'looks_normal';
}
