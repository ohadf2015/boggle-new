import { describe, it, expect } from 'vitest';
import { formatLiveShort, streakStripCells, clampPercent } from '../homeHubFormat';

describe('formatLiveShort', () => {
  it('leaves sub-1000 counts as plain integers', () => {
    expect(formatLiveShort(0)).toBe('0');
    expect(formatLiveShort(7)).toBe('7');
    expect(formatLiveShort(980)).toBe('980');
    expect(formatLiveShort(999)).toBe('999');
  });

  it('compacts thousands with one decimal, trimming a trailing .0', () => {
    expect(formatLiveShort(1000)).toBe('1k');
    expect(formatLiveShort(1240)).toBe('1.2k');
    expect(formatLiveShort(12000)).toBe('12k');
    expect(formatLiveShort(12500)).toBe('12.5k');
  });

  it('is defensive against negative / non-finite input', () => {
    expect(formatLiveShort(-5)).toBe('0');
    expect(formatLiveShort(Number.NaN)).toBe('0');
    expect(formatLiveShort(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('streakStripCells', () => {
  it('fills the first N of `total` cells from the start', () => {
    expect(streakStripCells(4, 5)).toEqual([true, true, true, true, false]);
    expect(streakStripCells(0, 5)).toEqual([false, false, false, false, false]);
    expect(streakStripCells(5, 5)).toEqual([true, true, true, true, true]);
  });

  it('caps at `total` for long streaks and floors negatives at 0', () => {
    expect(streakStripCells(99, 5)).toEqual([true, true, true, true, true]);
    expect(streakStripCells(-3, 5)).toEqual([false, false, false, false, false]);
  });

  it('defaults to 5 cells', () => {
    expect(streakStripCells(2)).toHaveLength(5);
  });
});

describe('clampPercent', () => {
  it('clamps into the 0..100 range', () => {
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
  });

  it('coerces non-finite to 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});
