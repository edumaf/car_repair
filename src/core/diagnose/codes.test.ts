import { lookupCode, normalizeCode, searchCodes, sortCauses } from './codes';

describe('normalizeCode', () => {
  it.each([
    ['p0301', 'P0301'],
    [' P 0301 ', 'P0301'],
    ['0420', 'P0420'],
    ['u0100', 'U0100'],
  ])('%j → %s', (i, o) => expect(normalizeCode(i)).toBe(o));
});

describe('lookupCode', () => {
  it('finds a known generic code', () => {
    const r = lookupCode('p0301');
    expect(r.kind).toBe('known');
    if (r.kind === 'known') {
      expect(r.code.title).toMatch(/Cylinder 1 misfire/);
      expect(r.code.causes.length).toBeGreaterThan(1);
    }
  });

  it.each([
    ['P1234', 'manufacturer'],
    ['B1000', 'manufacturer'],
    ['C3100', 'manufacturer'],
    ['P0999', 'unknown_generic'],
    ['hello', 'invalid'],
    ['P03011', 'invalid'],
  ])('%s → %s', (input, kind) => expect(lookupCode(input).kind).toBe(kind));
});

describe('searchCodes', () => {
  it('searches by code prefix and by words', () => {
    expect(searchCodes('P030').map((c) => c.code)).toEqual(expect.arrayContaining(['P0300', 'P0301', 'P0308']));
    expect(searchCodes('catalytic').map((c) => c.code)).toEqual(expect.arrayContaining(['P0420', 'P0430']));
    expect(searchCodes('oil pressure').some((c) => c.code === 'P0524')).toBe(true);
    expect(searchCodes('')).toEqual([]);
  });
});

it('sorts causes by likelihood', () => {
  expect(
    sortCauses([{ likelihood: 'rare' as const }, { likelihood: 'common' as const }, { likelihood: 'possible' as const }]).map(
      (c) => c.likelihood,
    ),
  ).toEqual(['common', 'possible', 'rare']);
});
