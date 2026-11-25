// Typed access to the bundled seed data (data/*.json). These files are the single source of truth for
// checklist items, severities, repair costs and listing flags (CLAUDE.md §2.2). Never hard-code those facts.
// The JSON is validated by seed.test.ts and, in dev builds, at startup (see validateSeed).
import checklistJson from '../../../data/inspection_checklist.json';
import listingFlagsJson from '../../../data/listing_red_flags.json';
import repairCostsJson from '../../../data/repair_costs.json';
import type { ChecklistFile, ChecklistItem, FieldFlag, ListingFlag, ListingFlagsFile, RepairCost, RepairCostsFile, Section } from './seedSchema';

export const rawSeed = {
  checklist: checklistJson as unknown,
  repairCosts: repairCostsJson as unknown,
  listingFlags: listingFlagsJson as unknown,
};

const checklist = checklistJson as unknown as ChecklistFile;
const repairCosts = repairCostsJson as unknown as RepairCostsFile;
const listingFlags = listingFlagsJson as unknown as ListingFlagsFile;

/** Bumps whenever any seed file's _meta.version changes; stored in app_meta to detect data updates. */
export const DATA_VERSION = `${checklist._meta.version}.${repairCosts._meta.version}.${listingFlags._meta.version}`;

export const SECTIONS: readonly Section[] = [...checklist.sections].sort((a, b) => a.order - b.order);
export const CHECKLIST_ITEMS: readonly ChecklistItem[] = checklist.items;
export const COMPLAINT_KEYWORD_GROUPS: Readonly<Record<string, readonly string[]>> = checklist._meta.complaint_keyword_groups;
export const REPAIR_COSTS: readonly RepairCost[] = repairCosts.costs;
export const LISTING_FLAGS: readonly ListingFlag[] = listingFlags.flags;
export const FIELD_FLAGS: readonly FieldFlag[] = listingFlags.field_flags ?? [];

const itemsById = new Map(CHECKLIST_ITEMS.map((i) => [i.id, i]));
const costsById = new Map(REPAIR_COSTS.map((c) => [c.id, c]));
const sectionsById = new Map(SECTIONS.map((s) => [s.id, s]));

export const getChecklistItem = (id: string): ChecklistItem | undefined => itemsById.get(id);
export const getRepairCost = (id: string): RepairCost | undefined => costsById.get(id);
export const getSection = (id: string): Section | undefined => sectionsById.get(id);
