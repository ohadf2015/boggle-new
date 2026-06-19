import { describe, it, expect } from 'vitest';
import {
  evaluatePlacement,
  nextConsecutiveSloppy,
  craneOffsetAt,
  nextPerfectStreak,
  perfectStreakBonus,
  alignmentBand,
  PERFECT_MAX,
  GOOD_MAX,
  SLOPPY_MAX,
} from '../cranePlacement';

describe('alignmentBand — live drop-quality preview (matches the scorer)', () => {
  it('classifies the absolute offset into the same bands evaluatePlacement scores', () => {
    expect(alignmentBand(0)).toBe('perfect');
    expect(alignmentBand(PERFECT_MAX)).toBe('perfect');
    expect(alignmentBand(PERFECT_MAX + 0.01)).toBe('good');
    expect(alignmentBand(GOOD_MAX)).toBe('good');
    expect(alignmentBand(GOOD_MAX + 0.01)).toBe('sloppy');
    expect(alignmentBand(SLOPPY_MAX)).toBe('sloppy');
    expect(alignmentBand(SLOPPY_MAX + 0.01)).toBe('miss');
    expect(alignmentBand(1)).toBe('miss');
  });
  it('agrees with the verdict evaluatePlacement actually returns (single source of truth)', () => {
    for (const e of [0, 0.05, 0.08, 0.2, 0.25, 0.4, 0.6, 0.8, 1]) {
      expect(alignmentBand(e)).toBe(evaluatePlacement(e, 0).quality);
    }
  });
});

describe('evaluatePlacement — cosy reward amplifier (never a fail-gate)', () => {
  it('dead-centre drop is PERFECT: full block, height bonus, no topple', () => {
    const r = evaluatePlacement(0, 0);
    expect(r.quality).toBe('perfect');
    expect(r.perfect).toBe(true);
    expect(r.overlap).toBe(1);
    expect(r.heightMultiplier).toBeGreaterThan(1);
    expect(r.topples).toBe(false);
  });

  it('a slightly-off drop is still GOOD with full height', () => {
    const r = evaluatePlacement(0.2, 0);
    expect(r.quality).toBe('good');
    expect(r.heightMultiplier).toBe(1);
    expect(r.overlap).toBeCloseTo(0.8);
    expect(r.topples).toBe(false);
  });

  it('a loose drop is SLOPPY: trims and reduces height, but tower stands', () => {
    const r = evaluatePlacement(0.5, 0);
    expect(r.quality).toBe('sloppy');
    expect(r.heightMultiplier).toBeLessThan(1);
    expect(r.overlap).toBeCloseTo(0.5);
    expect(r.topples).toBe(false);
  });

  it('a bad drop MISSES but is cosy-caught at a minimum width, run continues', () => {
    const r = evaluatePlacement(0.85, 0);
    expect(r.quality).toBe('miss');
    expect(r.overlap).toBeGreaterThanOrEqual(0.2);
    expect(r.heightMultiplier).toBeGreaterThan(0);
    expect(r.topples).toBe(false); // not enough prior instability
  });

  it('only topples on a miss AFTER two prior bad drops (recoverable)', () => {
    expect(evaluatePlacement(0.85, 2).topples).toBe(true);
    expect(evaluatePlacement(0.85, 1).topples).toBe(false);
    // a single good drop never topples regardless of history
    expect(evaluatePlacement(0.1, 9).topples).toBe(false);
  });

  it('clamps the offset into [0,1] (negative = centre, huge = miss)', () => {
    expect(evaluatePlacement(-0.5, 0).quality).toBe('perfect');
    expect(evaluatePlacement(5, 0).quality).toBe('miss');
  });

  it('overlap never increases as the drop gets worse', () => {
    const offsets = [0, 0.1, 0.3, 0.5, 0.9];
    const overlaps = offsets.map((o) => evaluatePlacement(o, 0).overlap);
    for (let i = 1; i < overlaps.length; i++) {
      expect(overlaps[i]).toBeLessThanOrEqual(overlaps[i - 1]);
    }
  });
});

describe('nextConsecutiveSloppy — instability counter', () => {
  it('resets on a clean drop', () => {
    expect(nextConsecutiveSloppy(3, 'perfect')).toBe(0);
    expect(nextConsecutiveSloppy(3, 'good')).toBe(0);
  });
  it('increments on a bad drop', () => {
    expect(nextConsecutiveSloppy(1, 'sloppy')).toBe(2);
    expect(nextConsecutiveSloppy(2, 'miss')).toBe(3);
  });
});

describe('nextPerfectStreak — chaining accurate drops', () => {
  it('increments on a perfect drop', () => {
    expect(nextPerfectStreak(0, 'perfect')).toBe(1);
    expect(nextPerfectStreak(2, 'perfect')).toBe(3);
  });
  it('resets on any non-perfect drop', () => {
    expect(nextPerfectStreak(3, 'good')).toBe(0);
    expect(nextPerfectStreak(3, 'sloppy')).toBe(0);
    expect(nextPerfectStreak(3, 'miss')).toBe(0);
  });
});

describe('perfectStreakBonus — escalating reward for a run of perfects', () => {
  it('gives no bonus for a lone perfect', () => {
    expect(perfectStreakBonus(0)).toBe(0);
    expect(perfectStreakBonus(1)).toBe(0);
  });
  it('grows with the streak', () => {
    expect(perfectStreakBonus(2)).toBeGreaterThan(0);
    expect(perfectStreakBonus(4)).toBeGreaterThan(perfectStreakBonus(2));
  });
  it('caps so it never runs away', () => {
    expect(perfectStreakBonus(50)).toBeLessThanOrEqual(0.5);
    expect(perfectStreakBonus(50)).toBe(perfectStreakBonus(999));
  });
});

describe('craneOffsetAt — sweeping crane position', () => {
  it('starts centred and stays within [-1, 1]', () => {
    expect(craneOffsetAt(0, 2000)).toBeCloseTo(0);
    for (let t = 0; t <= 2000; t += 137) {
      const x = craneOffsetAt(t, 2000);
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
  it('reaches the extremes a quarter and three-quarters through the sweep', () => {
    expect(craneOffsetAt(500, 2000)).toBeCloseTo(1);
    expect(craneOffsetAt(1500, 2000)).toBeCloseTo(-1);
  });
});
