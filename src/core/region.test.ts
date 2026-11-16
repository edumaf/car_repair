import { defaultMileageUnit, historyLinks, money, regionFromLocale, showRepairCosts } from './region';

describe('region', () => {
  it.each([
    ['en-US', 'us'],
    ['en-GB', 'uk'],
    ['ro-RO', 'ro'],
    ['de-DE', 'eu'],
    ['fr_FR', 'eu'],
    ['ja-JP', 'other'],
    ['en', 'other'],
    [undefined, 'other'],
  ])('%s → %s', (locale, region) => expect(regionFromLocale(locale as string)).toBe(region));

  it('shows US repair prices only in the US, and miles in the US/UK', () => {
    expect(showRepairCosts('us')).toBe(true);
    expect(showRepairCosts('ro')).toBe(false);
    expect(defaultMileageUnit('uk')).toBe('mi');
    expect(defaultMileageUnit('ro')).toBe('km');
  });

  it('links to official history checks for the UK and Romania only', () => {
    expect(historyLinks('uk')[0].url).toContain('gov.uk');
    expect(historyLinks('ro')[0].url).toContain('rarom.ro');
    expect(historyLinks('us')).toEqual([]);
  });
});

it('formats prices in the region currency', () => {
  expect(money(15900, 'us')).toBe('$15,900');
  expect(money(8500, 'ro')).toBe('€8,500');
  expect(money(8500, 'other')).toBe('8,500');
});
