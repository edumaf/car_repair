// Eval light §16.1: does the VIN flow find recalls, complaints and a crash rating for popular US models, or do
// model-name differences between vPIC (VIN decode) and NHTSA's recall/complaint APIs make them come back empty?
//
//   npm run eval:vehicle            → prints a table and writes docs/eval-vehicle.md
//
// For each model: take a real 11-character VIN prefix from NHTSA complaint records, add a made-up serial (check
// digit recomputed), run the app's full lookup (getVehicleReport, same code as the backend) and compare with the
// counts NHTSA returns for its own model name. A VIN lookup that finds fewer recalls than the name lookup means the
// decoded model name doesn't match NHTSA's records.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { COMPLAINT_KEYWORD_GROUPS } from '../src/core/data/seed';
import { fetchComplaintRows, fetchRecalls, getVehicleReport, makeHttpGet } from '../src/core/vehicle/nhtsa';
import { computeCheckDigit } from '../src/core/vin/vin';

/**
 * NHTSA's own spelling (as in recall records). Popular US used cars, 2012–2022. Optional 4th value: the name the
 * complaints (and so the VIN prefixes) are filed under, when NHTSA uses another one (Mercedes: "C300" vs "C-CLASS").
 */
const MODELS: [string, string, number, string?][] = [
  ['HONDA', 'CIVIC', 2018],
  ['FORD', 'F-150', 2015],
  ['NISSAN', 'ALTIMA', 2013],
  ['TOYOTA', 'PRIUS', 2017],
  ['TESLA', 'MODEL 3', 2019],
  ['VOLKSWAGEN', 'JETTA', 2012],
  ['FORD', 'F-150', 2018],
  ['CHEVROLET', 'SILVERADO 1500', 2016],
  ['RAM', '1500', 2018],
  ['GMC', 'SIERRA 1500', 2017],
  ['TOYOTA', 'CAMRY', 2018],
  ['TOYOTA', 'COROLLA', 2016],
  ['TOYOTA', 'RAV4', 2019],
  ['TOYOTA', 'TACOMA', 2016],
  ['TOYOTA', 'HIGHLANDER', 2017],
  ['HONDA', 'ACCORD', 2017],
  ['HONDA', 'CR-V', 2017],
  ['HONDA', 'ODYSSEY', 2015],
  ['NISSAN', 'ROGUE', 2017],
  ['JEEP', 'GRAND CHEROKEE', 2016],
  ['JEEP', 'WRANGLER', 2018],
  ['CHEVROLET', 'EQUINOX', 2018],
  ['CHEVROLET', 'MALIBU', 2016],
  ['CHEVROLET', 'CRUZE', 2014],
  ['FORD', 'ESCAPE', 2014],
  ['FORD', 'EXPLORER', 2017],
  ['FORD', 'FOCUS', 2014],
  ['HYUNDAI', 'ELANTRA', 2017],
  ['HYUNDAI', 'SONATA', 2015],
  ['KIA', 'OPTIMA', 2016],
  ['KIA', 'SOUL', 2016],
  ['SUBARU', 'OUTBACK', 2015],
  ['MAZDA', 'CX-5', 2017],
  ['DODGE', 'GRAND CARAVAN', 2014],
  ['BMW', '328I', 2015],
  ['MERCEDES-BENZ', 'C300', 2016, 'C-CLASS'],
  ['MERCEDES-BENZ', 'E350', 2014, 'E-CLASS'],
  ['LEXUS', 'ES 350', 2015],
  ['LEXUS', 'IS 250', 2013],
  ['ACURA', 'MDX', 2016],
  ['INFINITI', 'Q50', 2016],
];
/** Prefixes for models with no VIN prefixes in their complaint records. */
const KNOWN_PREFIX: Record<string, string> = { 'FORD F-150 2015': '1FTEW1EG0FK' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rawGet = makeHttpGet(fetch, 30_000);
const http = async (url: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const body = await rawGet(url);
      await sleep(150);
      return body;
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(1000 * attempt);
    }
  }
};

const withSerial = (prefix: string) => {
  const draft = prefix.slice(0, 8) + '0' + prefix.slice(9, 11) + '900001';
  return draft.slice(0, 8) + computeCheckDigit(draft) + draft.slice(9);
};

