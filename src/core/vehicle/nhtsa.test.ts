import { COMPLAINT_KEYWORD_GROUPS } from '../data/seed';
import { displayModel } from './normalize';
import { NhtsaError, getVehicleReport, listMakes, listModels, makeHttpGet, modelVariants, type HttpGet } from './nhtsa';

/** A fake NHTSA: maps URL substrings to responses; records every URL asked for. */
function fakeHttp(routes: [RegExp, unknown | (() => unknown)][]) {
  const calls: string[] = [];
  const http: HttpGet = async (url) => {
    calls.push(url);
    for (const [re, resp] of routes) {
      if (re.test(url)) {
        const v = typeof resp === 'function' ? (resp as () => unknown)() : resp;
        if (v instanceof Error) throw v;
        return v;
      }
    }
    return { count: 0, results: [], Results: [] };
  };
  return { http, calls };
}

const civicDecode = {
  Results: [
    {
      ModelYear: '2018',
      Make: 'HONDA',
      Model: 'Civic',
      Trim: 'EX',
      FuelTypePrimary: 'Gasoline',
      DisplacementL: '2.0',
      EngineCylinders: '4',
      DriveType: 'FWD/Front-Wheel Drive',
      ErrorCode: '0',
    },
  ],
};

describe('modelVariants', () => {
  it.each([
    ['F-150', ['F-150', 'F150', 'F 150']],
    ['F150', ['F150', 'F-150']],
    ['Civic Hybrid', ['Civic Hybrid']],
    ['Model 3', ['Model 3']],
    ['CX5', ['CX5', 'CX-5']],
  ])('%s → %j', (input, expected) => {
    expect(modelVariants(input)).toEqual(expected);
  });
});

describe('displayModel', () => {
  it.each([
    ['CIVIC SI', 'Civic SI'],
    ['CR-V', 'CR-V'],
    ['MODEL 3', 'Model 3'],
    ['F-150', 'F-150'],
    ['RAV4', 'RAV4'],
    ['PRIUS PRIME', 'Prius Prime'],
    ['Civic', 'Civic'],
  ])('%s → %s', (input, out) => expect(displayModel(input)).toBe(out));
});

