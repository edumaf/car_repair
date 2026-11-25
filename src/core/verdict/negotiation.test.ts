import { CHECKLIST_ITEMS, LISTING_FLAGS } from '../data/seed';
import { PPI_QUESTION, negotiationScript, roundTo50, sellerQuestions, suggestedOffer } from './negotiation';

describe('sellerQuestions', () => {
  it('combines flags, problem items, recalls and always the PPI question (deduped)', () => {
    const flag = LISTING_FLAGS.find((f) => f.id === 'tmu')!;
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'tire_tread')!;
    const q = sellerQuestions({ listingFlags: [flag, flag], problemItems: [item], recalls: [{ campaign: '20V314000' }] });
    expect(q[0]).toBe(flag.ask_seller);
    expect(q[1]).toMatch(/^I noticed .*\. Has that been looked at\?$/);
    expect(q[2]).toBe('Has recall 20V314000 been completed? Can you show me the paperwork?');
    expect(q[q.length - 1]).toBe(PPI_QUESTION);
    expect(q).toHaveLength(4);
  });

  it('combines many recalls into one question, and skips the PPI question if a listing question covers it', () => {
    const recalls = ['A', 'B', 'C', 'D'].map((campaign) => ({ campaign }));
    const ppiFlag = LISTING_FLAGS.find((f) => /pre-?purchase inspection/i.test(f.ask_seller));
    const q = sellerQuestions({ listingFlags: ppiFlag ? [ppiFlag] : [], problemItems: [], recalls });
    expect(q.filter((x) => /recall/i.test(x))).toEqual([
      'There are 4 recalls for this model. Have they all been done? Can you show me the dealer paperwork?',
    ]);
    if (ppiFlag) expect(q).not.toContain(PPI_QUESTION);
  });

  it('keeps acronyms at the start of a bad sign', () => {
    const vin = CHECKLIST_ITEMS.find((i) => i.id === 'vin_match')!;
    expect(sellerQuestions({ listingFlags: [], problemItems: [vin], recalls: [] })[0]).toBe(
      "I noticed VINs don't match. Has that been looked at?",
    );
  });
});

describe('suggestedOffer', () => {
  it.each<[number | null, { low: number; high: number } | null, number | null, number | null]>([
    [10000, { low: 400, high: 900 }, null, 9350], // 10000 − 650
    [10000, { low: 410, high: 900 }, null, 9350], // 9345 → rounds to 9350
    [10000, { low: 3000, high: 5000 }, 7500, 7500], // floored at the comps' fair-range low
    [10000, { low: 100, high: 200 }, 12000, 10000], // never above the asking price
    [500, { low: 3000, high: 5000 }, null, 0], // never negative
    [null, { low: 100, high: 200 }, null, null],
    [10000, null, null, null],
  ])('asking %p, estimate %p, floor %p → %p', (asking, est, floor, out) => {
    expect(suggestedOffer(asking, est, floor)).toBe(out);
  });

  it('rounds to $50', () => {
    expect(roundTo50(9324)).toBe(9300);
    expect(roundTo50(9325)).toBe(9350);
  });
});

describe('negotiationScript', () => {
  const base = { issues: ['Worn tires', 'Brake pads', 'Dent'], estimate: { low: 700, high: 1500 }, offer: 9350 };
  it('friendly and firm tones mention the top 2 issues, the range and the offer', () => {
    const f = negotiationScript('friendly', base);
    const m = negotiationScript('firm', base);
    for (const s of [f, m]) {
      expect(s).toContain('worn tires and brake pads');
      expect(s).toContain('$700–$1,500');
      expect(s).toContain('$9,350');
      expect(s).not.toContain('dent');
    }
    expect(f).not.toEqual(m);
  });

  it('works without an offer or estimate', () => {
    expect(negotiationScript('friendly', { issues: ['Worn tires'], estimate: null, offer: null })).toMatch(
      /worn tires\. Is there some room on the price\?$/,
    );
  });
});
