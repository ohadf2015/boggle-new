import { describe, it, expect } from 'vitest';
import {
  craneOffsetAt,
  craneSwingFactor,
  sweepPeriodMs,
  effectiveSweepPeriodMs,
  SWEEP_PERIOD_START_MS,
  SWEEP_PERIOD_FLOOR_MS,
  SWEEP_PERIOD_CEILING_MS,
} from '../craneSweep';

describe('craneSwingFactor — swing widens per letter, capped (#9)', () => {
  it('sits at the gentle floor for the shortest words', () => {
    expect(craneSwingFactor(3)).toBeCloseTo(0.5);
    expect(craneSwingFactor(2)).toBeCloseTo(0.5); // never below the floor
    expect(craneSwingFactor(0)).toBeCloseTo(0.5);
  });
  it('grows with each added letter', () => {
    expect(craneSwingFactor(4)).toBeGreaterThan(craneSwingFactor(3));
    expect(craneSwingFactor(6)).toBeGreaterThan(craneSwingFactor(5));
    expect(craneSwingFactor(5)).toBeCloseTo(0.7);
  });
  it('caps at the full sweep (max swing)', () => {
    expect(craneSwingFactor(8)).toBeCloseTo(1);
    expect(craneSwingFactor(12)).toBe(1); // never exceeds the max
  });
});

describe('craneSweep — constant-velocity triangle sweep', () => {
  const P = 2000;

  it('crosses zero at the start and at the half period', () => {
    expect(craneOffsetAt(0, P)).toBeCloseTo(0, 6);
    expect(craneOffsetAt(P / 2, P)).toBeCloseTo(0, 6);
    expect(craneOffsetAt(P, P)).toBeCloseTo(0, 6); // wraps
  });

  it('peaks at +1 a quarter in and -1 three quarters in (matches sine phase)', () => {
    expect(craneOffsetAt(P / 4, P)).toBeCloseTo(1, 6);
    expect(craneOffsetAt((3 * P) / 4, P)).toBeCloseTo(-1, 6);
  });

  it('stays within [-1, 1]', () => {
    for (let t = 0; t <= P; t += P / 64) {
      const x = craneOffsetAt(t, P);
      expect(x).toBeGreaterThanOrEqual(-1.0000001);
      expect(x).toBeLessThanOrEqual(1.0000001);
    }
  });

  it('moves at CONSTANT speed — equal phase steps give equal position deltas (the fairness fix)', () => {
    // Sample within the rising quarter [0, P/4]; sine would accelerate, triangle must not.
    const step = P / 32;
    const deltas: number[] = [];
    for (let t = 0; t + step <= P / 4; t += step) {
      deltas.push(Math.abs(craneOffsetAt(t + step, P) - craneOffsetAt(t, P)));
    }
    const first = deltas[0];
    for (const d of deltas) expect(d).toBeCloseTo(first, 5);
  });

  it('spends as much time near centre (perfect band) as near the edges — no center penalty', () => {
    // Count samples landing in the perfect band vs an equal-width edge band.
    const near = (lo: number, hi: number) => {
      let n = 0;
      for (let t = 0; t < P; t += P / 1000) {
        const a = Math.abs(craneOffsetAt(t, P));
        if (a >= lo && a < hi) n++;
      }
      return n;
    };
    const centre = near(0, 0.08);
    const edge = near(0.9, 0.98);
    // Constant velocity => roughly equal dwell in equal-width bands.
    expect(Math.abs(centre - edge)).toBeLessThan(centre * 0.25);
  });

  it('returns 0 for a non-positive period (guard)', () => {
    expect(craneOffsetAt(123, 0)).toBe(0);
    expect(craneOffsetAt(123, -5)).toBe(0);
  });
});

