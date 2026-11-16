// Tiny gettext-style i18n (English + Romanian at launch, CLAUDE.md scope change §6). Pure TS, no RN imports.
//
// The English text IS the key: code keeps readable English, `ro.json` maps it to Romanian, and anything missing
// falls back to English. AppText translates its string children automatically, so most screens need no changes;
// use tr() for text that doesn't go through AppText (alerts, placeholders, headers, clipboard) or has variables:
//   tr('Only {pct}% of the checks are done.', { pct })
// Mark static strings that are shown later (e.g. in a lookup table) with tk() so the extractor finds them.
// `npm run i18n` lists strings without a Romanian translation; a Jest test fails if any are missing.
import roData from '../../../data/i18n/ro.json';
import ro from './ro.json';

export const LANGS = ['en', 'ro'] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', ro: 'Română' };

// UI strings (ro.json) plus reviewed data text: checklist, listing warning signs, guides (data/i18n/ro.json).
const DICTS: Record<Lang, Record<string, string>> = { en: {}, ro: { ...roData, ...ro } as Record<string, string> };

export function langFromLocale(locale: string | undefined): Lang {
  return locale?.toLowerCase().startsWith('ro') ? 'ro' : 'en';
}

function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

let lang: Lang = langFromLocale(deviceLocale());
const listeners = new Set<(l: Lang) => void>();

export const getLang = (): Lang => lang;

export function setLang(next: Lang): void {
  if (next === lang || !LANGS.includes(next)) return;
  lang = next;
  listeners.forEach((l) => l(lang));
}

export function onLangChange(listener: (l: Lang) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

/** Translates English source text to the current language. Surrounding whitespace is kept (JSX fragments). */
export function tr(source: string, vars?: Vars, to: Lang = lang): string {
  if (to === 'en' || !source) return fill(source, vars);
  const trimmed = source.trim();
  const hit = DICTS[to][trimmed];
  if (hit === undefined) return fill(source, vars);
  const lead = source.slice(0, source.indexOf(trimmed));
  const trail = source.slice(source.indexOf(trimmed) + trimmed.length);
  return lead + fill(hit, vars) + trail;
}

/** Marks a static English string for translation without translating it now (it's translated when shown). */
export const tk = <T extends string>(source: T): T => source;

/** Picks the right plural form: plural(n, '{n} recall', '{n} recalls'). Romanian uses "de" from 20 up. */
export function plural(n: number, one: string, other: string, roOther20?: string): string {
  if (n === 1) return tr(one, { n });
  if (lang === 'ro' && roOther20 && (n === 0 || n % 100 >= 20)) return tr(roOther20, { n });
  return tr(other, { n });
}
