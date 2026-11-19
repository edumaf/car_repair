// User-facing verdict wording (CLAUDE.md §8.2). The app never says a car is safe or good (§2.1).
import { tr } from '../i18n/i18n';
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

/** "Why" lines, one per rule that fired (CLAUDE.md §8.2). Built when shown, in the current language. */
export const REASON = {
  scamFlag: (n: number) =>
    n === 1 ? tr('The listing has a classic scam warning sign.') : tr('The listing has {n} classic scam warning signs.', { n }),
  criticalProblem: (title: string) => tr('Serious: you found a problem at “{title}”.', { title: tr(title) }),
  criticalFlag: (n: number) =>
    n === 1
      ? tr('The listing has a serious warning sign (title, legal or structural).')
      : tr('The listing has {n} serious warning signs (title, legal or structural).', { n }),
  lowCoverage: (pct: number) => tr('Only {pct}% of the checks are done. Finish more checks for a verdict.', { pct }),
  /** Low coverage when a verdict was reached anyway (a scam sign or a serious problem). */
  lowCoverageAnyway: (pct: number) => tr('Only {pct}% of the checks are done, so there may be more to find.', { pct }),
  majorProblem: (title: string) => tr('Possibly expensive: you found a problem at “{title}”.', { title: tr(title) }),
  notSureCritical: (title: string) => tr('Not sure about an important check: “{title}”.', { title: tr(title) }),
  majorFlag: (n: number) =>
    n === 1
      ? tr('The listing has a warning sign that needs proof from the seller.')
      : tr('The listing has {n} warning signs that need proof from the seller.', { n }),
  minorProblem: (title: string) => tr('Small: you found a problem at “{title}”.', { title: tr(title) }),
  get priceAbove() {
    return tr('The asking price is above similar cars you compared.');
  },
  get allClear() {
    return tr('No problems found in the checks you did.');
  },
  openRecalls: (n: number) =>
    n === 1
      ? tr('1 recall for this model: ask for proof it was fixed.')
      : tr('{n} recalls for this model: ask for proof they were fixed.', { n }),
};