interface Row {
  car: string;
  vin: string;
  decoded: string;
  recallsByName: number;
  recallsByVin: number | null;
  complaintsByName: number;
  complaintsByVin: number | null;
  rating: string;
  verdict: string;
}

async function evalModel(make: string, model: string, year: number, complaintName = model): Promise<Row> {
  const car = `${year} ${make} ${model}`;
  const [recalls, complaints] = await Promise.all([fetchRecalls(http, year, make, model), fetchComplaintRows(http, year, make, complaintName)]);
  const counts = new Map<string, number>();
  for (const c of complaints) if (typeof c.vin === 'string' && c.vin.length === 11) counts.set(c.vin, (counts.get(c.vin) ?? 0) + 1);
  const prefix = KNOWN_PREFIX[`${make} ${model} ${year}`] ?? [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const base = { car, recallsByName: recalls.length, complaintsByName: complaints.length };
  if (!prefix) return { ...base, vin: '—', decoded: '—', recallsByVin: null, complaintsByVin: null, rating: '—', verdict: 'NO VIN PREFIX' };
  const vin = withSerial(prefix);
  try {
    const r = await getVehicleReport(http, { vin }, COMPLAINT_KEYWORD_GROUPS);
    const d = r.decode;
    const recallsByVin = r.recalls?.length ?? null;
    const complaintsByVin = r.complaints?.total ?? null;
    const problems: string[] = [];
    if (d.year !== year) problems.push(`decoded year ${d.year}`);
    if (recallsByVin === null) problems.push('recalls failed');
    else if (recallsByVin < recalls.length) problems.push('fewer recalls by VIN');
    if (complaintsByVin === null) problems.push('complaints failed');
    else if (complaintsByVin < complaints.length * 0.5) problems.push('fewer complaints by VIN');
    return {
      ...base,
      vin,
      decoded: `${d.year} ${d.make} ${d.model}${d.trim ? ` ${d.trim}` : ''} [${d.powertrain}]`,
      recallsByVin,
      complaintsByVin,
      rating: r.safety ? (r.safety.overall != null ? `${r.safety.overall}/5` : 'not rated') : 'none',
      verdict: problems.length ? problems.join(', ') : 'OK',
    };
  } catch (e) {
    return { ...base, vin, decoded: '—', recallsByVin: null, complaintsByVin: null, rating: '—', verdict: `ERROR ${(e as Error).message}` };
  }
}

async function main() {
  const rows: Row[] = [];
  for (const [make, model, year, complaintName] of MODELS) {
    const row = await evalModel(make, model, year, complaintName);
    rows.push(row);
    console.log(
      `${row.verdict === 'OK' ? 'ok ' : '!! '} ${row.car} → ${row.decoded} | recalls ${row.recallsByVin ?? '-'}/${row.recallsByName} | complaints ${row.complaintsByVin ?? '-'}/${row.complaintsByName} | ${row.rating} | ${row.verdict}`,
    );
  }
  const ok = rows.filter((r) => r.verdict === 'OK').length;
  const md = [
    '# Eval light §16.1 — NHTSA data by VIN',
    '',
    `Run: ${new Date().toISOString().slice(0, 10)} · ${ok}/${rows.length} OK · \`npm run eval:vehicle\``,
    '',
    'VIN = real 11-character prefix from NHTSA complaint records + made-up serial. "by VIN" = the app’s lookup;',
    '"by name" = NHTSA’s own model name. Fewer by VIN means the decoded model name misses NHTSA records.',
    '',
    '| Car (NHTSA name) | Decoded from VIN | Recalls VIN / name | Complaints VIN / name | Crash rating | Result |',
    '|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.car} | ${r.decoded} | ${r.recallsByVin ?? '–'} / ${r.recallsByName} | ${r.complaintsByVin ?? '–'} / ${r.complaintsByName} | ${r.rating} | ${r.verdict} |`,
    ),
    '',
  ].join('\n');
  writeFileSync(join(__dirname, '../docs/eval-vehicle.md'), md);
  console.log(`\n${ok}/${rows.length} OK → docs/eval-vehicle.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
