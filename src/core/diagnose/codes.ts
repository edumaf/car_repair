// OBD-II code lookup for the Diagnose tab (CLAUDE.md §20). Generic codes come from data/obd_codes.json;
// manufacturer-specific codes get an honest "look it up for your make" answer.
import { OBD_CODES } from '../data/knowledge';
import { tr } from '../i18n/i18n';
import type { ObdCode } from '../data/knowledgeSchema';

export const CODE_PATTERN = /^[PCBU][0-3][0-9A-F]{3}$/;

/** "p 0301" / "P0301 " → "P0301"; also accepts a missing leading letter for powertrain ("0301" → "P0301"). */
export function normalizeCode(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[0-3][0-9A-F]{3}$/.test(s) ? `P${s}` : s;
}

const SYSTEM_BY_LETTER: Record<string, string> = {
  P: 'Powertrain (engine, gearbox, emissions)',
  C: 'Chassis (brakes, steering, suspension)',
  B: 'Body (airbags, comfort, lights)',
  U: 'Network (communication between modules)',
};

export type CodeLookup =
  | { kind: 'known'; code: ObdCode }
  | { kind: 'manufacturer'; code: string; system: string }
  | { kind: 'unknown_generic'; code: string; system: string }
  | { kind: 'invalid'; input: string };

export function lookupCode(input: string, codes: readonly ObdCode[] = OBD_CODES): CodeLookup {
  const code = normalizeCode(input);
  if (!CODE_PATTERN.test(code)) return { kind: 'invalid', input };
  const known = codes.find((c) => c.code === code);
  if (known) return { kind: 'known', code: known };
  const system = SYSTEM_BY_LETTER[code[0]];
  // Second character 1 (and 3 for B/C/U) means manufacturer-specific under SAE J2012.
  const manufacturer = code[1] === '1' || (code[1] === '3' && code[0] !== 'P');
  return manufacturer ? { kind: 'manufacturer', code, system } : { kind: 'unknown_generic', code, system };
}

/** Search by code prefix ("P03") or words in the title/system ("misfire", "oxygen"). */
export function searchCodes(query: string, codes: readonly ObdCode[] = OBD_CODES, limit = 30): ObdCode[] {
  const q = query.trim();
  if (!q) return [];
  const asCode = normalizeCode(q);
  if (/^[PCBU][0-9A-F]{0,4}$/.test(asCode)) {
    const byCode = codes.filter((c) => c.code.startsWith(asCode));
    if (byCode.length) return byCode.slice(0, limit);
  }
  // Words match the English text and, in Romanian, the translation too; accents don't matter ("rateu" = "rateu").
  const words = fold(q).split(/\s+/).filter(Boolean);
  const haystack = (c: ObdCode) => fold(`${c.title} ${c.system} ${tr(c.title)} ${tr(c.system)}`);
  return codes.filter((c) => words.every((w) => haystack(c).includes(w))).slice(0, limit);
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const LIKELIHOOD_ORDER = { common: 0, possible: 1, rare: 2 } as const;
export const sortCauses = <T extends { likelihood: keyof typeof LIKELIHOOD_ORDER }>(causes: readonly T[]): T[] =>
  [...causes].sort((a, b) => LIKELIHOOD_ORDER[a.likelihood] - LIKELIHOOD_ORDER[b.likelihood]);
