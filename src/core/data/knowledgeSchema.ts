// zod schemas for the knowledge files added on 2026-11-16 (CLAUDE.md §20): models.json, obd_codes.json,
// symptoms.json. Structural checks here; cross-file checks (repair costs, complaint groups, ids) in validateKnowledge.
import { z } from 'zod';

import { SEVERITIES } from '../types';

const id = z.string().regex(/^[a-z0-9_]+$/, 'ids are lowercase snake_case');
const yearRange = z.tuple([z.number().int().min(1980).max(2035), z.number().int().min(1980).max(2035)]);
const text = z.string().min(1);

export const FUELS = ['gas', 'diesel', 'hybrid', 'ev'] as const;
export const MARKETS = ['eu', 'us', 'uk', 'global'] as const;
export const LIKELIHOODS = ['common', 'possible', 'rare'] as const;

export const engineSchema = z.object({
  id,
  name: text,
  fuel: z.enum(FUELS),
  notes: z.string().optional(),
});

export const modelProblemSchema = z.object({
  id,
  title: text,
  /** "all" or engine ids from the same model. */
  engines: z.array(z.string().min(1)).min(1),
  years: yearRange.optional(),
  frequency: z.enum(['common', 'occasional']),
  severity: z.enum(SEVERITIES),
  symptoms: z.array(text).min(1),
  what_to_check: z.array(text).min(1),
  complaint_group: id.nullable().optional(),
  repair_cost_id: id.nullable().optional(),
});

export const modelSchema = z.object({
  id,
  make: text,
  model: text,
  generation: text,
  years: yearRange,
  markets: z.array(z.enum(MARKETS)).min(1),
  body: z.array(text).min(1),
  engines: z.array(engineSchema).min(1),
  strengths: z.array(text).min(1),
  problems: z.array(modelProblemSchema).min(1),
  buying_tips: z.array(text).default([]),
  vin: z
    .object({
      wmi: z.array(z.string().regex(/^[A-HJ-NPR-Z0-9]{3}$/)).min(1),
      model_codes: z.array(z.string().regex(/^[A-HJ-NPR-Z0-9]{2}$/)).optional(),
    })
    .optional(),
});

export const modelsFileSchema = z.object({
  _meta: z.object({ version: z.number().int(), note: z.string() }),
  models: z.array(modelSchema).min(1),
});

export const causeSchema = z.object({
  text,
  likelihood: z.enum(LIKELIHOODS),
  diy_check: z.string().optional(),
  repair_cost_id: id.nullable().optional(),
});

export const obdCodeSchema = z.object({
  code: z.string().regex(/^[PCBU][0-3][0-9A-F]{3}$/, 'OBD-II code like P0301'),
  title: text,
  system: text,
  severity: z.enum(SEVERITIES),
  /** ok = keep driving and get it checked; caution = short gentle trips only; stop = don't drive. */
  drive: z.enum(['ok', 'caution', 'stop']),
  causes: z.array(causeSchema).min(1),
  notes: z.string().optional(),
});

export const obdFileSchema = z.object({
  _meta: z.object({ version: z.number().int(), note: z.string() }),
  codes: z.array(obdCodeSchema).min(1),
});

export const symptomOptionSchema = z
  .object({ label: text, next: id.optional(), outcome: id.optional() })
  .refine((o) => !!o.next !== !!o.outcome, { message: 'an option needs exactly one of next / outcome' });

export const symptomSchema = z.object({
  id,
  title: text,
  category: text,
  /** Shown on the symptom card before any question (e.g. smoke from the hood → stop now). */
  urgency_hint: z.enum(['stop_now', 'soon', 'monitor']).optional(),
  questions: z.array(z.object({ id, text, options: z.array(symptomOptionSchema).min(2) })).min(1),
  outcomes: z
    .array(
      z.object({
        id,
        title: text,
        urgency: z.enum(['stop_now', 'soon', 'monitor']),
        causes: z.array(causeSchema).min(1),
        see_mechanic_if: z.array(text).default([]),
      }),
    )
    .min(1),
});

export const symptomsFileSchema = z.object({
  _meta: z.object({ version: z.number().int(), note: z.string() }),
  symptoms: z.array(symptomSchema).min(1),
});

export type Engine = z.infer<typeof engineSchema>;
export type ModelProblem = z.infer<typeof modelProblemSchema>;
export type CarModel = z.infer<typeof modelSchema>;
export type ModelsFile = z.infer<typeof modelsFileSchema>;
export type Cause = z.infer<typeof causeSchema>;
export type ObdCode = z.infer<typeof obdCodeSchema>;
export type ObdFile = z.infer<typeof obdFileSchema>;
export type Symptom = z.infer<typeof symptomSchema>;
export type SymptomsFile = z.infer<typeof symptomsFileSchema>;

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  const out = new Set<string>();
  for (const x of ids) (seen.has(x) ? out : seen).add(x);
  return [...out];
}

/**
 * Validates the knowledge files, including references into repair_costs.json and the complaint groups of
 * inspection_checklist.json. Returns human-readable problems (empty = valid).
 */
