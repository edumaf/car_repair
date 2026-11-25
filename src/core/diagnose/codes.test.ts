import { setLang } from '../i18n/i18n';
import { lookupCode, normalizeCode, searchCodes, searchSymptoms, sortCauses } from './codes';

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

  it('in Romanian, also finds codes by Romanian words, with or without diacritics', () => {
    setLang('ro');
    try {
      expect(searchCodes('rateuri').some((c) => c.code === 'P0301')).toBe(true);
      expect(searchCodes('catalizatorului').map((c) => c.code)).toEqual(expect.arrayContaining(['P0420']));
      expect(searchCodes('presiunea uleiului').some((c) => c.code === 'P0524')).toBe(true);
      expect(searchCodes('supraincalzeste').some((c) => c.code === 'P0217')).toBe(true);
    } finally {
      setLang('en');
    }
  });
});

it('sorts causes by likelihood', () => {
  expect(
    sortCauses([{ likelihood: 'rare' as const }, { likelihood: 'common' as const }, { likelihood: 'possible' as const }]).map(
      (c) => c.likelihood,
    ),
  ).toEqual(['common', 'possible', 'rare']);
});

describe('searchSymptoms', () => {
  it('finds symptom flows by words', () => {
    expect(searchSymptoms('shakes idle').map((s) => s.id)).toContain('shakes_idle');
    expect(searchSymptoms('noise braking').length).toBeGreaterThan(0);
    expect(searchSymptoms('P0')).toEqual([]);
    expect(searchSymptoms('')).toEqual([]);
  });
  it('in Romanian, by Romanian words without diacritics', () => {
    setLang('ro');
    try {
      expect(searchSymptoms('nu porneste').length).toBeGreaterThan(0);
      expect(searchSymptoms('zgomot franare').length).toBeGreaterThan(0);
    } finally {
      setLang('en');
    }
  });
});
