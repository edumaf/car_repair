import { getModel, MODELS } from '../data/knowledge';
import { computeCheckDigit } from '../vin/vin';
import {
  enginesForPowertrain,
  findModelsByName,
  findModelsByVin,
  listMakes,
  modelComplaintGroups,
  modelsForMake,
  modelYearFromVin,
  problemsFor,
} from './matchModels';

describe('modelYearFromVin', () => {
  it.each([
    ['WVWZZZ1KZAW123456', 2010],
    ['WVWZZZ1KZ8W123456', 2008],
    ['1HGCM82633A004352', 2003],
    ['5YJ3E1EA5KF900001', 2019],
    ['2HGFC2F78JH900001', 2018],
    ['WVWZZZ1KZ0W123456', null], // 0 is never a year code
  ])('%s → %s', (vin, year) => expect(modelYearFromVin(vin, 2026)).toBe(year));

  it('picks the latest cycle that is not in the future', () => {
    expect(modelYearFromVin('XXXXXXXXXAX', 2026)).toBe(2010);
    expect(modelYearFromVin('XXXXXXXXXYX', 2026)).toBe(2000);
    expect(modelYearFromVin('XXXXXXXXXTX', 2026)).toBe(2026);
  });
});

describe('findModelsByVin', () => {
  it('recognises a European VW Golf 6 from the model code and year', () => {
    const r = findModelsByVin('WVWZZZ1KZBW123456', MODELS, 2026);
    expect(r.make).toBe('Volkswagen');
    expect(r.year).toBe(2011);
    expect(r.candidates.map((m) => m.id)).toEqual(['vw_golf_mk6']);
  });

  it('a Golf 5 VIN (same "1K" code, 2005) gives the Mk5', () => {
    expect(findModelsByVin('WVWZZZ1KZ5W123456', MODELS, 2026).candidates.map((m) => m.id)).toEqual(['vw_golf_mk5']);
  });

  it('knows the make from the manufacturer code (Dacia) and lists its models for the year', () => {
    const r = findModelsByVin('UU1HSDACN45123456', MODELS, 2026);
    expect(r.make).toBe('Dacia');
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates.every((m) => m.make === 'Dacia')).toBe(true);
  });

  it('returns nothing for an unknown manufacturer', () => {
    expect(findModelsByVin('ZZZ00000000000000', MODELS, 2026)).toMatchObject({ make: null, candidates: [] });
  });

  it('works with the real check digit layout (US VINs)', () => {
    const draft = '5YJ3E1EA0KF900001';
    const vin = draft.slice(0, 8) + computeCheckDigit(draft) + draft.slice(9);
    expect(findModelsByVin(vin, MODELS, 2026).candidates.map((m) => m.id)).toContain('tesla_model_3');
  });
});

describe('findModelsByName', () => {
  it.each([
    ['HONDA', 'CR-V', 2015, 'honda_crv_4'],
    ['Honda', 'Civic', 2018, 'honda_civic_10'],
    ['TOYOTA', 'Prius', 2017, 'toyota_prius_xw50'],
    ['Vauxhall', 'Astra', 2012, 'opel_astra_j'],
    ['KIA', 'Sportage', 2017, 'hyundai_tucson_tl'],
    ['FORD', 'F-150', 2015, 'ford_f150_13'],
    ['Ford', 'Fusion', 2016, 'ford_mondeo_5'],
  ])('%s %s %s → %s', (make, model, year, id) => {
    expect(findModelsByName(make, model, year).map((m) => m.id)).toContain(id);
  });

  it('returns nothing without a make or model', () => {
    expect(findModelsByName(null, 'Golf', 2010)).toEqual([]);
  });
});

describe('problems and engines', () => {
  const golf6 = getModel('vw_golf_mk6')!;

  it('splits problems by engine', () => {
    const tsi = problemsFor(golf6, 'tsi14', 2010);
    expect(tsi.relevant.map((p) => p.id)).toContain('timing_chain_tsi');
    expect(tsi.relevant.map((p) => p.id)).not.toContain('egr_dpf');
    expect(tsi.other.map((p) => p.id)).toContain('egr_dpf');
    const all = problemsFor(golf6, null, null);
    expect(all.other).toEqual([]);
  });

  it('orders common before occasional, then by severity', () => {
    const { relevant } = problemsFor(golf6, 'tdi20', 2011);
    const freqs = relevant.map((p) => p.frequency);
    expect(freqs.indexOf('occasional') === -1 || freqs.lastIndexOf('common') < freqs.indexOf('occasional')).toBe(true);
  });

  it('gives the complaint groups to prioritise in the inspection', () => {
    expect(modelComplaintGroups(golf6, 'tsi14', 2010)).toEqual(expect.arrayContaining(['engine', 'transmission']));
    expect(modelComplaintGroups(null, null, null)).toEqual([]);
  });

  it('filters engines by powertrain and lists makes/models', () => {
    expect(enginesForPowertrain(golf6, 'diesel').map((e) => e.id)).toEqual(['tdi16', 'tdi20']);
    expect(listMakes()).toEqual(expect.arrayContaining(['Dacia', 'Volkswagen', 'Toyota', 'Tesla']));
    expect(modelsForMake('Dacia').length).toBeGreaterThanOrEqual(5);
  });
});
