// zod schemas for the bundled seed files in data/*.json (CLAUDE.md §5.1).
// Structural checks live here; cross-file checks (ids that point at other files) live in validateSeed().
import { z } from 'zod';

import { FLAG_SEVERITIES, PHOTO_CHECK_TYPES, SEVERITIES } from '../types';

const id = z.string().regex(/^[a-z0-9_]+$/, 'ids are lowercase snake_case');

export const sectionSchema = z.object({
  id,
  title: z.string().min(1),
  order: z.number().int().positive(),
});

export const checklistItemSchema = z.object({
  id,
  section: id,
  powertrain: z.array(z.enum(['all', 'gas', 'diesel', 'hybrid', 'ev'])).min(1),
  title: z.string().min(1),
  how_to_check: z.array(z.string().min(1)).min(1),
  bad_signs: z.array(z.string().min(1)).min(1),
  severity: z.enum(SEVERITIES),
  complaint_group: id.nullable(),
  repair_cost_id: id.nullable(),
  photo_check: z.enum(PHOTO_CHECK_TYPES).nullable(),
});

export const checklistFileSchema = z.object({
  _meta: z.object({
    version: z.number().int(),
    note: z.string(),
    complaint_keyword_groups: z.record(id, z.array(z.string().min(1)).min(1)),
  }),
  sections: z.array(sectionSchema).min(1),
  items: z.array(checklistItemSchema).min(1),
});

export const repairCostSchema = z
  .object({
    id,
    name: z.string().min(1),
    category: id,
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
  })
  .refine((c) => c.low <= c.high, { message: 'low must be <= high' });

export const repairCostsFileSchema = z.object({
  _meta: z.object({
    version: z.number().int(),
    currency: z.literal('USD'),
    note: z.string(),
    categories: z.array(id).min(1),
  }),
  costs: z.array(repairCostSchema).min(1),
});

export const listingFlagSchema = z.object({
  id,
  match: z.array(z.string().min(1)).min(1),
  severity: z.enum(FLAG_SEVERITIES),
  explanation: z.string().min(1),
  ask_seller: z.string().min(1),
});

/** Flags raised from numbers instead of phrases (CLAUDE.md §6.6 "field-based flags"). */
export const FIELD_FLAG_TRIGGERS = ['price_far_below_similar', 'mileage_missing'] as const;
export const fieldFlagSchema = z.object({
  id,
  when: z.enum(FIELD_FLAG_TRIGGERS),
  severity: z.enum(FLAG_SEVERITIES),
  explanation: z.string().min(1),
  ask_seller: z.string().min(1),
});

export const listingFlagsFileSchema = z.object({
  _meta: z.object({ version: z.number().int(), note: z.string() }).passthrough(),
  flags: z.array(listingFlagSchema).min(1),
  field_flags: z.array(fieldFlagSchema).default([]),
});

export type Section = z.infer<typeof sectionSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type ChecklistFile = z.infer<typeof checklistFileSchema>;
export type RepairCost = z.infer<typeof repairCostSchema>;
export type RepairCostsFile = z.infer<typeof repairCostsFileSchema>;
export type ListingFlag = z.infer<typeof listingFlagSchema>;
export type FieldFlag = z.infer<typeof fieldFlagSchema>;
export type ListingFlagsFile = z.infer<typeof listingFlagsFileSchema>;

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const x of ids) (seen.has(x) ? dupes : seen).add(x);
  return [...dupes];
}

/**
 * Validates all three seed files, including cross-file references. Returns a list of human-readable
 * problems (empty = valid). Used by seed.test.ts and, in dev builds, at app startup.
 */
export function validateSeed(raw: { checklist: unknown; repairCosts: unknown; listingFlags: unknown }): string[] {
  const problems: string[] = [];
  const checklist = checklistFileSchema.safeParse(raw.checklist);
  const costs = repairCostsFileSchema.safeParse(raw.repairCosts);
  const flags = listingFlagsFileSchema.safeParse(raw.listingFlags);

  for (const [name, r] of [
    ['inspection_checklist.json', checklist],
    ['repair_costs.json', costs],
    ['listing_red_flags.json', flags],
  ] as const) {
    if (!r.success) {
      for (const issue of r.error.issues) problems.push(`${name}: ${issue.path.join('.')}: ${issue.message}`);
    }
  }
  if (!checklist.success || !costs.success || !flags.success) return problems;

  const c = checklist.data;
  const sectionIds = new Set(c.sections.map((s) => s.id));
  const groups = new Set(Object.keys(c._meta.complaint_keyword_groups));
  const costIds = new Set(costs.data.costs.map((x) => x.id));
  const categories = new Set(costs.data._meta.categories);

  for (const d of duplicates(c.sections.map((s) => s.id))) problems.push(`duplicate section id: ${d}`);
  for (const d of duplicates(c.sections.map((s) => String(s.order)))) problems.push(`duplicate section order: ${d}`);
  for (const d of duplicates(c.items.map((i) => i.id))) problems.push(`duplicate checklist item id: ${d}`);
  for (const d of duplicates(costs.data.costs.map((x) => x.id))) problems.push(`duplicate repair cost id: ${d}`);
  for (const d of duplicates([...flags.data.flags, ...flags.data.field_flags].map((f) => f.id))) problems.push(`duplicate listing flag id: ${d}`);

  for (const item of c.items) {
    if (!sectionIds.has(item.section)) problems.push(`item ${item.id}: unknown section "${item.section}"`);
    if (item.complaint_group !== null && !groups.has(item.complaint_group)) {
      problems.push(`item ${item.id}: complaint_group "${item.complaint_group}" is not in _meta.complaint_keyword_groups`);
    }
    if (item.repair_cost_id !== null && !costIds.has(item.repair_cost_id)) {
      problems.push(`item ${item.id}: repair_cost_id "${item.repair_cost_id}" is missing from repair_costs.json`);
    }
    if (item.powertrain.includes('all') && item.powertrain.length > 1) {
      problems.push(`item ${item.id}: powertrain "all" must not be combined with others`);
    }
  }
  for (const cost of costs.data.costs) {
    if (!categories.has(cost.category)) problems.push(`repair cost ${cost.id}: unknown category "${cost.category}"`);
  }
  return problems;
}
