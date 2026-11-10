import { describe, it, expect } from 'vitest';
import { momentum, pctChange, sum, trailingZeros } from '../seriesStats';

describe('seriesStats', () => {
  it('sums', () => expect(sum([1, 2, 3])).toBe(6));

  it('pctChange rounds and is null without a baseline', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(2, 3)).toBe(-33);
    expect(pctChange(5, 0)).toBeNull();
  });

  it('counts trailing zero days', () => {
    expect(trailingZeros([5, 0, 0])).toBe(2);
    expect(trailingZeros([0, 0, 0])).toBe(3);
    expect(trailingZeros([1, 2])).toBe(0);
  });

  it('momentum compares the last 3 days with the earlier days', () => {
    expect(momentum([10, 10, 10, 10, 5, 5, 5])).toBe(-50);
    expect(momentum([10, 10, 10])).toBeNull();
    expect(momentum([0, 0, 0, 0, 9, 9, 9])).toBeNull();
  });
});
