// NHTSA lookups (CLAUDE.md §7.1): vPIC decode, recalls, complaints, safety ratings, and the year/make/model lists.
// Pure TS with an injected HTTP getter, so the same code runs in the /vehicle Edge Function (Deno), in the dev-only
// "direct" client on the phone, in the fixture script and in tests. Facts come only from these responses (§2.2).
import type { Powertrain } from '../types';
import { displayMake, displayModel, normalizeDecode, normalizeRecalls, normalizeSafety, summarizeComplaints } from './normalize';
import type { Recall, VehicleDecode, VehicleReport } from './types';

/** GET a URL and return parsed JSON. Must throw on network errors, timeouts and non-JSON. */
export type HttpGet = (url: string) => Promise<any>;

export class NhtsaError extends Error {
  constructor(
    public readonly code: 'not_found' | 'network' | 'timeout',
    message: string,
  ) {
    super(message);
    this.name = 'NhtsaError';
  }
}

export const NHTSA_TIMEOUT_MS = 10_000;

/**
 * Wraps fetch with a timeout and NHTSA's quirk: api.nhtsa.gov answers "no results" with HTTP 400 and a normal
 * body ({count: 0, results: []}), which we treat as an empty result rather than an error.
 */
export function makeHttpGet(fetchImpl: typeof fetch, timeoutMs = NHTSA_TIMEOUT_MS): HttpGet {
  return async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      const body = await res.json().catch(() => null);
      if (res.ok && body) return body;
      if (res.status === 400 && body && (Array.isArray(body.results) || Array.isArray(body.Results))) return body;
      throw new NhtsaError('network', `NHTSA answered HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof NhtsaError) throw e;
      if ((e as Error)?.name === 'AbortError') throw new NhtsaError('timeout', 'NHTSA took too long to answer');
      throw new NhtsaError('network', (e as Error)?.message ?? 'Network error');
    } finally {
      clearTimeout(timer);
    }
  };
}

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const API = 'https://api.nhtsa.gov';
const q = encodeURIComponent;

// ---------- Decode ----------

export async function decodeVin(http: HttpGet, vin: string): Promise<VehicleDecode> {
  const body = await http(`${VPIC}/DecodeVinValues/${q(vin)}?format=json`);
  const row = body?.Results?.[0];
  const decode = row ? normalizeDecode(row, vin) : null;
  if (!decode || !decode.make || !decode.model || !decode.year) {
    throw new NhtsaError(
      'not_found',
      "NHTSA couldn't decode this VIN. Check it against the door sticker, or pick the year, make and model instead.",
    );
  }
  return decode;
}

// ---------- Model-name variants ----------

const normName = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Spelling variants only ("F150" ↔ "F-150"); never a different model (dropping words could turn "Civic Hybrid"
 * into "Civic" and show the wrong car's data). The original name always comes first.
 */
export function modelVariants(model: string): string[] {
  const m = model.trim();
  const out = [m, m.replace(/-/g, ''), m.replace(/-/g, ' '), m.replace(/([A-Za-z])(\d)/g, '$1-$2')];
  const seen = new Set<string>();
  return out.filter((v) => {
    const k = v.toUpperCase();
    if (!v || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Model names NHTSA uses for a make/year (from recall and complaint records), deduped, as NHTSA writes them. */
export async function listModels(http: HttpGet, year: number, make: string): Promise<string[]> {
  const [r, c] = await Promise.allSettled(
    ['r', 'c'].map((t) => http(`${API}/products/vehicle/models?modelYear=${year}&make=${q(make)}&issueType=${t}`)),
  );
  const names = new Map<string, string>();
  for (const res of [r, c]) {
    if (res.status !== 'fulfilled') continue;
    for (const row of res.value?.results ?? []) {
      if (typeof row?.model === 'string' && row.model.trim()) names.set(normName(row.model), row.model.trim());
    }
  }
  if (names.size === 0 && r.status === 'rejected' && c.status === 'rejected') throw r.reason;
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

/** Makes NHTSA has recall or complaint records for in a model year. */
export async function listMakes(http: HttpGet, year: number): Promise<string[]> {
  const [r, c] = await Promise.allSettled(['r', 'c'].map((t) => http(`${API}/products/vehicle/makes?modelYear=${year}&issueType=${t}`)));
  const names = new Map<string, string>();
  for (const res of [r, c]) {
    if (res.status !== 'fulfilled') continue;
    for (const row of res.value?.results ?? []) {
      if (typeof row?.make === 'string' && row.make.trim()) names.set(normName(row.make), row.make.trim());
    }
  }
  if (names.size === 0 && r.status === 'rejected' && c.status === 'rejected') throw r.reason;
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Tries the model name and its variants until one returns rows; if none do, tries NHTSA's own model names for the
 * make/year that look like ours (e.g. "Civic" → "CIVIC SI"). Returns the union of rows found.
 */
async function withVariants(
  http: HttpGet,
  year: number,
  make: string,
  model: string,
  fetchRows: (model: string) => Promise<any[]>,
): Promise<any[]> {
  for (const v of modelVariants(model)) {
    const rows = await fetchRows(v);
    if (rows.length > 0) return rows;
  }
  const target = normName(model);
  const known = await listModels(http, year, make).catch(() => [] as string[]);
  const similar = known.filter((k) => {
    const n = normName(k);
    return n !== target && (n.startsWith(target) || target.startsWith(n));
  });
  const all: any[] = [];
  for (const k of similar.slice(0, 4)) all.push(...(await fetchRows(k)));
  return all;
}

export async function fetchRecalls(http: HttpGet, year: number, make: string, model: string): Promise<Recall[]> {
  const rows = await withVariants(http, year, make, model, async (m) => {
    const body = await http(`${API}/recalls/recallsByVehicle?make=${q(make)}&model=${q(m)}&modelYear=${year}`);
    return body?.results ?? [];
  });
  return normalizeRecalls(rows);
}

export async function fetchComplaintRows(http: HttpGet, year: number, make: string, model: string): Promise<any[]> {
  return withVariants(http, year, make, model, async (m) => {
    const body = await http(`${API}/complaints/complaintsByVehicle?make=${q(make)}&model=${q(m)}&modelYear=${year}`);
    return body?.results ?? [];
  });
}

export async function fetchSafety(http: HttpGet, year: number, make: string, model: string) {
  for (const m of modelVariants(model).slice(0, 3)) {
    const list = await http(`${API}/SafetyRatings/modelyear/${year}/make/${q(make)}/model/${q(m)}`);
    const id = list?.Results?.[0]?.VehicleId;
    if (id) {
      const detail = await http(`${API}/SafetyRatings/VehicleId/${id}`);
      return normalizeSafety(detail?.Results?.[0]);
    }
  }
  return null;
}

// ---------- Full report ----------

export type ReportLookup = { vin: string } | { year: number; make: string; model: string; powertrain?: Powertrain };

/**
 * Builds a VehicleReport. Decode failures throw (nothing to show); recalls, complaints and ratings load in
 * parallel and become null individually if they fail (partial results are fine, CLAUDE.md §7.1).
 */
export async function getVehicleReport(
  http: HttpGet,
  lookup: ReportLookup,
  keywordGroups: Readonly<Record<string, readonly string[]>>,
  now: () => number = Date.now,
): Promise<VehicleReport> {
  const decode: VehicleDecode =
    'vin' in lookup
      ? await decodeVin(http, lookup.vin)
      : {
          vin: null,
          year: lookup.year,
          make: displayMake(lookup.make),
          model: displayModel(lookup.model),
          trim: null,
          body: null,
          powertrain: lookup.powertrain ?? 'gas',
          engineDesc: null,
          drive: null,
          plantCountry: null,
          decodeWarnings: [],
        };
  // Query with the names as given (NHTSA matching is case-insensitive); show the display versions.
  const year = decode.year as number;
  const make = 'vin' in lookup ? (decode.make as string) : lookup.make;
  const model = 'vin' in lookup ? (decode.model as string) : lookup.model;

  const [recalls, complaints, safety] = await Promise.allSettled([
    fetchRecalls(http, year, make, model),
    fetchComplaintRows(http, year, make, model).then((rows) => summarizeComplaints(rows, keywordGroups)),
    fetchSafety(http, year, make, model),
  ]);
  return {
    decode,
    recalls: recalls.status === 'fulfilled' ? recalls.value : null,
    complaints: complaints.status === 'fulfilled' ? complaints.value : null,
    safety: safety.status === 'fulfilled' ? safety.value : null,
    fetchedAt: now(),
  };
}
