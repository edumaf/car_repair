// VIN helpers (CLAUDE.md §6.2): 17 characters, no I/O/Q, North American check digit in position 9.
// A failed check digit is a warning, not an error: some imports and older VINs don't use it.

const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export const VIN_LENGTH = 17;

/** Uppercases and removes spaces, dashes and dots that people type or OCR picks up. */
export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[\s\-.]/g, '');
}

/** The expected check digit ('0'–'9' or 'X') for a 17-character VIN, or null if it has invalid characters. */
export function computeCheckDigit(vin: string): string | null {
  if (vin.length !== VIN_LENGTH) return null;
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    const ch = vin[i];
    const value = /[0-9]/.test(ch) ? Number(ch) : TRANSLITERATION[ch];
    if (value === undefined) return null;
    sum += value * WEIGHTS[i];
  }
  const rem = sum % 11;
  return rem === 10 ? 'X' : String(rem);
}

export type VinProblem = 'empty' | 'too_short' | 'too_long' | 'forbidden_letters' | 'invalid_characters';

export interface VinCheck {
  /** The cleaned-up VIN (uppercase, no separators). */
  vin: string;
  /** Hard problems: the VIN can't be used for a lookup until fixed. */
  problem: VinProblem | null;
  /** True when the position-9 check digit matches. Only meaningful when problem is null. */
  checkDigitOk: boolean;
}

export function checkVin(input: string): VinCheck {
  const vin = normalizeVin(input);
  const result = (problem: VinProblem | null, checkDigitOk = false): VinCheck => ({ vin, problem, checkDigitOk });
  if (vin.length === 0) return result('empty');
  if (/[IOQ]/.test(vin)) return result('forbidden_letters');
  if (/[^A-HJ-NPR-Z0-9]/.test(vin)) return result('invalid_characters');
  if (vin.length < VIN_LENGTH) return result('too_short');
  if (vin.length > VIN_LENGTH) return result('too_long');
  return result(null, computeCheckDigit(vin) === vin[8]);
}

/** Plain-English message for a VIN problem, for the VIN field. */
export function vinProblemMessage(check: VinCheck): string | null {
  switch (check.problem) {
    case 'empty':
      return null;
    case 'too_short':
      return `A VIN has 17 characters. This one has ${check.vin.length}.`;
    case 'too_long':
      return `A VIN has 17 characters. This one has ${check.vin.length}.`;
    case 'forbidden_letters':
      return 'VINs never use the letters I, O or Q. Did you mean 1 or 0?';
    case 'invalid_characters':
      return 'A VIN only has letters and numbers.';
    case null:
      return check.checkDigitOk
        ? null
        : "This VIN doesn't pass the standard check. Compare it with the door sticker; imported cars can be an exception.";
  }
}

/** Groups a VIN 3-6-8 for display (manufacturer · vehicle description · vehicle identifier). */
export function groupVin(vin: string): [string, string, string] {
  return [vin.slice(0, 3), vin.slice(3, 9), vin.slice(9)];
}

/** Hides the serial part of a VIN, keeping make/model info: "1HGCM8263A••••••". */
export function maskVin(vin: string): string {
  return vin.length <= 11 ? vin : vin.slice(0, 11) + '•'.repeat(vin.length - 11);
}

/** Recognizes a VIN inside barcode text (door-jamb barcodes sometimes add a leading "I" or extra data). */
export function vinFromBarcode(data: string): string | null {
  const cleaned = normalizeVin(data);
  const candidates = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/g) ?? [];
  // Prefer a candidate that passes the check digit; otherwise the first 17-character run.
  return candidates.find((c) => computeCheckDigit(c) === c[8]) ?? candidates[0] ?? null;
}
