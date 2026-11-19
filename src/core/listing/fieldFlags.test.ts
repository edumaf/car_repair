import type { PriceCheckResult } from '../price/priceCheck';
import { FAR_BELOW_SHARE, listingFlagsForCar, mentionsMileage, priceFarBelowSimilar } from './fieldFlags';

const fit = (predicted: number): PriceCheckResult => ({
  position: 'within',
  predicted,
  fairRange: { low: predicted * 0.9, high: predicted * 1.1 },
  stats: { min: predicted * 0.8, median: predicted, max: predicted * 1.2, count: 4 },
  note: 'ok',
  compsUsed: 4,
});
const statsOnly = (median: number, count: number): PriceCheckResult => ({
  position: 'unknown',
  predicted: null,
  fairRange: null,
  stats: { min: median, median, max: median, count },
  note: 'need_more_comps',
  compsUsed: count,
});

describe('priceFarBelowSimilar', () => {
  it.each([
    [7000, fit(10000), true],
    [7500, fit(10000), false], // exactly 75% is not "far below"
    [9000, fit(10000), false],
    [6000, statsOnly(10000, 2), true],
    [6000, statsOnly(10000, 1), false], // one listing is not enough
    [null, fit(10000), false],
    [6000, null, false],
  ])('asking %s → %s', (asking, price, expected) => expect(priceFarBelowSimilar(asking, price)).toBe(expected));
  it('uses the documented share', () => expect(FAR_BELOW_SHARE).toBe(0.75));
});

describe('mentionsMileage', () => {
  it.each([
    '2013 Altima, 112,000 miles, clean title',
    'Only 98000 mi!',
    '112k, runs great',
    '150k km, full history',
    'Mileage: 87000',
    'Golf 6, 180.000 km reali',
    'Rulaj 210000, carte service',
    'kilometraj: 145000',
  ])('finds it in "%s"', (text) => expect(mentionsMileage(text)).toBe(true));
  it.each(['Runs great, cold AC, new tires. $4,900 OBO', 'Vând Logan 2012, stare foarte bună, acte la zi'])(
    'finds none in "%s"',
    (text) => expect(mentionsMileage(text)).toBe(false),
  );
});

describe('listingFlagsForCar', () => {
  const ids = (m: { flag: { id: string } }[]) => m.map((x) => x.flag.id);

  it('adds the price flag even without listing text', () => {
    expect(ids(listingFlagsForCar({ listingText: null, askingPrice: 5000, mileage: 100000 }, fit(10000)))).toEqual(['price_far_below_similar']);
  });

  it('flags missing mileage only with listing text and no mileage entered', () => {
    const text = 'Runs great, cold AC, new tires.';
    expect(ids(listingFlagsForCar({ listingText: text, askingPrice: null, mileage: null }, null))).toEqual(['mileage_not_stated']);
    expect(ids(listingFlagsForCar({ listingText: text, askingPrice: null, mileage: 90000 }, null))).toEqual([]);
    expect(ids(listingFlagsForCar({ listingText: null, askingPrice: null, mileage: null }, null))).toEqual([]);
  });

  it('keeps phrase matches and sorts by severity (scam first)', () => {
    const r = listingFlagsForCar({ listingText: 'Wire transfer only, car is in storage', askingPrice: 3000, mileage: 50000 }, fit(10000));
    expect(r[0].flag.severity).toBe('scam');
    expect(ids(r)).toContain('price_far_below_similar');
    const severities = r.map((m) => m.flag.severity);
    const order = { scam: 0, critical: 1, major: 2, caution: 3 } as const;
    expect([...severities].sort((a, b) => order[a] - order[b])).toEqual(severities);
  });
});
