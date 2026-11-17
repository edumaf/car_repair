// Builds the model-aware inspection checklist (CLAUDE.md §6.4).
import { CHECKLIST_ITEMS, SECTIONS } from '../data/seed';
import type { ChecklistItem, Section } from '../data/seedSchema';
import type { Answer, Powertrain } from '../types';

export interface ChecklistEntry {
  item: ChecklistItem;
  /** True when the item's complaint_group is one of the model's top complaint groups. */
  knownProblemArea: boolean;
}

export interface ChecklistSection {
  section: Section;
  entries: ChecklistEntry[];
}

export const appliesTo = (item: ChecklistItem, powertrain: Powertrain): boolean =>
  item.powertrain.includes('all') || item.powertrain.includes(powertrain);

/**
 * Filters items by powertrain ("all" always applies), keeps sections in `order` (dropping empty ones), and within
 * each section puts items whose complaint_group is in `topComplaintGroups` first, otherwise keeping data order.
 */
export function buildChecklist(
  car: { powertrain: Powertrain },
  topComplaintGroups: readonly string[],
  items: readonly ChecklistItem[] = CHECKLIST_ITEMS,
  sections: readonly Section[] = SECTIONS,
): ChecklistSection[] {
  const top = new Set(topComplaintGroups);
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const entries = items
        .filter((i) => i.section === section.id && appliesTo(i, car.powertrain))
        .map((item) => ({ item, knownProblemArea: item.complaint_group !== null && top.has(item.complaint_group) }));
      // Array.prototype.sort is stable, so non-flagged items keep their data order.
      entries.sort((a, b) => Number(b.knownProblemArea) - Number(a.knownProblemArea));
      return { section, entries };
    })
    .filter((s) => s.entries.length > 0);
}

export const flattenChecklist = (sections: readonly ChecklistSection[]): ChecklistEntry[] => sections.flatMap((s) => s.entries);

/** A confirmed answer (AI suggestions that weren't confirmed don't count, CLAUDE.md §2.3). */
export interface ConfirmedAnswers {
  [itemId: string]: Answer | undefined;
}

/** Items answered ok/problem/not_sure ("skip" doesn't count as checked), per CLAUDE.md §8.2 coverage. */
export function progress(
  entries: readonly ChecklistEntry[],
  answers: ConfirmedAnswers,
): { checked: number; touched: number; total: number } {
  let checked = 0;
  let touched = 0;
  for (const e of entries) {
    const a = answers[e.item.id];
    if (a) touched++;
    if (a === 'ok' || a === 'problem' || a === 'not_sure') checked++;
  }
  return { checked, touched, total: entries.length };
}

/** Checked / total for a car without building its sections (garage cards). Same counting as `progress`. */
export function checklistProgress(
  powertrain: Powertrain,
  answers: ConfirmedAnswers,
  items: readonly ChecklistItem[] = CHECKLIST_ITEMS,
): { checked: number; total: number } {
  let checked = 0;
  let total = 0;
  for (const i of items) {
    if (!appliesTo(i, powertrain)) continue;
    total++;
    const a = answers[i.id];
    if (a === 'ok' || a === 'problem' || a === 'not_sure') checked++;
  }
  return { checked, total };
}