describe('sweepPeriodMs — height-ramped difficulty', () => {
  it('starts slow at the ground floor', () => {
    expect(sweepPeriodMs(0)).toBe(SWEEP_PERIOD_START_MS);
  });

  it('gets faster (shorter period) as the tower grows', () => {
    expect(sweepPeriodMs(5)).toBeLessThan(sweepPeriodMs(0));
    expect(sweepPeriodMs(20)).toBeLessThan(sweepPeriodMs(5));
  });

  it('never drops below the fast floor, however tall', () => {
    expect(sweepPeriodMs(1000)).toBe(SWEEP_PERIOD_FLOOR_MS);
    expect(sweepPeriodMs(50)).toBeGreaterThanOrEqual(SWEEP_PERIOD_FLOOR_MS);
  });

  it('clamps negative/garbage floor counts to the slow start', () => {
    expect(sweepPeriodMs(-3)).toBe(SWEEP_PERIOD_START_MS);
  });

  // Founder ask 2026-06-20: "placing is moving too fast — slower, stay around
  // green." Lock the relaxed pace so a future tweak can't silently speed it back
  // up: the ground sweep is a leisurely ≥3s and even the tallest tower never
  // sweeps faster than a comfortable ≥2s.
  it('keeps the sweep comfortably slow at every height', () => {
    expect(SWEEP_PERIOD_START_MS).toBeGreaterThanOrEqual(3000);
    expect(SWEEP_PERIOD_FLOOR_MS).toBeGreaterThanOrEqual(2000);
    expect(sweepPeriodMs(9999)).toBeGreaterThanOrEqual(2000);
  });

  it('is monotonically non-increasing in height', () => {
    let prev = sweepPeriodMs(0);
    for (let f = 1; f <= 40; f++) {
      const cur = sweepPeriodMs(f);
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });
});

describe('effectiveSweepPeriodMs — crane never crawls, even fully upgraded', () => {
  it('equals the base period with no modifiers', () => {
    expect(effectiveSweepPeriodMs(0)).toBe(sweepPeriodMs(0));
    expect(effectiveSweepPeriodMs(10)).toBe(sweepPeriodMs(10));
  });

  it('caps the SLOWEST sweep at the ground-floor default however many slow-downs stack', () => {
    // Steady Cable maxed (0.6) + a tailwind-style sweep mult (1.25) would blow the
    // ground period out to ~7 s. The ceiling holds it to the normal ground pace.
    const superSlow = effectiveSweepPeriodMs(0, 0.5, 1.4);
    expect(superSlow).toBe(SWEEP_PERIOD_CEILING_MS);
    expect(superSlow).toBeLessThanOrEqual(SWEEP_PERIOD_START_MS);
  });

  it('lets crane-slowing upgrades pull the fast high-floor pace back toward comfortable', () => {
    const upgraded = effectiveSweepPeriodMs(60, 0.6, 1); // slow the fast top-floor sweep
    expect(upgraded).toBeGreaterThan(sweepPeriodMs(60)); // slower than un-upgraded
    expect(upgraded).toBeLessThanOrEqual(SWEEP_PERIOD_CEILING_MS); // but never a crawl
  });

  it('still respects the fast floor for a very tall tower', () => {
    expect(effectiveSweepPeriodMs(9999, 1, 1)).toBe(SWEEP_PERIOD_FLOOR_MS);
    expect(effectiveSweepPeriodMs(9999, 1, 1)).toBeGreaterThanOrEqual(SWEEP_PERIOD_FLOOR_MS);
  });

  it('guards against garbage multipliers (0 / negative / NaN → treated as 1×)', () => {
    expect(effectiveSweepPeriodMs(5, 0, 1)).toBe(effectiveSweepPeriodMs(5, 1, 1));
    expect(effectiveSweepPeriodMs(5, -2, 1)).toBe(effectiveSweepPeriodMs(5, 1, 1));
    expect(effectiveSweepPeriodMs(5, NaN, NaN)).toBe(effectiveSweepPeriodMs(5, 1, 1));
  });
});
