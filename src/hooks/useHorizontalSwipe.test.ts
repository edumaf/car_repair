import { isSwipe } from './useHorizontalSwipe';

describe('isSwipe', () => {
  it.each([
    [-80, 5, true], // left
    [90, -10, true], // right
    [40, 0, false], // too short (a tap that slid a little)
    [70, 50, false], // diagonal: more like a scroll
    [10, 200, false], // vertical scroll
  ])('dx %p, dy %p → %p', (dx, dy, expected) => {
    expect(isSwipe(dx, dy)).toBe(expected);
  });
});
