import { COMPLAINT_KEYWORD_GROUPS } from '../data/seed';
import {
  derivePowertrain,
  displayMake,
  groupsForComponents,
  modelWithClass,
  normalizeDecode,
  normalizeRecalls,
  normalizeSafety,
  parseNhtsaDate,
  shortenSample,
  summarizeComplaints,
  topComplaintGroups,
} from './normalize';

describe('derivePowertrain', () => {
  it.each([
    [{ electrification: 'BEV (Battery Electric Vehicle)', fuelPrimary: 'Electric' }, 'ev'],
    [{ electrification: 'FCEV (Fuel Cell Electric Vehicle)', fuelPrimary: 'Hydrogen' }, 'ev'],
    [{ fuelPrimary: 'Electric' }, 'ev'],
    [{ electrification: 'PHEV (Plug-in Hybrid Electric Vehicle)', fuelPrimary: 'Gasoline', fuelSecondary: 'Electric' }, 'hybrid'],
    [{ electrification: 'Strong HEV (Hybrid Electric Vehicle)', fuelPrimary: 'Gasoline', fuelSecondary: 'Electric' }, 'hybrid'],
    [{ electrification: 'Mild HEV (Hybrid Electric Vehicle)', fuelPrimary: 'Gasoline' }, 'gas'],
    [{ fuelPrimary: 'Diesel' }, 'diesel'],
    [{ fuelPrimary: 'Gasoline' }, 'gas'],
    [{ fuelPrimary: 'Flexible Fuel Vehicle (FFV)', fuelSecondary: 'Gasoline' }, 'gas'],
    [{}, 'gas'],
  ] as const)('%j → %s', (fields, expected) => {
    expect(derivePowertrain(fields)).toBe(expected);
  });
});

describe('displayMake', () => {
  it.each([
    ['HONDA', 'Honda'],
    ['MERCEDES-BENZ', 'Mercedes-Benz'],
    ['LAND ROVER', 'Land Rover'],
    ['BMW', 'BMW'],
    ['GMC', 'GMC'],
  ])('%s → %s', (input, out) => expect(displayMake(input)).toBe(out));
});

describe('modelWithClass', () => {
  it.each([
    ['Silverado', '1500', 'Silverado 1500'],
    ['Sierra', '2500HD', 'Sierra 2500HD'],
    ['Silverado', '3500 HD', 'Silverado 3500 HD'],
    ['1500', '1500', '1500'], // Ram: already the model
    ['F-150', 'XLT', 'F-150'], // not a load class
    ['Civic', null, 'Civic'],
    [null, '1500', null],
  ])('%s + %s → %s', (model, series, out) => expect(modelWithClass(model, series)).toBe(out));

  it('decodes a Silverado 1500 VIN as "Silverado 1500" with the trim kept', () => {
    const d = normalizeDecode({ ModelYear: '2016', Make: 'CHEVROLET', Model: 'Silverado', Series: '1500', Trim: 'LT' }, null);
    expect(d.model).toBe('Silverado 1500');
    expect(d.trim).toBe('LT');
    const noTrim = normalizeDecode({ ModelYear: '2016', Make: 'CHEVROLET', Model: 'Silverado', Series: '1500', Trim: '' }, null);
    expect(noTrim.trim).toBeNull();
  });
});

describe('normalizeDecode', () => {
  it('maps vPIC fields', () => {
    const d = normalizeDecode(
      {
        ModelYear: '2018',
        Make: 'HONDA',
        Model: 'Civic',
        Trim: 'EX',
        BodyClass: 'Sedan/Saloon',
        FuelTypePrimary: 'Gasoline',
        ElectrificationLevel: '',
        DisplacementL: '2.0',
        EngineCylinders: '4',
        Turbo: '',
        DriveType: 'FWD/Front-Wheel Drive',
        PlantCountry: 'UNITED STATES (USA)',
        ErrorCode: '0',
      },
      '2HGFC2F78JH900001',
    );
    expect(d).toEqual({
      vin: '2HGFC2F78JH900001',
      year: 2018,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      body: 'Sedan/Saloon',
      powertrain: 'gas',
      engineDesc: '2.0L 4-cyl',
      drive: 'FWD',
      plantCountry: 'UNITED STATES (USA)',
      decodeWarnings: [],
    });
  });

  it('handles EVs, missing fields and error codes', () => {
    const d = normalizeDecode(
      {
        ModelYear: '',
        Make: 'TESLA',
        ElectrificationLevel: 'BEV (Battery Electric Vehicle)',
        DriveType: '4x2',
        ErrorCode: '1,6',
        Series: 'Long Range',
      },
      null,
    );
    expect(d.year).toBeNull();
    expect(d.powertrain).toBe('ev');
    expect(d.engineDesc).toBe('Electric motor');
    expect(d.drive).toBe('2WD');
    expect(d.trim).toBe('Long Range');
    expect(d.decodeWarnings).toEqual(['1', '6']);
  });

  it('describes turbo diesels', () => {
    const d = normalizeDecode({ FuelTypePrimary: 'Diesel', DisplacementL: '2', EngineCylinders: '4', Turbo: 'Yes' }, null);
    expect(d.engineDesc).toBe('2.0L 4-cyl turbo diesel');
  });
});

