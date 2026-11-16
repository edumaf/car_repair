// Turns raw NHTSA responses into a VehicleReport. Pure TS, so the /vehicle Edge Function (M1),
// the mock-fixture script and the tests all share it. Verify field names against live responses.
import type { Powertrain } from '../types';
import type { ComplaintSummary, Recall, SafetyRating, VehicleDecode } from './types';

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim();
  return s === '' || s.toLowerCase() === 'not applicable' ? null : s;
};

// ---------- VIN decode (vPIC DecodeVinValues) ----------

/**
 * CLAUDE.md §7.1: BEV → ev; HEV/PHEV → hybrid; diesel → diesel; else gas.
 * vPIC values seen: "BEV (Battery Electric Vehicle)", "PHEV (Plug-in Hybrid Electric Vehicle)",
 * "Strong HEV (Hybrid Electric Vehicle)", "Mild HEV (Hybrid Electric Vehicle)", "FCEV (Fuel Cell Electric Vehicle)".
 * Mild hybrids count as gas (a normal engine does the work); fuel-cell cars are closest to EVs.
 */
export function derivePowertrain(fields: {
  fuelPrimary?: string | null;
  fuelSecondary?: string | null;
  electrification?: string | null;
}): Powertrain {
  const elec = (fields.electrification ?? '').toUpperCase();
  const fuel1 = (fields.fuelPrimary ?? '').toLowerCase();
  const fuel2 = (fields.fuelSecondary ?? '').toLowerCase();
  if (/\bBEV\b|\bFCEV\b/.test(elec) || (fuel1 === 'electric' && !fuel2)) return 'ev';
  if (/\bPHEV\b/.test(elec) || (/\bHEV\b/.test(elec) && !elec.includes('MILD'))) return 'hybrid';
  if (fuel1.includes('diesel')) return 'diesel';
  return 'gas';
}

const KEEP_UPPER = new Set(['BMW', 'GMC', 'RAM', 'MINI', 'FIAT', 'SRT', 'AMC']);