describe('makeHttpGet', () => {
  const res = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;

  it('returns JSON on 200', async () => {
    const http = makeHttpGet((async () => res(200, { a: 1 })) as unknown as typeof fetch);
    await expect(http('u')).resolves.toEqual({ a: 1 });
  });

  it('treats NHTSA\'s "400 + empty results" as an empty answer', async () => {
    const http = makeHttpGet((async () => res(400, { count: 0, results: [] })) as unknown as typeof fetch);
    await expect(http('u')).resolves.toEqual({ count: 0, results: [] });
  });

  it('throws on other errors', async () => {
    const http = makeHttpGet((async () => res(500, { message: 'boom' })) as unknown as typeof fetch);
    await expect(http('u')).rejects.toMatchObject({ code: 'network' });
  });

  it('times out', async () => {
    const hang = ((_u: string, init: RequestInit) =>
      new Promise((_r, reject) =>
        init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))),
      )) as unknown as typeof fetch;
    await expect(makeHttpGet(hang, 10)('u')).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('getVehicleReport', () => {
  it('builds a full report from a VIN', async () => {
    const { http, calls } = fakeHttp([
      [/DecodeVinValues/, civicDecode],
      [
        /recallsByVehicle.*model=Civic/,
        { results: [{ NHTSACampaignNumber: '20V314000', Component: 'FUEL SYSTEM', ReportReceivedDate: '28/05/2020' }] },
      ],
      [/complaintsByVehicle.*model=Civic/, { results: [{ odiNumber: 1, components: 'STEERING', summary: 'Steering felt heavy.' }] }],
      [/SafetyRatings\/modelyear/, { Results: [{ VehicleId: 12345 }] }],
      [/SafetyRatings\/VehicleId\/12345/, { Results: [{ OverallRating: '5', VehicleDescription: '2018 Honda Civic 4 DR FWD' }] }],
    ]);
    const r = await getVehicleReport(http, { vin: '2HGFC2F78JH900001' }, COMPLAINT_KEYWORD_GROUPS, () => 42);
    expect(r.decode).toMatchObject({ year: 2018, make: 'Honda', model: 'Civic', powertrain: 'gas', vin: '2HGFC2F78JH900001' });
    expect(r.recalls?.map((x) => x.campaign)).toEqual(['20V314000']);
    expect(r.complaints?.groups).toEqual([{ group: 'steering', count: 1, samples: ['Steering felt heavy.'] }]);
    expect(r.safety?.overall).toBe(5);
    expect(r.fetchedAt).toBe(42);
    expect(calls.some((u) => u.includes('make=Honda'))).toBe(true);
  });

  it('throws not_found when the VIN does not decode', async () => {
    const { http } = fakeHttp([[/DecodeVinValues/, { Results: [{ ModelYear: '', Make: '', Model: '', ErrorCode: '11' }] }]]);
    await expect(getVehicleReport(http, { vin: 'XXXXXXXXXXXXXXXXX' }, COMPLAINT_KEYWORD_GROUPS)).rejects.toBeInstanceOf(NhtsaError);
  });

  it('tries model-name variants when the first name returns nothing', async () => {
    const { http, calls } = fakeHttp([
      [/recallsByVehicle.*model=F-150/, { results: [{ NHTSACampaignNumber: '18V894000', Component: 'X' }] }],
    ]);
    const r = await getVehicleReport(http, { year: 2015, make: 'FORD', model: 'F150' }, COMPLAINT_KEYWORD_GROUPS);
    expect(r.recalls?.map((x) => x.campaign)).toEqual(['18V894000']);
    expect(calls.filter((u) => u.includes('recallsByVehicle')).map((u) => decodeURIComponent(u.split('model=')[1].split('&')[0]))).toEqual([
      'F150',
      'F-150',
    ]);
    expect(r.decode).toMatchObject({ make: 'Ford', model: 'F150', vin: null });
    expect(r.complaints?.total).toBe(0);
  });

  it("falls back to NHTSA's own model names for the make/year", async () => {
    const { http } = fakeHttp([
      [/products\/vehicle\/models/, { results: [{ model: 'CIVIC SI' }, { model: 'ACCORD' }] }],
      [/recallsByVehicle.*model=CIVIC%20SI/, { results: [{ NHTSACampaignNumber: '19V001000', Component: 'X' }] }],
    ]);
    const r = await getVehicleReport(http, { year: 2018, make: 'HONDA', model: 'CIVIC' }, COMPLAINT_KEYWORD_GROUPS);
    expect(r.recalls?.map((x) => x.campaign)).toEqual(['19V001000']);
    expect(r.decode.model).toBe('Civic');
  });

  it('returns partial results when one section fails', async () => {
    const { http } = fakeHttp([
      [/DecodeVinValues/, civicDecode],
      [/complaintsByVehicle/, new NhtsaError('timeout', 'slow')],
      [/products\/vehicle\/models/, new NhtsaError('timeout', 'slow')],
    ]);
    const r = await getVehicleReport(http, { vin: '2HGFC2F78JH900001' }, COMPLAINT_KEYWORD_GROUPS);
    expect(r.complaints).toBeNull();
    expect(r.recalls).toEqual([]);
    expect(r.safety).toBeNull();
  });
});

describe('lists', () => {
  it('merges recall and complaint makes/models, deduped by normalized name', async () => {
    const { http } = fakeHttp([
      [/makes.*issueType=r/, { results: [{ make: 'HONDA' }, { make: 'FORD' }] }],
      [/makes.*issueType=c/, { results: [{ make: 'HONDA' }, { make: 'TESLA' }] }],
      [/models.*issueType=r/, { results: [{ model: 'CIVIC' }, { model: 'CR-V' }] }],
      [/models.*issueType=c/, { results: [{ model: 'CIVIC' }, { model: 'CRV' }] }],
    ]);
    expect(await listMakes(http, 2018)).toEqual(['FORD', 'HONDA', 'TESLA']);
    expect(await listModels(http, 2018, 'HONDA')).toEqual(['CIVIC', 'CRV']);
  });

  it('throws when both lists fail', async () => {
    const { http } = fakeHttp([[/makes/, new NhtsaError('network', 'down')]]);
    await expect(listMakes(http, 2018)).rejects.toMatchObject({ code: 'network' });
  });
});
