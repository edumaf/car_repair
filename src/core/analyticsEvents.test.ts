import { coverageBucket, recallsBucket } from './analyticsEvents';

describe('analytics buckets', () => {
  it.each([
    [null, 'unknown'],
    [0, '0'],
    [2, '1-2'],
    [5, '3-5'],
    [22, '6+'],
  ])('recalls %s → %s', (n, b) => expect(recallsBucket(n)).toBe(b));
  it.each([
    [0, '<40%'],
    [0.39, '<40%'],
    [0.4, '40-79%'],
    [0.95, '80-99%'],
    [1, '100%'],
  ])('coverage %s → %s', (c, b) => expect(coverageBucket(c)).toBe(b));
});
