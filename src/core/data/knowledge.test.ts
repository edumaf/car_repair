import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { MODEL_FILES, MODELS, OBD_CODES, SYMPTOMS, rawKnowledge } from './knowledge';
import { validateKnowledge } from './knowledgeSchema';
import { COMPLAINT_KEYWORD_GROUPS, REPAIR_COSTS } from './seed';

const refs = { repairCostIds: new Set(REPAIR_COSTS.map((c) => c.id)), complaintGroups: new Set(Object.keys(COMPLAINT_KEYWORD_GROUPS)) };

describe('knowledge files', () => {
  it('are valid, including references to repair costs and complaint groups', () => {
    expect(validateKnowledge(rawKnowledge, refs)).toEqual([]);
  });

  it('every data/models/*.json file is loaded', () => {
    const files = readdirSync(join(__dirname, '../../../data/models'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
    expect(Object.keys(MODEL_FILES).sort()).toEqual(files.sort());
  });

  it('has sensible sizes', () => {
    expect(MODELS.length).toBeGreaterThanOrEqual(40);
    expect(OBD_CODES.length).toBeGreaterThanOrEqual(150);
    expect(SYMPTOMS.length).toBeGreaterThanOrEqual(20);
  });

  it('keeps safety rules: urgent outcomes always tell you to see a mechanic or stop', () => {
    for (const s of SYMPTOMS) {
      for (const o of s.outcomes) {
        if (o.urgency === 'stop_now') expect(o.see_mechanic_if.length).toBeGreaterThan(0);
      }
    }
    for (const c of OBD_CODES.filter((x) => x.drive === 'stop')) expect(c.notes).toBeTruthy();
  });
});

describe('validateKnowledge catches broken data', () => {
  const clone = () => JSON.parse(JSON.stringify(rawKnowledge));
  it.each<[string, (k: any) => void, RegExp]>([
    ['unknown engine in a problem', (k) => (k.models.models[0].problems[0].engines = ['nope']), /unknown engine "nope"/],
    ['missing repair cost', (k) => (k.models.models[0].problems[0].repair_cost_id = 'nope'), /repair_cost_id "nope"/],
    ['unknown complaint group', (k) => (k.models.models[0].problems[0].complaint_group = 'nope'), /complaint_group "nope"/],
    ['duplicate model id', (k) => (k.models.models[1].id = k.models.models[0].id), /duplicate model id/],
    ['bad OBD code format', (k) => (k.obd.codes[0].code = 'X1234'), /OBD-II code/],
    ['duplicate OBD code', (k) => (k.obd.codes[1].code = k.obd.codes[0].code), /duplicate code/],
    [
      'symptom option to a missing outcome',
      (k) => (k.symptoms.symptoms[0].questions[0].options[0] = { label: 'x', outcome: 'nope' }),
      /outcome "nope" is missing/,
    ],
    [
      'symptom loop',
      (k) => (k.symptoms.symptoms[0].questions[1].options[0] = { label: 'x', next: k.symptoms.symptoms[0].questions[0].id }),
      /loop/,
    ],
    ['option with both next and outcome', (k) => (k.symptoms.symptoms[0].questions[0].options[0].next = 'feel'), /exactly one/],
  ])('%s', (_n, mutate, expected) => {
    const k = clone();
    mutate(k);
    expect(validateKnowledge(k, refs).join('\n')).toMatch(expected);
  });
});
