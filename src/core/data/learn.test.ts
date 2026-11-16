import { GUIDES, learnFileSchema, rawLearn } from './learn';

describe('Learn guides', () => {
  it('are valid, with unique ids and at least the 7 guides from the brief', () => {
    expect(learnFileSchema.safeParse(rawLearn).success).toBe(true);
    expect(new Set(GUIDES.map((g) => g.id)).size).toBe(GUIDES.length);
    expect(GUIDES.map((g) => g.id)).toEqual(
      expect.arrayContaining(['tire_date', 'tread_test', 'ppi', 'papers', 'scams', 'test_drive', 'obd2']),
    );
  });

  it('every section has text or bullets', () => {
    for (const g of GUIDES) for (const s of g.sections) expect((s.text?.length ?? 0) + (s.bullets?.length ?? 0)).toBeGreaterThan(0);
  });

  it('keeps the test-drive safety line', () => {
    expect(JSON.stringify(GUIDES.find((g) => g.id === 'test_drive'))).toMatch(/safe and legal/);
  });
});
