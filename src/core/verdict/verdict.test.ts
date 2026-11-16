import { buildChecklist, flattenChecklist } from '../checklist/buildChecklist';
import { getRepairCost, LISTING_FLAGS } from '../data/seed';
import { matchListingFlags } from '../listing/matchListingFlags';
import type { Answer, Powertrain, PricePosition } from '../types';
import { computeVerdict, type VerdictInput } from './verdict';

const itemsFor = (pt: Powertrain) => flattenChecklist(buildChecklist({ powertrain: pt }, [])).map((e) => e.item);
const allAnswered = (pt: Powertrain, a: Answer = 'ok') => Object.fromEntries(itemsFor(pt).map((i) => [i.id, a]));
const flag = (id: string) => LISTING_FLAGS.find((f) => f.id === id)!;
const cost = (id: string) => getRepairCost(id)!;

function input(over: Partial<VerdictInput> & { pt?: Powertrain } = {}): VerdictInput {
  const pt = over.pt ?? 'gas';
  return {
    items: itemsFor(pt),
    answers: allAnswered(pt),
    openRecallCount: 0,
    topComplaintGroups: [],
    listingFlags: [],
    pricePosition: 'unknown' as PricePosition,
    ...over,
  };
}

describe('verdict rules (CLAUDE.md §8.2), in priority order', () => {
  it.each<[string, Partial<VerdictInput>, string, boolean | null]>([
    ['scam listing flag', { listingFlags: [flag('wire_or_gift_cards')] }, 'WALK_AWAY', true],
    ['scam wins over everything', { listingFlags: [flag('escrow_shipping'), flag('salvage_rebuilt')], answers: {} }, 'WALK_AWAY', true],
    ['confirmed critical problem', { answers: { ...allAnswered('gas'), frame_damage: 'problem' } }, 'WALK_AWAY', false],
    ['critical listing flag', { listingFlags: [flag('salvage_rebuilt')] }, 'WALK_AWAY', false],
    ['critical beats low coverage', { answers: { frame_damage: 'problem' } }, 'WALK_AWAY', false],
    ['coverage < 40%', { answers: { vin_match: 'ok' } }, 'INCOMPLETE', null],
    ['major problem', { answers: { ...allAnswered('gas'), oil_cap_sludge: 'problem' } }, 'GET_PRO_INSPECTION', null],
    ['not sure on a critical item', { answers: { ...allAnswered('gas'), airbag_light: 'not_sure' } }, 'GET_PRO_INSPECTION', null],
    ['not sure on a minor item is fine', { answers: { ...allAnswered('gas'), keys_count: 'not_sure' } }, 'LOOKS_GOOD_SO_FAR', null],
    ['major listing flag', { listingFlags: [flag('no_test_drive')] }, 'GET_PRO_INSPECTION', null],
    ['minor problem', { answers: { ...allAnswered('gas'), dents_scratches: 'problem' } }, 'NEGOTIATE', null],
    ['price above comparables', { pricePosition: 'above' }, 'NEGOTIATE', null],
    ['caution listing flag alone', { listingFlags: [flag('as_is')] }, 'LOOKS_GOOD_SO_FAR', null],
    ['info problem only', { answers: { ...allAnswered('gas'), battery_terminals: 'problem' } }, 'LOOKS_GOOD_SO_FAR', null],
    ['everything OK', {}, 'LOOKS_GOOD_SO_FAR', null],
  ])('%s → %s', (_name, over, verdict, scam) => {
    const r = computeVerdict(input(over));
    expect(r.verdict).toBe(verdict);
    if (scam !== null) expect(r.possibleScam).toBe(scam);
  });

  it('counts ok/problem/not_sure toward coverage, not skip or unanswered', () => {
    const items = itemsFor('gas');
    const answers: Record<string, Answer> = {};
    items.slice(0, 10).forEach((i) => (answers[i.id] = 'ok'));
    items.slice(10, 40).forEach((i) => (answers[i.id] = 'skip'));
    const r = computeVerdict(input({ answers }));
    expect(r.coverage).toBeCloseTo(10 / items.length);
    expect(r.verdict).toBe('INCOMPLETE');
  });

  it('sits exactly at the 40% boundary', () => {
    const items = itemsFor('gas').slice(0, 10);
    const answers = Object.fromEntries(items.slice(0, 4).map((i) => [i.id, 'ok' as Answer]));
    expect(computeVerdict(input({ items, answers })).verdict).toBe('LOOKS_GOOD_SO_FAR');
    const fewer = Object.fromEntries(items.slice(0, 3).map((i) => [i.id, 'ok' as Answer]));
    expect(computeVerdict(input({ items, answers: fewer })).verdict).toBe('INCOMPLETE');
  });
});

