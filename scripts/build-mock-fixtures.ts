// Builds the mock-client fixtures (src/core/api/mocks/fixtures/*.json) from REAL NHTSA data, so the app
// shows realistic reports offline (CLAUDE.md §4). Uses the same lookup code as the app and the backend.
//
//   npm run fixtures
//
// The fixture VINs are synthetic: a real VIN prefix (positions 1–11, from NHTSA complaint records or the
// manufacturer's pattern) + a made-up serial, with the check digit recomputed. vPIC decodes them from the prefix.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { COMPLAINT_KEYWORD_GROUPS } from '../src/core/data/seed';
import type { Powertrain } from '../src/core/types';
import { decodeVin, fetchComplaintRows, getVehicleReport, makeHttpGet } from '../src/core/vehicle/nhtsa';
import { computeCheckDigit } from '../src/core/vin/vin';

interface FixtureSpec {
  id: string;
  make: string;
  model: string;
  year: number;
  powertrain: Powertrain;
  /** Fixed prefix (11 chars). If omitted, one is picked from complaint records that decodes to `powertrain`. */
  prefix?: string;
}

const SPECS: FixtureSpec[] = [
  { id: 'civic_2018', make: 'honda', model: 'civic', year: 2018, powertrain: 'gas' },
  { id: 'f150_2015', make: 'ford', model: 'f-150', year: 2015, powertrain: 'gas', prefix: '1FTEW1EG0FK' },
  { id: 'altima_2013', make: 'nissan', model: 'altima', year: 2013, powertrain: 'gas' },
  { id: 'prius_2017', make: 'toyota', model: 'prius', year: 2017, powertrain: 'hybrid' },
  { id: 'model3_2019', make: 'tesla', model: 'model 3', year: 2019, powertrain: 'ev' },
  { id: 'jetta_tdi_2012', make: 'volkswagen', model: 'jetta', year: 2012, powertrain: 'diesel' },
];

const SERIAL = '900001';
const OUT_DIR = join(__dirname, '../src/core/api/mocks/fixtures');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Polite and patient: 30 s timeout, small pause between calls, 3 attempts.
const rawGet = makeHttpGet(fetch, 30_000);
const http = async (url: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const body = await rawGet(url);
      await sleep(250);
      return body;
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(1000 * attempt);
    }
  }
};

function withSerial(prefix: string): string {
  const draft = prefix.slice(0, 8) + '0' + prefix.slice(9, 11) + SERIAL;
  return draft.slice(0, 8) + computeCheckDigit(draft) + draft.slice(9);
}

async function pickVin(spec: FixtureSpec): Promise<string> {
  if (spec.prefix) return withSerial(spec.prefix);
  const counts = new Map<string, number>();
  for (const c of await fetchComplaintRows(http, spec.year, spec.make, spec.model)) {
    if (typeof c.vin === 'string' && c.vin.length === 11) counts.set(c.vin, (counts.get(c.vin) ?? 0) + 1);
  }
  const candidates = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v)
    .slice(0, 25);
  for (const cand of candidates) {
    const vin = withSerial(cand);
    const d = await decodeVin(http, vin).catch(() => null);
    if (d?.powertrain === spec.powertrain && d.year === spec.year) return vin;
  }
  throw new Error(`${spec.id}: no complaint VIN prefix decodes to ${spec.powertrain}`);
}

async function main() {
  const index: { id: string; vin: string; year: number; make: string; model: string; powertrain: Powertrain }[] = [];
  for (const spec of SPECS) {
    const vin = await pickVin(spec);
    const report = await getVehicleReport(http, { vin }, COMPLAINT_KEYWORD_GROUPS);
    if (report.decode.powertrain !== spec.powertrain) throw new Error(`${spec.id}: decoded as ${report.decode.powertrain}`);
    writeFileSync(join(OUT_DIR, `${spec.id}.json`), JSON.stringify(report, null, 2) + '\n');
    const d = report.decode;
    index.push({ id: spec.id, vin, year: d.year!, make: d.make!, model: d.model!, powertrain: d.powertrain });
    console.log(
      `${spec.id}: ${d.year} ${d.make} ${d.model} ${d.trim ?? ''} [${d.powertrain}] VIN ${vin} — ` +
        `${report.recalls?.length ?? 'n/a'} recalls, ${report.complaints?.total ?? 'n/a'} complaints, rating ${report.safety?.overall ?? 'n/a'}`,
    );
  }
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
