import { ALLOWED_FINDINGS } from './types';
import { FINDING_LABEL, findingLabel, sanitizePhotoResult } from './findings';

describe('findings', () => {
  it('has a label for every allowed finding code', () => {
    for (const codes of Object.values(ALLOWED_FINDINGS)) for (const c of codes) expect(FINDING_LABEL[c]).toBeTruthy();
    expect(findingLabel('some_new_code')).toBe('some new code');
  });

  it('drops codes not allowed for the photo type and unknown lights', () => {
    const r = sanitizePhotoResult(
      {
        quality: { ok: true, retake_tip: null },
        findings: [
          { code: 'tread_low', confidence: 'high', description: 'x'.repeat(200) },
          { code: 'perforation', confidence: 'high', description: 'not a tire finding' },
        ],
        lights: ['check_engine', 'disco_mode' as never],
        transcriptions: {},
        notes_for_user: '',
      },
      'tire',
    );
    expect(r.findings.map((f) => f.code)).toEqual(['tread_low']);
    expect(r.findings[0].description).toHaveLength(140);
    expect(r.lights).toEqual([]);
  });
});
