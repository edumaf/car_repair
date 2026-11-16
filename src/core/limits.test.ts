import { canInspectFree, canRunPhotoCheck, FREE_PHOTO_CHECKS_PER_INSPECTION, paywallHeadline } from './limits';

describe('free tier', () => {
  it('the first inspected car is free, others are not', () => {
    expect(canInspectFree(null, 'a')).toBe(true);
    expect(canInspectFree('a', 'a')).toBe(true);
    expect(canInspectFree('a', 'b')).toBe(false);
  });

  it('allows 10 photo checks on the free inspection, unlimited with premium', () => {
    expect(canRunPhotoCheck(false, FREE_PHOTO_CHECKS_PER_INSPECTION - 1)).toBe(true);
    expect(canRunPhotoCheck(false, FREE_PHOTO_CHECKS_PER_INSPECTION)).toBe(false);
    expect(canRunPhotoCheck(true, 500)).toBe(true);
  });

  it('personalises the headline', () => {
    expect(paywallHeadline('scams')).toMatch(/scams/);
    expect(paywallHeadline(undefined)).toMatch(/every car/);
  });
});
