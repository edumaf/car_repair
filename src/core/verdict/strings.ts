// User-facing verdict wording (CLAUDE.md §8.2). The app never says a car is safe or good (§2.1).
import type { Verdict } from '../types';

export const VERDICT_HEADLINE: Record<Verdict, string> = {
  WALK_AWAY: 'Walk away',
  GET_PRO_INSPECTION: 'Get a mechanic to check it first',
  NEGOTIATE: 'Negotiate',
  LOOKS_GOOD_SO_FAR: 'Looks good so far',
  INCOMPLETE: 'Keep checking',
};

export const POSSIBLE_SCAM_HEADLINE = 'Possible scam';

export const PPI_REMINDER = 'Get a professional pre-purchase inspection before you pay.';

export const SELF_CHECK_DISCLAIMER =
  'This is a guided self-check, not a professional inspection. Get a pre-purchase inspection by an independent mechanic before you pay.';

export const REPAIR_COST_DISCLAIMER = 'Typical US range at an independent shop. Your price will vary.';
