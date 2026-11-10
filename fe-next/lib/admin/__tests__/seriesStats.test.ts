import { describe, it, expect } from 'vitest';
import { dayPace, momentum, pctChange, sum, trailingZeros } from '../seriesStats';

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

describe('dayPace', () => {
  const at = (hhmm: string) => Date.parse(`2026-11-10T${hhmm}:00Z`);
  it('projects today from the share of the day that has passed', () => {
    expect(dayPace(30, 40, at('18:00'))).toEqual({ projected: 40, pct: 0 });
    expect(dayPace(10, 40, at('12:00'))).toEqual({ projected: 20, pct: -50 });
  });
  it('stays silent in the first hours', () => {
    expect(dayPace(2, 40, at('03:00'))).toEqual({ projected: null, pct: null });
  });
  it('has no percent without a yesterday', () => {
    expect(dayPace(5, 0, at('12:00'))).toEqual({ projected: 10, pct: null });
  });
});
