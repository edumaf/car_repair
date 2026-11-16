// Seller questions, suggested offer and negotiation script (CLAUDE.md §8.3). Template-based; no LLM.
import type { ChecklistItem, ListingFlag } from '../data/seedSchema';
import { tr } from '../i18n/i18n';
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
  for (const f of input.listingFlags) out.push(tr(f.ask_seller));
  for (const i of input.problemItems)
    out.push(tr('I noticed {sign}. Has that been looked at?', { sign: lowerFirst(tr(i.bad_signs[0] ?? i.title)).replace(/\.$/, '') }));
  // A few recalls get one question each; many are combined so the list stays readable.
  if (input.recalls.length > MAX_RECALL_QUESTIONS) {
    out.push(
      tr('There are {n} recalls for this model. Have they all been done? Can you show me the dealer paperwork?', {
        n: input.recalls.length,
      }),
    );
  } else {
    for (const r of input.recalls)
      out.push(tr('Has recall {campaign} been completed? Can you show me the paperwork?', { campaign: r.campaign }));
  }
  // Always ask for a pre-purchase inspection, unless a listing question already does.
  const ppi = tr(PPI_QUESTION);
  if (!out.some((q) => q === ppi || /pre-?purchase inspection|inspecți[ae] înainte de cumpărare/i.test(q))) out.push(ppi);
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
  const top = input.issues.slice(0, 2).map((s) => tr(s).toLowerCase());
  const issues = top.length === 2 ? tr('{a} and {b}', { a: top[0], b: top[1] }) : (top[0] ?? tr('a few issues'));
  const cost = input.estimate
    ? tr(', which typically cost {low}–{high} to fix', { low: usd(input.estimate.low), high: usd(input.estimate.high) })
    : '';
  if (tone === 'friendly') {
    const offer =
      input.offer != null
        ? tr(' Would you take {offer}? I can do it today.', { offer: usd(input.offer) })
        : tr(' Is there some room on the price?');
    return tr('I really like the car, thanks for letting me look at it. The inspection showed {issues}{cost}.', { issues, cost }) + offer;
  }
  const offer =
    input.offer != null
      ? tr(' My offer is {offer}, and I can do it today.', { offer: usd(input.offer) })
      : tr(' I need the price to reflect that.');
  return tr('I’m interested, but the inspection showed {issues}{cost}.', { issues, cost }) + offer;
}
