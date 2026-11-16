// Builds the model-aware inspection checklist (CLAUDE.md §6.4). Implemented in Milestone 2.
import type { ChecklistItem, Section } from '../data/seedSchema';
import { notImplemented } from '../notImplemented';
import type { Powertrain } from '../types';

export interface ChecklistEntry {
  item: ChecklistItem;
  /** True when the item's complaint_group is one of the model's top complaint groups. */
  knownProblemArea: boolean;
}

export interface ChecklistSection {
  section: Section;
  entries: ChecklistEntry[];
}

/**
 * Filters items by powertrain ("all" always applies), keeps sections in `order`, and within each section puts
 * items whose complaint_group is in `topComplaintGroups` first.
 */
export function buildChecklist(_car: { powertrain: Powertrain }, _topComplaintGroups: readonly string[]): ChecklistSection[] {
  return notImplemented('buildChecklist', 'M2');
}
