import { tr } from '../i18n/i18n';
import { buildChecklist } from './buildChecklist';
import { checksList } from './checksList';

const sections = buildChecklist({ powertrain: 'gas' }, []);
const ids = (list: ReturnType<typeof checksList>) => list.flatMap((s) => s.entries.map((e) => e.item.id));
const total = sections.reduce((n, s) => n + s.entries.length, 0);

describe('checksList (All checks in the inspection)', () => {
  it('lists every check, grouped by section, with the same counts as the section chips', () => {
    const list = checksList(sections, { body_rust: 'problem', tire_tread: 'skip' }, {});
    expect(ids(list)).toHaveLength(total);
    expect(list.map((s) => s.id)).toEqual(sections.map((s) => s.section.id));
    expect(list.find((s) => s.id === 'exterior')?.done).toBe(1);
    expect(list.find((s) => s.id === 'tires_wheels')?.done).toBe(1); // Skip counts as answered, like the chips
  });

  it('finds checks by any word, ignoring case', () => {
    const rust = ids(checksList(sections, {}, { query: 'RUST' }));
    expect(rust).toEqual(expect.arrayContaining(['body_rust', 'underbody_rust']));
    expect(rust).not.toContain('tire_tread');
    expect(ids(checksList(sections, {}, { query: 'tire tread' }))).toEqual(['tire_tread']);
    expect(checksList(sections, {}, { query: 'zzzz' })).toEqual([]);
  });

  it('a section name finds all of its checks', () => {
    const list = checksList(sections, {}, { query: 'wheels' });
    const tires = list.find((s) => s.id === 'tires_wheels');
    expect(tires?.entries.length).toBe(sections.find((s) => s.section.id === 'tires_wheels')!.entries.length);
    expect(list.map((s) => s.id)).not.toContain('documents');
  });

  it('searches the shown language without accents, and English too', () => {
    const ro = (s: string) => tr(s, undefined, 'ro');
    expect(ids(checksList(sections, {}, { query: 'rugina' }, ro))).toEqual(expect.arrayContaining(['body_rust', 'underbody_rust']));
    expect(ids(checksList(sections, {}, { query: 'adâncimea' }, ro))).toEqual(['tire_tread']);
    expect(ids(checksList(sections, {}, { query: 'tread' }, ro))).toEqual(['tire_tread']);
  });

  it('"only unanswered" hides answered and skipped checks and drops finished sections', () => {
    const answered = Object.fromEntries(sections.find((s) => s.section.id === 'documents')!.entries.map((e) => [e.item.id, 'ok' as const]));
    const list = checksList(sections, { ...answered, tire_tread: 'skip', body_rust: 'not_sure' }, { onlyOpen: true });
    const open = ids(list);
    expect(list.map((s) => s.id)).not.toContain('documents');
    expect(open).not.toContain('tire_tread');
    expect(open).not.toContain('body_rust');
    expect(open).toContain('tire_wear_pattern');
  });
});
