// Finding our model-database entries (CLAUDE.md §20) for a car: from a VIN, or from make/model/year text.
// Pure TS. VIN hints only pre-fill; the user always confirms the model.
import { MODELS } from '../data/knowledge';
import type { CarModel, ModelProblem } from '../data/knowledgeSchema';
import type { Powertrain } from '../types';

const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

/**
 * Model year from VIN position 10 (30-year cycle). Returns the most recent year that isn't in the future.
 * European VINs don't always encode the year here, so callers treat it as a hint.
 */
export function modelYearFromVin(vin: string, currentYear = new Date().getFullYear()): number | null {
  const ch = vin.toUpperCase()[9];
  const i = ch ? YEAR_CODES.indexOf(ch) : -1;
  if (i === -1) return null;
  const base = 1980 + i;
  let year = base;
  while (year + 30 <= currentYear + 1) year += 30;
  return year;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** "Opel / Vauxhall" → ["opel", "vauxhall"]. */
const names = (s: string) => s.split('/').map(norm).filter(Boolean);

const inYears = (m: { years: [number, number] | number[] }, year: number | null, slack = 1) =>
  year === null || (year >= m.years[0] - slack && year <= m.years[1] + slack);

/** Make shown to the user ("Opel / Vauxhall"), sorted, unique. */
export function listMakes(models: readonly CarModel[] = MODELS): string[] {
  return [...new Set(models.map((m) => m.make))].sort((a, b) => a.localeCompare(b));
}

export function modelsForMake(make: string, models: readonly CarModel[] = MODELS): CarModel[] {
  return models.filter((m) => m.make === make).sort((a, b) => a.model.localeCompare(b.model) || a.years[0] - b.years[0]);
}

export interface VinMatch {
  /** Make guessed from the manufacturer code (first 3 characters), if we know it. */
  make: string | null;
  year: number | null;
  /** Model generations that fit the VIN (manufacturer code, VW-group model code, year), best first. */
  candidates: CarModel[];
}

export function findModelsByVin(vin: string, models: readonly CarModel[] = MODELS, currentYear?: number): VinMatch {
  const v = vin.toUpperCase();
  const wmi = v.slice(0, 3);
  const code = v.slice(6, 8);
  const year = modelYearFromVin(v, currentYear);
  const byWmi = models.filter((m) => m.vin?.wmi.includes(wmi));
  if (byWmi.length === 0) return { make: null, year, candidates: [] };
  const make = mostCommon(byWmi.map((m) => m.make));
  // A VW-group model code (positions 7-8) is specific; otherwise all models of the manufacturer are candidates.
  const withCode = byWmi.filter((m) => m.vin?.model_codes?.includes(code));
  const pool = withCode.length ? withCode : byWmi;
  // European VINs don't always encode the year, so only narrow by year if something still matches.
  const byYear = pool.filter((m) => inYears(m, year, 0));
  const candidates = (byYear.length ? byYear : pool).sort((a, b) => b.years[0] - a.years[0]);
  return { make, year, candidates };
}

function mostCommon(xs: string[]): string {
  const counts = new Map<string, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Matches NHTSA or user text ("HONDA", "CR-V", 2015) to our generations. */
export function findModelsByName(
  make: string | null,
  model: string | null,
  year: number | null,
  models: readonly CarModel[] = MODELS,
): CarModel[] {
  if (!make || !model) return [];
  const mk = norm(make);
  const md = norm(model);
  return models.filter((m) => {
    if (!names(m.make).some((n) => n === mk || mk.startsWith(n) || n.startsWith(mk))) return false;
    const modelNames = names(m.model);
    if (!modelNames.some((n) => n === md || md.startsWith(n))) return false;
    return inYears(m, year, 0);
  });
}

/** Engines of the model that fit a powertrain (used to pre-select or narrow the engine choice). */
export function enginesForPowertrain(model: CarModel, powertrain: Powertrain | null): CarModel['engines'] {
  return powertrain ? model.engines.filter((e) => e.fuel === powertrain) : model.engines;
}

/**
 * The engine that fits what NHTSA decoded from the VIN (fuel + displacement, e.g. "2.5L 4-cyl"), when exactly one
 * engine of the generation fits. Engine names can list several sizes ("1.4/1.6 TDCi"); any of them counts.
 */
export function engineFromDecode(
  model: CarModel,
  powertrain: Powertrain | null,
  engineDesc: string | null,
): CarModel['engines'][number] | null {
  const pool = enginesForPowertrain(model, powertrain);
  if (pool.length === 1) return pool[0];
  const m = engineDesc?.match(/(\d+(?:\.\d+)?)\s*L\b/i);
  if (!m) return null;
  const liters = Number(m[1]);
  const hits = pool.filter((e) => (e.name.match(/\d\.\d+/g) ?? []).some((x) => Math.abs(Number(x) - liters) < 0.06));
  return hits.length === 1 ? hits[0] : null;
}

/** True when the generation's problems differ by engine, i.e. choosing the engine changes what we show. */
export function engineChangesProblems(model: CarModel): boolean {
  return model.problems.some((p) => !p.engines.includes('all'));
}

export interface ProblemsForCar {
  /** Problems for this engine (or "all" engines) and year. */
  relevant: ModelProblem[];
  /** Problems that only affect other engines or years of this generation. */
  other: ModelProblem[];
}

const FREQ = { common: 0, occasional: 1 } as const;
const SEV = { critical: 0, major: 1, minor: 2, info: 3 } as const;

export function problemsFor(model: CarModel, engineId: string | null, year: number | null): ProblemsForCar {
  const relevant: ModelProblem[] = [];
  const other: ModelProblem[] = [];
  for (const p of model.problems) {
    const engineOk = engineId === null || p.engines.includes('all') || p.engines.includes(engineId);
    const yearOk = !p.years || year === null || (year >= p.years[0] && year <= p.years[1]);
    (engineOk && yearOk ? relevant : other).push(p);
  }
  const order = (a: ModelProblem, b: ModelProblem) => FREQ[a.frequency] - FREQ[b.frequency] || SEV[a.severity] - SEV[b.severity];
  return { relevant: relevant.sort(order), other: other.sort(order) };
}

/** Complaint groups our data says matter for this car (pushes those checklist items first). */
export function modelComplaintGroups(model: CarModel | null | undefined, engineId: string | null, year: number | null): string[] {
  if (!model) return [];
  return [
    ...new Set(
      problemsFor(model, engineId, year)
        .relevant.map((p) => p.complaint_group)
        .filter((g): g is string => !!g),
    ),
  ];
}
