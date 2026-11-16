// Up to 3 facts for the share card (CLAUDE.md §13). Never the VIN, plate, seller or price (§2.7).
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
  if (input.total > 0) facts.push(`${input.checked} of ${input.total} checks done`);
  if (input.showCosts && input.repairEstimate) {
    facts.push(`$${input.repairEstimate.low.toLocaleString('en-US')}–$${input.repairEstimate.high.toLocaleString('en-US')} likely repairs`);
  }
  if (input.knownProblemArea) facts.push(`${input.knownProblemArea}: known problem area`);
  if (input.recallsCount != null) facts.push(`${input.recallsCount} recall${input.recallsCount === 1 ? '' : 's'} for this model`);
  return facts.slice(0, 3);
}
