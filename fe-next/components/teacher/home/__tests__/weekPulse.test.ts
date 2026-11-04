import { describe, expect, it } from 'vitest';
import { classesPlayedShare } from '../weekPulse';

describe('classesPlayedShare', () => {
  it('Given 1 of 3 classes played, Then the meter is a third full', () => {
    expect(classesPlayedShare(1, 3)).toEqual({ played: 1, total: 3, fraction: 1 / 3 });
  });

  it('Given no classes, Then the meter is empty instead of dividing by zero', () => {
    expect(classesPlayedShare(0, 0)).toEqual({ played: 0, total: 0, fraction: 0 });
  });

  it('Given a class that played and was then deleted, Then the meter never overflows', () => {
    expect(classesPlayedShare(4, 3)).toEqual({ played: 3, total: 3, fraction: 1 });
  });

  it('Given a bad count, Then it reads as zero', () => {
    expect(classesPlayedShare(Number.NaN, 2)).toEqual({ played: 0, total: 2, fraction: 0 });
    expect(classesPlayedShare(-1, 2)).toEqual({ played: 0, total: 2, fraction: 0 });
  });
});
