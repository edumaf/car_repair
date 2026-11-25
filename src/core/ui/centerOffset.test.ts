import { centerOffset } from './centerOffset';

describe('centerOffset (section chips follow the current section)', () => {
  it('centers a chip in the middle of the strip', () => {
    expect(centerOffset({ x: 600, width: 100 }, 400, 1500)).toBe(450);
  });
  it('stays at the start for the first chips', () => {
    expect(centerOffset({ x: 16, width: 180 }, 400, 1500)).toBe(0);
  });
  it('stops at the end for the last chip', () => {
    expect(centerOffset({ x: 1380, width: 104 }, 400, 1500)).toBe(1100);
  });
  it('does not scroll when everything fits', () => {
    expect(centerOffset({ x: 200, width: 100 }, 400, 380)).toBe(0);
  });
});
