// Every reviewed data string shown in the app has a Romanian translation (data/i18n/ro.json).
import learn from '../../../content/learn.json';
import roData from '../../../data/i18n/ro.json';
import { MODELS, OBD_CODES, SYMPTOMS } from '../data/knowledge';
import { CHECKLIST_ITEMS, FIELD_FLAGS, LISTING_FLAGS, REPAIR_COSTS, SECTIONS } from '../data/seed';

const ro = roData as Record<string, string>;
const missing = (strings: (string | undefined)[]) => [...new Set(strings.filter((s): s is string => !!s && !(s in ro)))];

describe('Romanian data translations', () => {
  it('inspection checklist', () => {
    expect(missing(SECTIONS.map((s) => s.title))).toEqual([]);
    expect(missing(CHECKLIST_ITEMS.flatMap((i) => [i.title, ...i.how_to_check, ...i.bad_signs]))).toEqual([]);
  });

  it('repair cost names', () => {
    expect(missing(REPAIR_COSTS.map((c) => c.name))).toEqual([]);
  });

  it('listing warning signs', () => {
    expect(missing([...LISTING_FLAGS, ...FIELD_FLAGS].flatMap((f) => [f.explanation, f.ask_seller]))).toEqual([]);
  });

  it('Diagnose: OBD codes', () => {
    expect(
      missing(OBD_CODES.flatMap((c) => [c.title, c.system, c.notes, ...c.causes.flatMap((x) => [x.text, x.diy_check])])),
    ).toEqual([]);
  });

  it('Diagnose: symptom flows', () => {
    expect(
      missing(
        SYMPTOMS.flatMap((s) => [
          s.title,
          s.category,
          ...s.questions.flatMap((q) => [q.text, ...q.options.map((o) => o.label)]),
          ...s.outcomes.flatMap((o) => [o.title, ...o.see_mechanic_if, ...o.causes.flatMap((x) => [x.text, x.diy_check])]),
        ]),
      ),
    ).toEqual([]);
  });

  it('model pages: strengths, problems, buying tips', () => {
    expect(
      missing(
        MODELS.flatMap((m) => [
          ...m.strengths,
          ...m.buying_tips,
          ...m.problems.flatMap((p) => [p.title, ...p.symptoms, ...p.what_to_check]),
        ]),
      ),
    ).toEqual([]);
  });

  it('Learn guides', () => {
    type Section = { heading?: string; text?: string[]; bullets?: string[] };
    const guides = (learn as { guides: { title: string; sections: Section[] }[] }).guides;
    expect(
      missing(guides.flatMap((g) => [g.title, ...g.sections.flatMap((s) => [s.heading, ...(s.text ?? []), ...(s.bullets ?? [])])])),
    ).toEqual([]);
  });
});
