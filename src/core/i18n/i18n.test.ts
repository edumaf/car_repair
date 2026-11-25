import { missing } from '../../../scripts/i18n-extract';
import ro from './ro.json';
import { getLang, langFromLocale, plural, setLang, tr } from './i18n';

describe('i18n', () => {
  afterEach(() => setLang('en'));

  it('every visible string has a Romanian translation (run `npm run i18n` to list gaps)', () => {
    expect(missing(ro as Record<string, string>).map((m) => `${m.where}: ${m.key}`)).toEqual([]);
  });

  it('translations keep the same {placeholders}', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const bad = Object.entries(ro as Record<string, string>).filter(([k, v]) => ph(k) !== ph(v));
    expect(bad).toEqual([]);
  });

  it('falls back to English, keeps surrounding spaces and fills variables', () => {
    setLang('en');
    expect(tr('Compare {n} cars', { n: 2 })).toBe('Compare 2 cars');
    setLang('ro');
    expect(getLang()).toBe('ro');
    expect(tr('Compare {n} cars', { n: 2 })).toBe('Compară 2 mașini');
    expect(tr(' (matches)')).toBe(' (se potrivește)');
    expect(tr('Not a key at all')).toBe('Not a key at all');
  });

  it('Romanian plurals use "de" from 20', () => {
    setLang('ro');
    expect(plural(1, '{n} recall', '{n} recalls', '{n} de rechemări')).toBe('1 rechemare');
    expect(plural(3, '{n} recall', '{n} recalls', '{n} de rechemări')).toBe('3 rechemări');
    expect(plural(25, '{n} recall', '{n} recalls', '{n} de rechemări')).toBe('25 de rechemări');
    setLang('en');
    expect(plural(25, '{n} recall', '{n} recalls', '{n} de rechemări')).toBe('25 recalls');
  });

  it('picks Romanian only for ro locales', () => {
    expect(langFromLocale('ro-RO')).toBe('ro');
    expect(langFromLocale('en-US')).toBe('en');
    expect(langFromLocale(undefined)).toBe('en');
  });
});