describe('repair estimate', () => {
  it('sums distinct repair_cost_ids once (oil level + sludge share the head-gasket range)', () => {
    const r = computeVerdict(
      input({ answers: { ...allAnswered('gas'), oil_level_condition: 'problem', oil_cap_sludge: 'problem', dents_scratches: 'problem' } }),
    );
    const hg = cost('head_gasket');
    const dent = cost('dent_repair');
    expect(r.repairs.map((l) => l.cost.id)).toEqual(['head_gasket', 'dent_repair']);
    expect(r.repairs[0].itemIds).toEqual(['oil_level_condition', 'oil_cap_sludge']);
    expect(r.repairEstimate).toEqual({ low: hg.low + dent.low, high: hg.high + dent.high });
  });

  it('is null when no problem has a cost, and ignores not_sure items', () => {
    expect(computeVerdict(input({ answers: { ...allAnswered('gas'), vin_match: 'problem' } })).repairEstimate).toBeNull();
    expect(computeVerdict(input({ answers: { ...allAnswered('gas'), tire_tread: 'not_sure' } })).repairEstimate).toBeNull();
  });
});

describe('reasons and extras', () => {
  it('gives one line per rule that fired plus recalls; flags overlap with known issues', () => {
    const r = computeVerdict(
      input({
        answers: { ...allAnswered('gas'), transmission_shifts: 'problem', dents_scratches: 'problem' },
        topComplaintGroups: ['transmission', 'airbags'],
        openRecallCount: 2,
        listingFlags: [flag('as_is')],
      }),
    );
    expect(r.reasons[0]).toMatch(/^Serious: you found a problem at “.*shift/i);
    expect(r.reasons.some((x) => /^Small: /.test(x))).toBe(true);
    expect(r.reasons[r.reasons.length - 1]).toMatch(/2 recalls/);
    expect(r.knownIssueOverlap).toEqual(['transmission']);
  });

  it('never claims the car is good: the best reason is about the checks done', () => {
    const r = computeVerdict(input());
    expect(r.reasons).toEqual(['No problems found in the checks you did.']);
  });
});

describe('end-to-end scenarios', () => {
  const flagsFrom = (text: string) => matchListingFlags(text).map((m) => m.flag);
  const scenarios: [string, VerdictInput, string, ((r: ReturnType<typeof computeVerdict>) => void) | null][] = [
    ['clean Civic, full coverage', input(), 'LOOKS_GOOD_SO_FAR', null],
    [
      'Altima with the transmission slipping',
      input({ answers: { ...allAnswered('gas'), transmission_shifts: 'problem' }, topComplaintGroups: ['transmission'] }),
      'WALK_AWAY',
      (r) => {
        expect(r.knownIssueOverlap).toEqual(['transmission']);
        expect(r.repairEstimate).toEqual({ low: cost('transmission_repair').low, high: cost('transmission_repair').high });
      },
    ],
    [
      'wire-transfer listing',
      input({ listingFlags: flagsFrom('Pay by wire transfer, car is in storage') }),
      'WALK_AWAY',
      (r) => expect(r.possibleScam).toBe(true),
    ],
    [
      'worn tires + brakes only',
      input({ answers: { ...allAnswered('gas'), tire_tread: 'problem', brake_rotors_visual: 'problem' } }),
      'NEGOTIATE',
      (r) =>
        expect(r.repairEstimate).toEqual({
          low: cost('tires_set').low + cost('brake_pads_rotors_axle').low,
          high: cost('tires_set').high + cost('brake_pads_rotors_axle').high,
        }),
    ],
    ['airbag light not sure', input({ answers: { ...allAnswered('gas'), airbag_light: 'not_sure' } }), 'GET_PRO_INSPECTION', null],
    [
      '30% coverage',
      input({
        answers: Object.fromEntries(
          itemsFor('gas')
            .slice(0, Math.floor(itemsFor('gas').length * 0.3))
            .map((i) => [i.id, 'ok' as Answer]),
        ),
      }),
      'INCOMPLETE',
      null,
    ],
    [
      'rebuilt title in the listing',
      input({ listingFlags: flagsFrom('Rebuilt title, runs great') }),
      'WALK_AWAY',
      (r) => expect(r.possibleScam).toBe(false),
    ],
    ['flood smell inside', input({ answers: { ...allAnswered('gas'), carpet_water: 'problem' } }), 'WALK_AWAY', null],
    [
      'Tesla with battery range concerns',
      input({ pt: 'ev', answers: { ...allAnswered('ev'), ev_battery_health: 'problem' } }),
      'GET_PRO_INSPECTION',
      null,
    ],
    ['Prius, overpriced but clean', input({ pt: 'hybrid', answers: allAnswered('hybrid'), pricePosition: 'above' }), 'NEGOTIATE', null],
    [
      'Jetta TDI with a DPF delete in the listing',
      input({ pt: 'diesel', answers: allAnswered('diesel'), listingFlags: flagsFrom('Tuned, DPF delete, fast') }),
      'GET_PRO_INSPECTION',
      null,
    ],
    [
      'buyer only did the documents',
      input({ answers: { vin_match: 'ok', title_status: 'ok', odometer_plausible: 'ok' } }),
      'INCOMPLETE',
      null,
    ],
  ];

  it.each(scenarios)('%s → %s', (_name, inp, verdict, extra) => {
    const r = computeVerdict(inp);
    expect(r.verdict).toBe(verdict);
    extra?.(r);
  });
});
