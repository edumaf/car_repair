// Builds the mock-client fixtures (src/core/api/mocks/fixtures/*.json) from REAL NHTSA data, so the app
// shows realistic reports in Expo Go before the backend exists (CLAUDE.md §4).
//
//   npm run fixtures
//
// The fixture VINs are synthetic: a real VIN prefix (positions 1–11, from NHTSA complaint records or the
// manufacturer's pattern) + a made-up serial, with the check digit recomputed. vPIC decodes them from the prefix.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { COMPLAINT_KEYWORD_GROUPS } from '../src/core/data/seed';
import { normalizeDecode, normalizeRecalls, normalizeSafety, summarizeComplaints } from '../src/core/vehicle/normalize';
import type { VehicleReport } from '../src/core/vehicle/types';
import type { Powertrain } from '../src/core/types';
import { computeCheckDigit } from '../src/core/vin/vin';

interface FixtureSpec {
  id: string;
  make: string;
  /** Model names to try, in order, until NHTSA returns data (model-name variants, CLAUDE.md §7.1). */
  models: string[];
  year: number;
  powertrain: Powertrain;
  /** Fixed prefix (11 chars). If omitted, one is picked from complaint records that decodes to `powertrain`. */
  prefix?: string;
}

const SPECS: FixtureSpec[] = [
  { id: 'civic_2018', make: 'honda', models: ['civic'], year: 2018, powertrain: 'gas' },
  { id: 'f150_2015', make: 'ford', models: ['f-150', 'f150'], year: 2015, powertrain: 'gas', prefix: '1FTEW1EG0FK' },
  { id: 'altima_2013', make: 'nissan', models: ['altima'], year: 2013, powertrain: 'gas' },
  { id: 'prius_2017', make: 'toyota', models: ['prius'], year: 2017, powertrain: 'hybrid' },
  { id: 'model3_2019', make: 'tesla', models: ['model 3'], year: 2019, powertrain: 'ev' },
  { id: 'jetta_tdi_2012', make: 'volkswagen', models: ['jetta'], year: 2012, powertrain: 'diesel' },
];

const SERIAL = '900001';
const OUT_DIR = join(__dirname, '../src/core/api/mocks/fixtures');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      await sleep(250); // be polite to NHTSA
      // Gotcha: api.nhtsa.gov answers "no results" with HTTP 400 and a normal body ({count: 0, results: []}).
      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        if (body && Array.isArray(body.results)) return body;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt >= 3) throw new Error(`${url}: ${(e as Error).message}`);
      await sleep(1000 * attempt);
    }
  }
}

const q = encodeURIComponent;

async function decode(vinOrPrefix: string): Promise<Record<string, unknown>> {
  const d = await getJson(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${q(vinOrPrefix)}?format=json`);
  return d.Results[0];
}

function withSerial(prefix: string): string {
  const draft = prefix.slice(0, 8) + '0' + prefix.slice(9, 11) + SERIAL;
  return draft.slice(0, 8) + computeCheckDigit(draft) + draft.slice(9);
}

async function build(spec: FixtureSpec): Promise<VehicleReport> {
  let model = spec.models[0];
  let recalls: any[] = [];
  let complaints: any[] = [];
  for (const m of spec.models) {
    const r = await getJson(`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${q(spec.make)}&model=${q(m)}&modelYear=${spec.year}`);
    const c = await getJson(`https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${q(spec.make)}&model=${q(m)}&modelYear=${spec.year}`);
    if (r.results.length > recalls.length) recalls = r.results;
    if (c.results.length > complaints.length) complaints = c.results;
    if (recalls.length && complaints.length) {
      model = m;
      break;
    }
  }

  // Pick a VIN prefix that decodes to the expected powertrain.
  let prefix = spec.prefix;
  if (!prefix) {
    const counts = new Map<string, number>();
    for (const c of complaints) if (typeof c.vin === 'string' && c.vin.length === 11) counts.set(c.vin, (counts.get(c.vin) ?? 0) + 1);
    const candidates = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v).slice(0, 25);
    for (const cand of candidates) {
      const d = normalizeDecode(await decode(withSerial(cand)), null);
      if (d.powertrain === spec.powertrain && d.year === spec.year) {
        prefix = cand;
        break;
      }
    }
    if (!prefix) throw new Error(`${spec.id}: no complaint VIN prefix decodes to ${spec.powertrain}`);
  }
  const vin = withSerial(prefix);
  const decoded = normalizeDecode(await decode(vin), vin);
  if (decoded.powertrain !== spec.powertrain) throw new Error(`${spec.id}: decoded as ${decoded.powertrain}`);

  let safety = null;
  try {
    const list = await getJson(`https://api.nhtsa.gov/SafetyRatings/modelyear/${spec.year}/make/${q(spec.make)}/model/${q(model)}`);
    const first = list.Results?.[0];
    if (first?.VehicleId) safety = normalizeSafety((await getJson(`https://api.nhtsa.gov/SafetyRatings/VehicleId/${first.VehicleId}`)).Results?.[0]);
  } catch {
    safety = null; // partial results are fine
  }

  return {
    decode: decoded,
    recalls: normalizeRecalls(recalls),
    complaints: summarizeComplaints(complaints, COMPLAINT_KEYWORD_GROUPS),
    safety,
    fetchedAt: Date.now(),
  };
}

async function main() {
  const index: { id: string; vin: string; year: number; make: string; model: string; powertrain: Powertrain }[] = [];
  for (const spec of SPECS) {
    const report = await build(spec);
    writeFileSync(join(OUT_DIR, `${spec.id}.json`), JSON.stringify(report, null, 2) + '\n');
    const d = report.decode;
    index.push({ id: spec.id, vin: d.vin!, year: d.year!, make: d.make!, model: d.model!, powertrain: d.powertrain });
    console.log(
      `${spec.id}: ${d.year} ${d.make} ${d.model} ${d.trim ?? ''} [${d.powertrain}] VIN ${d.vin} — ` +
        `${report.recalls?.length} recalls, ${report.complaints?.total} complaints, rating ${report.safety?.overall ?? 'n/a'}`,
    );
  }
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
