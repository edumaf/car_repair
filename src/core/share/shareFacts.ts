// Up to 3 facts for the share card (CLAUDE.md §13). Never the VIN, plate, seller or price (§2.7).
import { plural, tr } from '../i18n/i18n';
import type { CostRange } from '../types';

export function shareFacts(input: {
  recallsCount: number | null;
  repairEstimate: CostRange | null;
  showCosts: boolean;
  knownProblemArea: string | null;
  checked: number;
  total: number;
}): string[] {
  const facts: string[] = [];
  if (input.total > 0) facts.push(tr('{checked} of {total} checks done', { checked: input.checked, total: input.total }));
  if (input.showCosts && input.repairEstimate) {
    facts.push(
      tr('{low}–{high} likely repairs', {
        low: `$${input.repairEstimate.low.toLocaleString('en-US')}`,
        high: `$${input.repairEstimate.high.toLocaleString('en-US')}`,
      }),
    );
  }
  if (input.knownProblemArea) facts.push(tr('{area}: known problem area', { area: tr(input.knownProblemArea) }));
  if (input.recallsCount != null)
    facts.push(
      plural(input.recallsCount, '{n} recall for this model', '{n} recalls for this model', '{n} de rechemări pentru acest model'),
    );
  return facts.slice(0, 3);
}
