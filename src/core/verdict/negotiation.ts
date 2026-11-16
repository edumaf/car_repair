// Seller questions, suggested offer and negotiation script (CLAUDE.md §8.3). Template-based; no LLM.
import type { ChecklistItem, ListingFlag } from '../data/seedSchema';
import type { CostRange } from '../types';
import type { Recall } from '../vehicle/types';

export const PPI_QUESTION = 'Can I take it to a mechanic for a pre-purchase inspection?';
export const MAX_RECALL_QUESTIONS = 3;

/** "Uneven gaps between panels" → "uneven gaps between panels"; keeps acronyms like "VINs don't match". */
function lowerFirst(s: string): string {
  return /^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

export function sellerQuestions(input: {
  listingFlags: readonly Pick<ListingFlag, 'ask_seller'>[];
  problemItems: readonly ChecklistItem[];
  recalls: readonly Pick<Recall, 'campaign'>[];
}): string[] {
  const out: string[] = [];
  for (const f of input.listingFlags) out.push(f.ask_seller);
  for (const i of input.problemItems)
    out.push(`I noticed ${lowerFirst(i.bad_signs[0] ?? i.title).replace(/\.$/, '')}. Has that been looked at?`);
  // A few recalls get one question each; many are combined so the list stays readable.
  if (input.recalls.length > MAX_RECALL_QUESTIONS) {
    out.push(`There are ${input.recalls.length} recalls for this model. Have they all been done? Can you show me the dealer paperwork?`);
  } else {
    for (const r of input.recalls) out.push(`Has recall ${r.campaign} been completed? Can you show me the paperwork?`);
  }
  // Always ask for a pre-purchase inspection, unless a listing question already does.
  if (!out.some((q) => /pre-?purchase inspection/i.test(q))) out.push(PPI_QUESTION);
  return [...new Set(out)];
}

export const roundTo50 = (n: number) => Math.round(n / 50) * 50;

/**
 * asking − midpoint(repair estimate), floored at the low end of the comparables' fair range if known,
 * rounded to $50. Null when there's no asking price or nothing to subtract.
 */
export function suggestedOffer(askingPrice: number | null, estimate: CostRange | null, fairRangeLow: number | null = null): number | null {
  if (askingPrice == null || askingPrice <= 0 || !estimate) return null;
  let offer = askingPrice - (estimate.low + estimate.high) / 2;
  if (fairRangeLow != null) offer = Math.max(offer, fairRangeLow);
  offer = Math.min(offer, askingPrice);
  return Math.max(0, roundTo50(offer));
}

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export type Tone = 'friendly' | 'firm';

/** The script the buyer can read or copy. `issues` are plain names, most expensive first. */
export function negotiationScript(
  tone: Tone,
  input: { issues: readonly string[]; estimate: CostRange | null; offer: number | null },
): string {
  const top = input.issues.slice(0, 2).map((s) => s.toLowerCase());
  const issues = top.length === 2 ? `${top[0]} and ${top[1]}` : (top[0] ?? 'a few issues');
  const cost = input.estimate ? `, which typically cost ${usd(input.estimate.low)}–${usd(input.estimate.high)} to fix` : '';
  if (tone === 'friendly') {
    const offer = input.offer != null ? ` Would you take ${usd(input.offer)}? I can do it today.` : ' Is there some room on the price?';
    return `I really like the car, thanks for letting me look at it. The inspection showed ${issues}${cost}.${offer}`;
  }
  const offer = input.offer != null ? ` My offer is ${usd(input.offer)}, and I can do it today.` : ' I need the price to reflect that.';
  return `I’m interested, but the inspection showed ${issues}${cost}.${offer}`;
}
