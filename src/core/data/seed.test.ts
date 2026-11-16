import { CHECKLIST_ITEMS, DATA_VERSION, LISTING_FLAGS, REPAIR_COSTS, SECTIONS, rawSeed } from './seed';
import { validateSeed } from './seedSchema';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('bundled seed data', () => {
  it('is valid, including cross-file references', () => {
    expect(validateSeed(rawSeed)).toEqual([]);
  });

  it('has the expected rough sizes', () => {
    expect(SECTIONS.length).toBeGreaterThanOrEqual(8);
    expect(CHECKLIST_ITEMS.length).toBeGreaterThanOrEqual(50);
    expect(REPAIR_COSTS.length).toBeGreaterThanOrEqual(50);
    expect(LISTING_FLAGS.length).toBeGreaterThanOrEqual(15);
    expect(DATA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('sorts sections by order', () => {
    const orders = SECTIONS.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('has at least one checklist item per section, and items for every powertrain', () => {
    for (const s of SECTIONS) expect(CHECKLIST_ITEMS.some((i) => i.section === s.id)).toBe(true);
    for (const p of ['all', 'gas', 'diesel', 'hybrid', 'ev']) {
      expect(CHECKLIST_ITEMS.some((i) => i.powertrain.includes(p as never))).toBe(true);
    }
  });
});

describe('validateSeed catches broken data', () => {
  type Seed = { checklist: any; repairCosts: any; listingFlags: any };
  const broken = (mutate: (s: Seed) => void): string[] => {
    const s = clone(rawSeed) as Seed;
    mutate(s);
    return validateSeed(s);
  };

  it.each<[string, (s: Seed) => void, RegExp]>([
    ['missing repair_cost_id', (s) => (s.checklist.items[0].repair_cost_id = 'nope'), /repair_cost_id "nope" is missing/],
    ['unknown complaint_group', (s) => (s.checklist.items[0].complaint_group = 'nope'), /complaint_group "nope"/],
    ['unknown section', (s) => (s.checklist.items[0].section = 'nope'), /unknown section "nope"/],
    ['bad severity enum', (s) => (s.checklist.items[0].severity = 'huge'), /severity/],
    ['bad powertrain enum', (s) => (s.checklist.items[0].powertrain = ['steam']), /powertrain/],
    ['bad photo_check enum', (s) => (s.checklist.items[0].photo_check = 'selfie'), /photo_check/],
    ['bad flag severity', (s) => (s.listingFlags.flags[0].severity = 'meh'), /severity/],
    ['duplicate item id', (s) => (s.checklist.items[1].id = s.checklist.items[0].id), /duplicate checklist item id/],
    ['duplicate cost id', (s) => (s.repairCosts.costs[1].id = s.repairCosts.costs[0].id), /duplicate repair cost id/],
    ['duplicate flag id', (s) => (s.listingFlags.flags[1].id = s.listingFlags.flags[0].id), /duplicate listing flag id/],
    ['low > high', (s) => Object.assign(s.repairCosts.costs[0], { low: 900, high: 100 }), /low must be <= high/],
    ['unknown cost category', (s) => (s.repairCosts.costs[0].category = 'nope'), /unknown category "nope"/],
  ])('%s', (_name, mutate, expected) => {
    const problems = broken(mutate);
    expect(problems.join('\n')).toMatch(expected);
  });
});