export function validateKnowledge(
  raw: { models: unknown; obd: unknown; symptoms: unknown },
  refs: { repairCostIds: ReadonlySet<string>; complaintGroups: ReadonlySet<string> },
): string[] {
  const problems: string[] = [];
  const parsed = {
    'models.json': modelsFileSchema.safeParse(raw.models),
    'obd_codes.json': obdFileSchema.safeParse(raw.obd),
    'symptoms.json': symptomsFileSchema.safeParse(raw.symptoms),
  };
  for (const [name, r] of Object.entries(parsed)) {
    if (!r.success) for (const issue of r.error.issues.slice(0, 20)) problems.push(`${name}: ${issue.path.join('.')}: ${issue.message}`);
  }
  const m = parsed['models.json'];
  const o = parsed['obd_codes.json'];
  const sy = parsed['symptoms.json'];
  const checkCost = (where: string, cost: string | null | undefined) => {
    if (cost && !refs.repairCostIds.has(cost)) problems.push(`${where}: repair_cost_id "${cost}" is missing from repair_costs.json`);
  };

  if (m.success) {
    for (const d of dupes(m.data.models.map((x) => x.id))) problems.push(`models.json: duplicate model id ${d}`);
    for (const model of m.data.models) {
      const where = `models.json ${model.id}`;
      if (model.years[0] > model.years[1]) problems.push(`${where}: years out of order`);
      const engineIds = new Set(model.engines.map((e) => e.id));
      for (const d of dupes(model.engines.map((e) => e.id))) problems.push(`${where}: duplicate engine id ${d}`);
      for (const d of dupes(model.problems.map((p) => p.id))) problems.push(`${where}: duplicate problem id ${d}`);
      for (const p of model.problems) {
        for (const e of p.engines) if (e !== 'all' && !engineIds.has(e)) problems.push(`${where}.${p.id}: unknown engine "${e}"`);
        if (p.engines.includes('all') && p.engines.length > 1)
          problems.push(`${where}.${p.id}: "all" must not be combined with engine ids`);
        if (p.years && (p.years[0] > p.years[1] || p.years[1] < model.years[0] || p.years[0] > model.years[1])) {
          problems.push(`${where}.${p.id}: years outside the model's years`);
        }
        if (p.complaint_group && !refs.complaintGroups.has(p.complaint_group))
          problems.push(`${where}.${p.id}: unknown complaint_group "${p.complaint_group}"`);
        checkCost(`${where}.${p.id}`, p.repair_cost_id);
      }
    }
  }

  if (o.success) {
    for (const d of dupes(o.data.codes.map((c) => c.code))) problems.push(`obd_codes.json: duplicate code ${d}`);
    for (const c of o.data.codes) c.causes.forEach((cause) => checkCost(`obd_codes.json ${c.code}`, cause.repair_cost_id));
  }

  if (sy.success) {
    for (const d of dupes(sy.data.symptoms.map((x) => x.id))) problems.push(`symptoms.json: duplicate symptom id ${d}`);
    for (const s of sy.data.symptoms) {
      const where = `symptoms.json ${s.id}`;
      const qIds = new Set(s.questions.map((q) => q.id));
      const oIds = new Set(s.outcomes.map((x) => x.id));
      for (const q of s.questions) {
        for (const opt of q.options) {
          if (opt.next && !qIds.has(opt.next)) problems.push(`${where}.${q.id}: next "${opt.next}" is not a question`);
          if (opt.next === q.id) problems.push(`${where}.${q.id}: option loops to itself`);
          if (opt.outcome && !oIds.has(opt.outcome)) problems.push(`${where}.${q.id}: outcome "${opt.outcome}" is missing`);
        }
      }
      // Every outcome reachable, every question after the first reachable, no cycles.
      const reachedQ = new Set<string>([s.questions[0].id]);
      const reachedO = new Set<string>();
      const stack = [s.questions[0].id];
      const onPath = new Map<string, number>();
      const visit = (qid: string, depth: number) => {
        if (depth > 50) {
          problems.push(`${where}: question flow is too deep or loops`);
          return;
        }
        const q = s.questions.find((x) => x.id === qid);
        if (!q) return;
        onPath.set(qid, depth);
        for (const opt of q.options) {
          if (opt.outcome) reachedO.add(opt.outcome);
          if (opt.next) {
            if (onPath.has(opt.next)) problems.push(`${where}: loop at "${opt.next}"`);
            else {
              reachedQ.add(opt.next);
              visit(opt.next, depth + 1);
            }
          }
        }
        onPath.delete(qid);
      };
      visit(stack[0], 0);
      for (const q of s.questions) if (!reachedQ.has(q.id)) problems.push(`${where}: question "${q.id}" is unreachable`);
      for (const out of s.outcomes) {
        if (!reachedO.has(out.id)) problems.push(`${where}: outcome "${out.id}" is unreachable`);
        out.causes.forEach((c) => checkCost(`${where}.${out.id}`, c.repair_cost_id));
      }
    }
  }
  return problems;
}
