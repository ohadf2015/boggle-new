import { ROUND_COUNT, getRoundTarget, getRoundBagSize } from '../runTargets';

describe('runTargets', () => {
  it('defines a 3-round run', () => {
    expect(ROUND_COUNT).toBe(3);
  });

  it('targets escalate round over round', () => {
    expect(getRoundTarget(1, 7)).toBeLessThan(getRoundTarget(2, 7));
    expect(getRoundTarget(2, 7)).toBeLessThan(getRoundTarget(3, 7));
  });

  it('a 9x9 board has a higher target than 7x7 for the same round', () => {
    expect(getRoundTarget(1, 9)).toBeGreaterThan(getRoundTarget(1, 7));
  });

  it('bag size grows each round', () => {
    expect(getRoundBagSize(1)).toBeLessThan(getRoundBagSize(2));
    expect(getRoundBagSize(2)).toBeLessThan(getRoundBagSize(3));
  });

  it('clamps out-of-range rounds to the last defined value', () => {
    expect(getRoundTarget(99, 7)).toBe(getRoundTarget(3, 7));
    expect(getRoundBagSize(99)).toBe(getRoundBagSize(3));
  });
});
