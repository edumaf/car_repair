import { shareFacts } from './shareFacts';

describe('shareFacts', () => {
  it('gives at most 3 facts, in priority order, and hides costs outside the US', () => {
    const base = { recallsCount: 2, repairEstimate: { low: 900, high: 1800 }, knownProblemArea: 'Transmission', checked: 40, total: 54 };
    expect(shareFacts({ ...base, showCosts: true })).toEqual([
      '40 of 54 checks done',
      '$900–$1,800 likely repairs',
      'Transmission: known problem area',
    ]);
    expect(shareFacts({ ...base, showCosts: false })).toEqual([
      '40 of 54 checks done',
      'Transmission: known problem area',
      '2 recalls for this model',
    ]);
  });

  it('never includes identifying details', () => {
    const facts = shareFacts({ recallsCount: 1, repairEstimate: null, showCosts: true, knownProblemArea: null, checked: 0, total: 0 });
    expect(facts).toEqual(['1 recall for this model']);
  });
});
