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

/** "Why" lines, one per rule that fired (CLAUDE.md §8.2). */
export const REASON = {
  scamFlag: (n: number) => `The listing has ${n === 1 ? 'a classic scam warning sign' : `${n} classic scam warning signs`}.`,
  criticalProblem: (title: string) => `Serious: you found a problem at “${title}”.`,
  criticalFlag: (n: number) =>
    `The listing has ${n === 1 ? 'a serious warning sign' : `${n} serious warning signs`} (title, legal or structural).`,
  lowCoverage: (pct: number) => `Only ${pct}% of the checks are done. Finish more checks for a verdict.`,
  majorProblem: (title: string) => `Possibly expensive: you found a problem at “${title}”.`,
  notSureCritical: (title: string) => `Not sure about an important check: “${title}”.`,
  majorFlag: (n: number) =>
    `The listing has ${n === 1 ? 'a warning sign that needs' : `${n} warning signs that need`} proof from the seller.`,
  minorProblem: (title: string) => `Small: you found a problem at “${title}”.`,
  priceAbove: 'The asking price is above similar cars you compared.',
  allClear: 'No problems found in the checks you did.',
  openRecalls: (n: number) => `${n} recall${n === 1 ? '' : 's'} for this model: ask for proof ${n === 1 ? 'it was' : 'they were'} fixed.`,
} as const;