describe('recalls', () => {
  it('parses NHTSA dates', () => {
    expect(parseNhtsaDate('28/05/2020', 'dmy')).toBe('2020-05-28');
    expect(parseNhtsaDate('10/31/2026', 'mdy')).toBe('2026-10-31');
    expect(parseNhtsaDate(null, 'dmy')).toBeNull();
  });

  it('dedupes by campaign and sorts newest first', () => {
    const rows = [
      { NHTSACampaignNumber: '18V001000', Component: 'AIR BAGS', Summary: 'a', ReportReceivedDate: '01/02/2018', parkIt: true },
      { NHTSACampaignNumber: '20V314000', Component: 'FUEL SYSTEM', Summary: 'b', ReportReceivedDate: '28/05/2020', parkOutSide: true },
      { NHTSACampaignNumber: '18V001000', Component: 'AIR BAGS', Summary: 'dup', ReportReceivedDate: '01/02/2018' },
    ];
    const r = normalizeRecalls(rows);
    expect(r.map((x) => x.campaign)).toEqual(['20V314000', '18V001000']);
    expect(r[1]).toMatchObject({ summary: 'a', parkIt: true, parkOutside: false, reportDate: '2018-02-01' });
    expect(r[0].parkOutside).toBe(true);
  });
});

describe('complaints', () => {
  it('maps component strings to groups by substring', () => {
    expect(groupsForComponents('POWER TRAIN', COMPLAINT_KEYWORD_GROUPS)).toEqual(['transmission']);
    expect(groupsForComponents('ENGINE AND ENGINE COOLING,ELECTRICAL SYSTEM', COMPLAINT_KEYWORD_GROUPS).sort()).toEqual([
      'electrical',
      'engine',
    ]);
    expect(groupsForComponents('UNKNOWN OR OTHER', COMPLAINT_KEYWORD_GROUPS)).toEqual([]);
    expect(groupsForComponents('', COMPLAINT_KEYWORD_GROUPS)).toEqual([]);
  });

  it('shortens samples at a word boundary', () => {
    const long = 'word '.repeat(80);
    const s = shortenSample(long);
    expect(s.length).toBeLessThanOrEqual(200);
    expect(s.endsWith('…')).toBe(true);
    expect(shortenSample('  short   text ')).toBe('short text');
  });

  it('counts per group once per complaint, keeps 3 newest samples, totals flags', () => {
    const rows = [
      { odiNumber: 1, components: 'POWER TRAIN', summary: 'old cvt', crash: true, numberOfInjuries: 1 },
      { odiNumber: 2, components: 'POWER TRAIN,ENGINE', summary: 'two', fire: true },
      { odiNumber: 3, components: 'POWER TRAIN', summary: 'three' },
      { odiNumber: 4, components: 'POWER TRAIN', summary: 'four', numberOfDeaths: 1 },
      { odiNumber: 5, components: 'UNKNOWN OR OTHER', summary: 'x' },
    ];
    const c = summarizeComplaints(rows, COMPLAINT_KEYWORD_GROUPS);
    expect(c).toMatchObject({ total: 5, crashes: 1, fires: 1, injuries: 1, deaths: 1, ungrouped: 1 });
    expect(c.groups).toEqual([
      { group: 'transmission', count: 4, samples: ['four', 'three', 'two'] },
      { group: 'engine', count: 1, samples: ['two'] },
    ]);
    expect(topComplaintGroups(c, 1)).toEqual(['transmission']);
    expect(topComplaintGroups(null)).toEqual([]);
  });
});

describe('normalizeSafety', () => {
  it('reads star ratings and treats "Not Rated" as null', () => {
    expect(normalizeSafety({ OverallRating: '5', VehicleDescription: '2018 Honda Civic 4 DR FWD' })).toEqual({
      overall: 5,
      vehicleDescription: '2018 Honda Civic 4 DR FWD',
    });
    expect(normalizeSafety({ OverallRating: 'Not Rated', VehicleDescription: 'x' })?.overall).toBeNull();
    expect(normalizeSafety(undefined)).toBeNull();
  });
});
