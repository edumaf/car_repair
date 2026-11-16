import { assertEquals, assert } from 'jsr:@std/assert@1';

import { handleVehicle, type VehicleCache } from './handler.ts';

const auth =
  (ok = true) =>
  () =>
    Promise.resolve(ok ? 'user-1' : null);
const post = (body: unknown) => new Request('http://x/vehicle', { method: 'POST', body: JSON.stringify(body) });
const quiet = () => {};

function fakeHttp(routes: [RegExp, unknown][]) {
  const calls: string[] = [];
  return {
    calls,
    http: (url: string) => {
      calls.push(url);
      for (const [re, v] of routes) if (re.test(url)) return Promise.resolve(v);
      return Promise.resolve({ count: 0, results: [], Results: [] });
    },
  };
}

function memoryCache(): VehicleCache & { store: Map<string, { payload: unknown; fetchedAt: number }> } {
  const store = new Map<string, { payload: unknown; fetchedAt: number }>();
  return {
    store,
    get: (k) => Promise.resolve(store.get(k) ?? null),
    put: (k, p) => (store.set(k, { payload: p, fetchedAt: 1000 }), Promise.resolve()),
  };
}

const decode = { Results: [{ ModelYear: '2018', Make: 'HONDA', Model: 'Civic', FuelTypePrimary: 'Gasoline', ErrorCode: '0' }] };

Deno.test('rejects unauthenticated and bad requests', async () => {
  assertEquals((await handleVehicle(post({ vin: '2HGFC2F78JH900001' }), { authenticate: auth(false), log: quiet })).status, 401);
  assertEquals((await handleVehicle(post({ vin: 'BAD' }), { authenticate: auth(), log: quiet })).status, 400);
  assertEquals((await handleVehicle(new Request('http://x', { method: 'GET' }), { authenticate: auth(), log: quiet })).status, 405);
});

Deno.test('builds a report by VIN and caches it', async () => {
  const { http, calls } = fakeHttp([
    [/DecodeVinValues/, decode],
    [/recallsByVehicle/, { results: [{ NHTSACampaignNumber: '20V314000', Component: 'FUEL SYSTEM' }] }],
  ]);
  const cache = memoryCache();
  const res = await handleVehicle(post({ vin: '2HGFC2F78JH900001' }), { authenticate: auth(), http, cache, now: () => 2000, log: quiet });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.decode.model, 'Civic');
  assertEquals(body.coverage, 'nhtsa');
  assert(cache.store.has('vin:2HGFC2F78JH900001'));
  const n = calls.length;
  const again = await handleVehicle(post({ vin: '2HGFC2F78JH900001' }), { authenticate: auth(), http, cache, now: () => 3000, log: quiet });
  assertEquals((await again.json()).decode.model, 'Civic');
  assertEquals(calls.length, n); // served from cache
});

Deno.test('expired cache entries are refreshed', async () => {
  const { http, calls } = fakeHttp([[/DecodeVinValues/, decode]]);
  const cache = memoryCache();
  cache.store.set('vin:2HGFC2F78JH900001', { payload: { stale: true }, fetchedAt: 0 });
  const res = await handleVehicle(post({ vin: '2HGFC2F78JH900001' }), {
    authenticate: auth(),
    http,
    cache,
    now: () => 8 * 24 * 3600_000,
    log: quiet,
  });
  assertEquals((await res.json()).decode.make, 'Honda');
  assert(calls.length > 0);
});

Deno.test('unknown VIN → 404; NHTSA down → 502; lists work', async () => {
  const { http } = fakeHttp([
    [/DecodeVinValues/, { Results: [{ Make: '', Model: '', ModelYear: '' }] }],
    [/makes/, { results: [{ make: 'HONDA' }] }],
  ]);
  assertEquals((await handleVehicle(post({ vin: 'WVWZZZ1KZBW123456' }), { authenticate: auth(), http, log: quiet })).status, 404);
  const makes = await handleVehicle(post({ action: 'makes', year: 2018 }), { authenticate: auth(), http, log: quiet });
  assertEquals((await makes.json()).makes, ['HONDA']);
  const down = await handleVehicle(post({ action: 'makes', year: 2018 }), {
    authenticate: auth(),
    http: () => Promise.reject(new Error('boom')),
    log: quiet,
  });
  assertEquals(down.status, 502);
});
