import { checkVin, computeCheckDigit, groupVin, maskVin, normalizeVin, vinFromBarcode, vinProblemMessage } from './vin';

describe('computeCheckDigit', () => {
  it.each([
    ['1HGCM82633A004352', '3'], // the textbook example VIN
    ['11111111111111111', '1'],
    ['1M8GDM9AXKP042788', 'X'],
  ])('%s → %s', (vin, digit) => {
    expect(computeCheckDigit(vin)).toBe(digit);
  });

  it('returns null for wrong length or invalid characters', () => {
    expect(computeCheckDigit('1HGCM82633A00435')).toBeNull();
    expect(computeCheckDigit('1HGCM82633A00435O')).toBeNull();
  });
});

describe('checkVin', () => {
  it('accepts a valid VIN and normalizes spacing/case', () => {
    expect(checkVin(' 1hgcm8-2633 a004352 ')).toEqual({ vin: '1HGCM82633A004352', problem: null, checkDigitOk: true });
  });

  it('flags a bad check digit as a warning, not a hard problem', () => {
    const c = checkVin('1HGCM82643A004352');
    expect(c.problem).toBeNull();
    expect(c.checkDigitOk).toBe(false);
    expect(vinProblemMessage(c)).toMatch(/standard check/);
  });

  it.each([
    ['', 'empty'],
    ['1HGCM82633A00435', 'too_short'],
    ['1HGCM82633A0043521', 'too_long'],
    ['1HGCM82633A0O4352', 'forbidden_letters'],
    ['1HGCM82633A0I4352', 'forbidden_letters'],
    ['1HGCM82633A0Q4352', 'forbidden_letters'],
    ['1HGCM82633A00435#', 'invalid_characters'],
  ])('%j → %s', (input, problem) => {
    expect(checkVin(input).problem).toBe(problem);
  });

  it('gives plain messages', () => {
    expect(vinProblemMessage(checkVin(''))).toBeNull();
    expect(vinProblemMessage(checkVin('1HGCM82633A00435'))).toMatch(/This one has 16/);
    expect(vinProblemMessage(checkVin('1HGCM82633A0O4352'))).toMatch(/I, O or Q/);
    expect(vinProblemMessage(checkVin('1HGCM82633A004352'))).toBeNull();
  });
});

describe('display helpers', () => {
  it('normalizes', () => expect(normalizeVin('ab c-d.e')).toBe('ABCDE'));
  it('groups 3-6-8', () => expect(groupVin('1HGCM82633A004352')).toEqual(['1HG', 'CM8263', '3A004352']));
  it('masks the serial', () => expect(maskVin('1HGCM82633A004352')).toBe('1HGCM82633A••••••'));
});

describe('vinFromBarcode', () => {
  it('reads a plain VIN', () => expect(vinFromBarcode('1HGCM82633A004352')).toBe('1HGCM82633A004352'));
  it('strips the leading "I" some door-jamb barcodes add', () => {
    expect(vinFromBarcode('I1HGCM82633A004352')).toBe('1HGCM82633A004352');
  });
  it('returns null when there is no VIN', () => expect(vinFromBarcode('hello world')).toBeNull());
});
