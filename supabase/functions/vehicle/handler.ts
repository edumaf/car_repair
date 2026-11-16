// /vehicle (CLAUDE.md §7.1): NHTSA decode, recalls, complaints and ratings, normalized and cached 7 days.
// POST { vin } | { year, make, model, powertrain_hint? } | { action: "makes", year } | { action: "models", year, make }
// No AI and no quota: vehicle reports are free (§9). Signed-in (anonymous) users only, to keep out scrapers.
import { z } from 'zod';

import complaintGroups from '../_shared/core/complaintGroups.json' with { type: 'json' };
import { getVehicleReport, listMakes, listModels, makeHttpGet, NhtsaError, type HttpGet } from '../_shared/core/vehicle/nhtsa.ts';

export const CACHE_TTL_MS = 7 * 24 * 3600_000;

export type VehicleCache = {
  get(key: string): Promise<{ payload: unknown; fetchedAt: number } | null>;
  put(key: string, payload: unknown): Promise<void>;
};

export const noCache: VehicleCache = { get: () => Promise.resolve(null), put: () => Promise.resolve() };

export type VehicleDeps = {
  authenticate: (req: Request) => Promise<string | null>;
  http?: HttpGet;
  cache?: VehicleCache;
  now?: () => number;
  log?: (fields: Record<string, unknown>) => void;
};

const POWERTRAINS = ['gas', 'diesel', 'hybrid', 'ev'] as const;
const year = z.number().int().min(1950).max(2100);
const bodySchema = z.union([
  z.object({ action: z.literal('makes'), year }),
  z.object({ action: z.literal('models'), year, make: z.string().min(1).max(60) }),
  z.object({ vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/) }),
  z.object({ year, make: z.string().min(1).max(60), model: z.string().min(1).max(80), powertrain_hint: z.enum(POWERTRAINS).optional() }),
]);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const norm = (s: string) => s.trim().toUpperCase();

export async function handleVehicle(req: Request, deps: VehicleDeps): Promise<Response> {
  const started = Date.now();
  const log = (f: Record<string, unknown>) => (deps.log ?? ((x) => console.log(JSON.stringify(x))))({ fn: 'vehicle', ...f });
  const http = deps.http ?? makeHttpGet(fetch);
  const cache = deps.cache ?? noCache;
  const now = deps.now ?? Date.now;

  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!(await deps.authenticate(req))) return json(401, { error: 'unauthorized' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'bad_request' });
  const b = parsed.data;

  const key =
    'action' in b
      ? b.action === 'makes'
        ? `makes:${b.year}`
        : `models:${b.year}:${norm(b.make)}`
      : 'vin' in b
        ? `vin:${b.vin}`
        : `ymm:${b.year}:${norm(b.make)}:${norm(b.model)}:${b.powertrain_hint ?? ''}`;

  // Cache errors never block: NHTSA is the source of truth, the cache only saves time.
  const cached = await cache.get(key).catch((e) => {
    log({ cache: 'get_failed', detail: String(e).slice(0, 120) });
    return null;
  });
  if (cached && now() - cached.fetchedAt < CACHE_TTL_MS) {
    log({ key_kind: key.split(':')[0], cache: 'hit', latency_ms: Date.now() - started });
    return json(200, cached.payload);
  }

  try {
    let payload: unknown;
    if ('action' in b) {
      payload = b.action === 'makes' ? { makes: await listMakes(http, b.year) } : { models: await listModels(http, b.year, b.make) };
    } else {
      const report = await getVehicleReport(
        http,
        'vin' in b ? { vin: b.vin } : { year: b.year, make: b.make, model: b.model, powertrain: b.powertrain_hint },
        complaintGroups as Record<string, string[]>,
        now,
      );
      payload = report;
      // Don't cache a report whose sections all failed (NHTSA hiccup): try again next time.
      if (report.recalls === null && report.complaints === null) {
        log({ key_kind: key.split(':')[0], cache: 'skip_partial', latency_ms: Date.now() - started });
        return json(200, payload);
      }
    }
    await cache.put(key, payload).catch((e) => log({ cache: 'put_failed', detail: String(e).slice(0, 120) }));
    log({ key_kind: key.split(':')[0], cache: 'miss', latency_ms: Date.now() - started });
    return json(200, payload);
  } catch (e) {
    if (e instanceof NhtsaError && e.code === 'not_found') return json(404, { error: 'not_found', message: e.message });
    const timeout = e instanceof NhtsaError && e.code === 'timeout';
    log({ error: timeout ? 'nhtsa_timeout' : 'nhtsa_error', detail: String(e).slice(0, 200) });
    return json(timeout ? 504 : 502, { error: timeout ? 'upstream_timeout' : 'upstream_error' });
  }
}