/** "HONDA" → "Honda", "MERCEDES-BENZ" → "Mercedes-Benz", "BMW" stays "BMW". */
export function displayMake(make: string): string {
  const up = make.toUpperCase();
  if (KEEP_UPPER.has(up)) return up;
  return make.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * NHTSA lists models in capitals ("CIVIC SI", "CR-V", "MODEL 3"). Title-case plain words longer than 3 letters;
 * keep short words and anything with digits or hyphens as written: "Civic SI", "CR-V", "Model 3", "F-150".
 */
export function displayModel(model: string): string {
  if (model !== model.toUpperCase()) return model; // already mixed case (vPIC decode)
  return model
    .split(/\s+/)
    .map((w) => (/^[A-Z]{4,}$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function engineDesc(r: Raw, powertrain: Powertrain): string | null {
  if (powertrain === 'ev') return 'Electric motor';
  const liters = str(r.DisplacementL);
  const cyl = str(r.EngineCylinders);
  const parts: string[] = [];
  if (liters && !Number.isNaN(Number(liters))) parts.push(`${Number(liters).toFixed(1)}L`);
  if (cyl) parts.push(`${cyl}-cyl`);
  if (str(r.Turbo)?.toLowerCase() === 'yes') parts.push('turbo');
  if (powertrain === 'diesel') parts.push('diesel');
  if (powertrain === 'hybrid') parts.push('hybrid');
  return parts.length ? parts.join(' ') : null;
}

function driveShort(drive: string | null): string | null {
  if (!drive) return null;
  const m = drive.match(/^(FWD|RWD|AWD|4WD|4x4|4x2)/i);
  if (m) return m[1].toUpperCase().replace('4X4', '4WD').replace('4X2', '2WD');
  return drive;
}

/** Normalizes one row of vPIC DecodeVinValues "Results". */
export function normalizeDecode(r: Raw, vin: string | null): VehicleDecode {
  const powertrain = derivePowertrain({
    fuelPrimary: str(r.FuelTypePrimary),
    fuelSecondary: str(r.FuelTypeSecondary),
    electrification: str(r.ElectrificationLevel),
  });
  const year = Number(str(r.ModelYear));
  const make = str(r.Make);
  const errorCodes = (str(r.ErrorCode) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '0');
  return {
    vin,
    year: Number.isFinite(year) && year > 1900 ? year : null,
    make: make ? displayMake(make) : null,
    model: str(r.Model),
    trim: str(r.Trim) ?? str(r.Series),
    body: str(r.BodyClass),
    powertrain,
    engineDesc: engineDesc(r, powertrain),
    drive: driveShort(str(r.DriveType)),
    plantCountry: str(r.PlantCountry),
    decodeWarnings: errorCodes,
  };
}

// ---------- Recalls (api.nhtsa.gov/recalls/recallsByVehicle) ----------

/** "28/05/2020" (NHTSA recalls use DD/MM/YYYY) → "2020-05-28". */
export function parseNhtsaDate(s: string | null, order: 'dmy' | 'mdy'): string | null {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [d, mo] = order === 'dmy' ? [m[1], m[2]] : [m[2], m[1]];
  return `${m[3]}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Normalizes and de-duplicates recall rows (by campaign number), newest first. */
export function normalizeRecalls(rows: Raw[]): Recall[] {
  const byCampaign = new Map<string, Recall>();
  for (const r of rows) {
    const campaign = str(r.NHTSACampaignNumber);
    if (!campaign || byCampaign.has(campaign)) continue;
    byCampaign.set(campaign, {
      campaign,
      component: str(r.Component) ?? 'Unknown component',
      summary: str(r.Summary) ?? '',
      consequence: str(r.Consequence) ?? '',
      remedy: str(r.Remedy) ?? '',
      reportDate: parseNhtsaDate(str(r.ReportReceivedDate), 'dmy'),
      parkIt: r.parkIt === true,
      parkOutside: r.parkOutSide === true,
    });
  }
  return [...byCampaign.values()].sort((a, b) => (b.reportDate ?? '').localeCompare(a.reportDate ?? ''));
}

// ---------- Complaints (api.nhtsa.gov/complaints/complaintsByVehicle) ----------

export const SAMPLE_MAX_CHARS = 200;
const SAMPLES_PER_GROUP = 3;

/** Shortens a complaint summary to ≤ max chars at a word boundary, with an ellipsis. */
export function shortenSample(text: string, max = SAMPLE_MAX_CHARS): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '') + '…';
}

/** Maps one NHTSA components string (comma-separated) to our complaint groups, by substring match. */
export function groupsForComponents(components: string, keywordGroups: Readonly<Record<string, readonly string[]>>): string[] {
  const parts = components
    .toUpperCase()
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const groups: string[] = [];
  for (const [group, keywords] of Object.entries(keywordGroups)) {
    if (parts.some((p) => keywords.some((k) => p.includes(k.toUpperCase())))) groups.push(group);
  }
  return groups;
}

/** Counts complaints per group (a complaint counts once per group) and keeps a few recent samples. */
export function summarizeComplaints(rows: Raw[], keywordGroups: Readonly<Record<string, readonly string[]>>): ComplaintSummary {
  // Newest first, so samples are recent.
  const sorted = [...rows].sort((a, b) => Number(b.odiNumber ?? 0) - Number(a.odiNumber ?? 0));
  const stats = new Map<string, { count: number; samples: string[] }>();
  const summary: ComplaintSummary = { total: 0, crashes: 0, fires: 0, injuries: 0, deaths: 0, groups: [], ungrouped: 0 };

  for (const r of sorted) {
    summary.total++;
    if (r.crash === true) summary.crashes++;
    if (r.fire === true) summary.fires++;
    summary.injuries += Number(r.numberOfInjuries ?? 0) || 0;
    summary.deaths += Number(r.numberOfDeaths ?? 0) || 0;
    const groups = groupsForComponents(str(r.components) ?? '', keywordGroups);
    if (groups.length === 0) summary.ungrouped++;
    const text = str(r.summary);
    for (const g of groups) {
      const s = stats.get(g) ?? { count: 0, samples: [] };
      s.count++;
      if (text && s.samples.length < SAMPLES_PER_GROUP) s.samples.push(shortenSample(text));
      stats.set(g, s);
    }
  }
  summary.groups = [...stats.entries()]
    .map(([group, s]) => ({ group, count: s.count, samples: s.samples }))
    .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
  return summary;
}

/** The top complaint groups for a model, used to put "Known problem area" items first. */
export function topComplaintGroups(complaints: ComplaintSummary | null, n = 5): string[] {
  return (complaints?.groups ?? []).slice(0, n).map((g) => g.group);
}

// ---------- Safety ratings (api.nhtsa.gov/SafetyRatings/VehicleId/{id}) ----------

export function normalizeSafety(r: Raw | null | undefined): SafetyRating | null {
  if (!r) return null;
  const n = Number(str(r.OverallRating));
  return {
    overall: Number.isInteger(n) && n >= 1 && n <= 5 ? n : null,
    vehicleDescription: str(r.VehicleDescription) ?? '',
  };
}
