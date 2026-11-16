// Offline listing red-flag matching (CLAUDE.md §6.6). Implemented in Milestone 4.
import type { ListingFlag } from '../data/seedSchema';
import { notImplemented } from '../notImplemented';

export interface ListingFlagMatch {
  flag: ListingFlag;
  /** The phrases from flag.match that were found. */
  matched: string[];
}

export type ListingOverall = 'looks_normal' | 'ask_questions' | 'possible_scam';

/** Case-insensitive whole-phrase matching of listing text against listing_red_flags.json. */
export function matchListingFlags(_text: string, _flags: readonly ListingFlag[]): ListingFlagMatch[] {
  return notImplemented('matchListingFlags', 'M4');
}
