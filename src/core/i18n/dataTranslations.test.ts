// Every reviewed data string shown in the app has a Romanian translation (data/i18n/ro.json).
import learn from '../../../content/learn.json';
import roData from '../../../data/i18n/ro.json';
import { CHECKLIST_ITEMS, FIELD_FLAGS, LISTING_FLAGS, SECTIONS } from '../data/seed';

const ro = roData as Record<string, string>;
const missing = (strings: (string | undefined)[]) => [...new Set(strings.filter((s): s is string => !!s && !(s in ro)))];

describe('Romanian data translations', () => {
  it('inspection checklist', () => {
    expect(missing(SECTIONS.map((s) => s.title))).toEqual([]);
    expect(missing(CHECKLIST_ITEMS.flatMap((i) => [i.title, ...i.how_to_check, ...i.bad_signs]))).toEqual([]);
  });

  it('listing warning signs', () => {
    expect(missing([...LISTING_FLAGS, ...FIELD_FLAGS].flatMap((f) => [f.explanation, f.ask_seller]))).toEqual([]);
  });

  it('Learn guides', () => {
    type Section = { heading?: string; text?: string[]; bullets?: string[] };
    const guides = (learn as { guides: { title: string; sections: Section[] }[] }).guides;
    expect(
      missing(guides.flatMap((g) => [g.title, ...g.sections.flatMap((s) => [s.heading, ...(s.text ?? []), ...(s.bullets ?? [])])])),
    ).toEqual([]);
  });
});
