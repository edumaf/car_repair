import { linearFit, median, priceCheck } from './priceCheck';

describe('helpers', () => {
  it('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it('linear fit, including equal x', () => {
    expect(
      linearFit([
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ]),
    ).toEqual({ a: 10, b: -1 });
    expect(
      linearFit([
        { x: 5, y: 10 },
        { x: 5, y: 20 },
      ]),
    ).toEqual({ a: 15, b: 0 });
  });
});

describe('priceCheck', () => {
  // Price drops 50 per 1,000 miles from 12,000 at 0 miles, with a little noise.
  const comps = [
    { price: 9_100, mileage: 60_000, year: 2016 },
    { price: 8_400, mileage: 70_000, year: 2016 },
    { price: 8_050, mileage: 80_000, year: 2017 },
    { price: 7_400, mileage: 90_000, year: 2015 },
  ];

  it.each<[number | null, string]>([
    [8_600, 'within'],
    [10_500, 'above'],
    [6_500, 'below'],
    [null, 'unknown'],
  ])('asking %p → %s', (asking, position) => {
    const r = priceCheck({ askingPrice: asking, mileage: 75_000, year: 2016 }, comps);
    expect(r.note).toBe('ok');
    expect(r.position).toBe(position);
    expect(r.predicted).toBeGreaterThan(8_000);
    expect(r.predicted).toBeLessThan(8_700);
    expect(r.fairRange!.low).toBeLessThan(r.predicted!);
    expect(r.fairRange!.high).toBeGreaterThan(r.predicted!);
    expect(r.fairRange!.low % 50).toBe(0);
  });

  it('uses at least a ±5% band when the comps fit perfectly', () => {
    const perfect = [0, 10_000, 20_000].map((m) => ({ price: 10_000 - m / 10, mileage: m, year: null }));
    const r = priceCheck({ askingPrice: 9_000, mileage: 10_000, year: null }, perfect);
    expect(r.predicted).toBe(9_000);
    expect(r.fairRange).toEqual({ low: 8_550, high: 9_450 });
  });

  it('with fewer than 3 comps shows min/median/max only', () => {
    const r = priceCheck({ askingPrice: 9_000, mileage: 70_000, year: 2016 }, comps.slice(0, 2));
    expect(r).toMatchObject({
      position: 'unknown',
      fairRange: null,
      note: 'need_more_comps',
      stats: { min: 8_400, median: 8_750, max: 9_100, count: 2 },
    });
  });

  it('needs the car mileage for a fit', () => {
    expect(priceCheck({ askingPrice: 9_000, mileage: null, year: 2016 }, comps).note).toBe('need_mileage');
  });

  it('ignores comps more than a year away when years are known (if any remain)', () => {
    const r = priceCheck({ askingPrice: 9_000, mileage: 70_000, year: 2016 }, [...comps, { price: 30_000, mileage: 10_000, year: 2022 }]);
    expect(r.stats!.max).toBe(9_100);
  });

  it('handles no comps and junk prices', () => {
    expect(priceCheck({ askingPrice: 1, mileage: 1, year: 1 }, []).note).toBe('no_comps');
    expect(priceCheck({ askingPrice: 1, mileage: 1, year: 1 }, [{ price: 0, mileage: 1, year: 1 }]).note).toBe('no_comps');
  });
});
