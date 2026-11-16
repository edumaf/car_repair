// Deterministic verdict engine (CLAUDE.md §8). Pure TS, no React Native.
// Only confirmed answers count (§2.3); repair costs come only from data/repair_costs.json (§2.2).
import { getRepairCost } from '../data/seed';
import type { ChecklistItem, ListingFlag, RepairCost } from '../data/seedSchema';
import type { Answer, CostRange, PricePosition, Severity, Verdict } from '../types';
import { REASON } from './strings';

export interface VerdictInput {
  /** Items that apply to this car (after the powertrain filter). */
  items: readonly ChecklistItem[];
  /** Confirmed answers only: item id → answer. */
  answers: Readonly<Record<string, Answer | undefined>>;
  openRecallCount: number;
  topComplaintGroups: readonly string[];
  /** Listing flags that matched the car's listing text. */
  listingFlags: readonly Pick<ListingFlag, 'id' | 'severity'>[];
  pricePosition: PricePosition;
}

export interface RepairLine {
  cost: RepairCost;
  /** Problem items that share this repair (counted once). */
  itemIds: string[];
}

export interface VerdictResult {
  verdict: Verdict;
  /** WALK_AWAY because of a scam-pattern listing flag ("Possible scam"). */
  possibleScam: boolean;
  /** answered (ok | problem | not_sure) / applicable items, 0..1. */
  coverage: number;
  problemItems: ChecklistItem[];
  /** One line per distinct repair_cost_id among confirmed problems. */
  repairs: RepairLine[];
  /** Sum of the distinct repair ranges, or null when no problem has a cost. */
  repairEstimate: CostRange | null;
  reasons: string[];
  /** Top complaint groups that overlap with problem items ("Known issue for this model"). */
  knownIssueOverlap: string[];
  openRecallCount: number;
}

export const INCOMPLETE_COVERAGE = 0.4;

const bySeverity = (items: ChecklistItem[], s: Severity) => items.filter((i) => i.severity === s);

export function computeVerdict(input: VerdictInput): VerdictResult {
  const { items, answers, listingFlags } = input;
  const answered = items.filter((i) => {
    const a = answers[i.id];
    return a === 'ok' || a === 'problem' || a === 'not_sure';
  }).length;
  const coverage = items.length ? answered / items.length : 0;

  const problems = items.filter((i) => answers[i.id] === 'problem');
  const notSureCritical = items.filter((i) => answers[i.id] === 'not_sure' && i.severity === 'critical');
  const flagsOf = (s: ListingFlag['severity']) => listingFlags.filter((f) => f.severity === s);
  const scam = flagsOf('scam');
  const criticalFlags = flagsOf('critical');
  const majorFlags = flagsOf('major');
  const critical = bySeverity(problems, 'critical');
  const major = bySeverity(problems, 'major');
  const minor = bySeverity(problems, 'minor');

  // Reasons for every rule that holds, most serious first (the verdict comes from the first one).
  const reasons: string[] = [];
  if (scam.length) reasons.push(REASON.scamFlag(scam.length));
  critical.forEach((i) => reasons.push(REASON.criticalProblem(i.title)));
  if (criticalFlags.length) reasons.push(REASON.criticalFlag(criticalFlags.length));
  if (coverage < INCOMPLETE_COVERAGE) reasons.push(REASON.lowCoverage(Math.round(coverage * 100)));
  major.forEach((i) => reasons.push(REASON.majorProblem(i.title)));
  notSureCritical.forEach((i) => reasons.push(REASON.notSureCritical(i.title)));
  if (majorFlags.length) reasons.push(REASON.majorFlag(majorFlags.length));
  minor.forEach((i) => reasons.push(REASON.minorProblem(i.title)));
  if (input.pricePosition === 'above') reasons.push(REASON.priceAbove);

  let verdict: Verdict;
  let possibleScam = false;
  if (scam.length) {
    verdict = 'WALK_AWAY';
    possibleScam = true;
  } else if (critical.length || criticalFlags.length) verdict = 'WALK_AWAY';
  else if (coverage < INCOMPLETE_COVERAGE) verdict = 'INCOMPLETE';
  else if (major.length || notSureCritical.length || majorFlags.length) verdict = 'GET_PRO_INSPECTION';
  else if (minor.length || input.pricePosition === 'above') verdict = 'NEGOTIATE';
  else verdict = 'LOOKS_GOOD_SO_FAR';

  if (verdict === 'LOOKS_GOOD_SO_FAR') reasons.push(REASON.allClear);
  if (input.openRecallCount > 0) reasons.push(REASON.openRecalls(input.openRecallCount));

  // Repair estimate: each distinct repair_cost_id counted once.
  const lines = new Map<string, RepairLine>();
  for (const i of problems) {
    if (!i.repair_cost_id) continue;
    const cost = getRepairCost(i.repair_cost_id);
    if (!cost) continue;
    const line = lines.get(cost.id) ?? { cost, itemIds: [] };
    line.itemIds.push(i.id);
    lines.set(cost.id, line);
  }
  const repairs = [...lines.values()].sort((a, b) => b.cost.high - a.cost.high);
  const repairEstimate = repairs.length
    ? repairs.reduce((acc, r) => ({ low: acc.low + r.cost.low, high: acc.high + r.cost.high }), { low: 0, high: 0 })
    : null;

  const top = new Set(input.topComplaintGroups);
  const knownIssueOverlap = [...new Set(problems.map((i) => i.complaint_group).filter((g): g is string => !!g && top.has(g)))];

  return {
    verdict,
    possibleScam,
    coverage,
    problemItems: problems,
    repairs,
    repairEstimate,
    reasons,
    knownIssueOverlap,
    openRecallCount: input.openRecallCount,
  };
}
