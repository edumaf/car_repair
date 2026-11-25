// The "All checks" list in the inspection (owner, phone test 2026-11-25: 54 checks with only Back/Next was slow).
// Pure TS: search and the "only unanswered" filter, grouped by section like the checklist.
import { progress, type ChecklistEntry, type ChecklistSection, type ConfirmedAnswers } from './buildChecklist';

export interface ChecksListSection {
  id: string;
  title: string;
  /** Answered (any answer, Skip included) — the same count as the section chips. */
  done: number;
  total: number;
  entries: ChecklistEntry[];
}

/** Lower case without accents, so "verificari" finds "verificări" and "TIRE" finds "tire". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Every word of `query` must appear in the item's title or its section's title, in the shown language (`show`, e.g.
 * tr) or in English. `onlyOpen` keeps items without any answer. Sections with nothing left are dropped.
 */
export function checksList(
  sections: readonly ChecklistSection[],
  answers: ConfirmedAnswers,
  { query = '', onlyOpen = false }: { query?: string; onlyOpen?: boolean },
  show: (english: string) => string = (s) => s,
): ChecksListSection[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return sections
    .map((s) => {
      const sectionText = `${show(s.section.title)} ${s.section.title}`;
      const entries = s.entries.filter((e) => {
        if (onlyOpen && answers[e.item.id]) return false;
        if (words.length === 0) return true;
        const text = fold(`${show(e.item.title)} ${e.item.title} ${sectionText}`);
        return words.every((w) => text.includes(w));
      });
      const p = progress(s.entries, answers);
      return { id: s.section.id, title: s.section.title, done: p.touched, total: p.total, entries };
    })
    .filter((s) => s.entries.length > 0);
}
