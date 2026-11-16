import { COMPLAINT_KEYWORD_GROUPS } from '../../data/seed';
import { checkVin } from '../../vin/vin';
import { FIXTURE_CARS, FIXTURE_REPORTS, findFixture, mockPhotoCheckClient, mockVehicleClient } from './mockClients';

describe('mock fixtures', () => {
  it('cover the six CLAUDE.md §4 cars, one per required powertrain', () => {
    expect(FIXTURE_CARS.map((c) => c.id).sort()).toEqual(['altima_2013', 'civic_2018', 'f150_2015', 'jetta_tdi_2012', 'model3_2019', 'prius_2017']);
    const pt = Object.fromEntries(FIXTURE_CARS.map((c) => [c.id, c.powertrain]));
    expect(pt).toMatchObject({ prius_2017: 'hybrid', model3_2019: 'ev', jetta_tdi_2012: 'diesel', civic_2018: 'gas' });
  });

  it('have valid VINs (incl. check digit) that match their decode', () => {
    for (const c of FIXTURE_CARS) {
      expect(checkVin(c.vin)).toEqual({ vin: c.vin, problem: null, checkDigitOk: true });
      const r = FIXTURE_REPORTS[c.id];
      expect(r.decode).toMatchObject({ vin: c.vin, year: c.year, powertrain: c.powertrain });
    }
  });

  it('only use complaint groups that exist in the checklist data', () => {
    const groups = new Set(Object.keys(COMPLAINT_KEYWORD_GROUPS));
    for (const r of Object.values(FIXTURE_REPORTS)) {
      for (const g of r.complaints?.groups ?? []) {
        expect(groups.has(g.group)).toBe(true);
        expect(g.samples.every((s) => s.length <= 200)).toBe(true);
      }
    }
  });

  it('include a model with no complaint data (partial results case)', () => {
    expect(FIXTURE_REPORTS.f150_2015.complaints?.total).toBe(0);
  });
});

describe('mockVehicleClient', () => {
  it('finds by VIN (any case/spacing) and by year/make/model', async () => {
    const byVin = await mockVehicleClient.getReport({ vin: ' 2hgfc2f78jh900001 ' });
    expect(byVin.decode.model).toBe('Civic');
    expect(findFixture({ year: 2015, make: 'FORD', model: 'F150' })?.decode.model).toBe('F-150');
  });

  it('rejects unknown cars with not_found', async () => {
    await expect(mockVehicleClient.getReport({ vin: '1HGCM82633A004352' })).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('mockPhotoCheckClient', () => {
  it('returns schema-shaped canned results', async () => {
    const r = await mockPhotoCheckClient.check({ imageUri: 'file://x.jpg', photoType: 'dashboard_lights', car: { year: 2018, make: 'Honda', model: 'Civic', powertrain: 'gas' } });
    expect(r.quality.ok).toBe(true);
    expect(r.lights).toContain('check_engine');
  });
});
