import { listingOverall, matchListingFlags } from './matchListingFlags';

const ids = (text: string) => matchListingFlags(text).map((m) => m.flag.id);

describe('matchListingFlags', () => {
  it('flags "wire transfer, car in storage" as a possible scam, offline (M4 acceptance)', () => {
    const m = matchListingFlags('Great car. Payment by Wire Transfer only, car in storage.');
    expect(m[0].flag.id).toBe('wire_or_gift_cards');
    expect(m[0].matched).toEqual(['wire transfer']);
    expect(listingOverall(m)).toBe('possible_scam');
  });

  it.each([
    ['Clean car, one owner, runs great.', []],
    ['REBUILT TITLE, runs and drives', ['salvage_rebuilt']],
    ['Sold as-is. TMU.', ['tmu', 'as_is']],
    ['Sold as‑is', ['as_is']], // non-breaking hyphen
    ['transmission slips a little when cold', ['transmission_hint']],
    ['Has issues with the radio', []], // "as is" must not match inside "has issues"
    ['Flooded basement? no, never flooded car', ['flood_hint']],
  ])('%j → %j', (text, expected) => {
    expect(ids(text).sort()).toEqual([...expected].sort());
  });

  it('sorts by severity and summarizes', () => {
    const m = matchListingFlags('as is, salvage, western union');
    expect(m.map((x) => x.flag.severity)).toEqual(['scam', 'critical', 'caution']);
    expect(listingOverall(matchListingFlags('as is'))).toBe('ask_questions');
    expect(listingOverall([])).toBe('looks_normal');
  });
});
