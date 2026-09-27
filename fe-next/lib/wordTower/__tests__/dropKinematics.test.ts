/**
 * Word Tower — momentum drop kinematics (TDD).
 *
 * Tower Bloxx skill: a released block inherits the trolley's horizontal
 * velocity and drifts during the fall. These tests pin the fairness contract:
 * zero velocity must reproduce legacy behaviour EXACTLY, drift is hard-capped,
 * and the drift animation curve is monotonic so the visual always lands on
 * the verdict offset.
 */
import { describe, it, expect } from 'vitest';
import {
  landingOffset,
  driftFracAt,
  smoothVelocity,
  CARRY_FACTOR,
  MAX_DRIFT,
  FALL_MS,
} from '../dropKinematics';
import { alignmentBand, PERFECT_MAX, GOOD_MAX } from '../cranePlacement';

describe('landingOffset (momentum carry)', () => {
  it('zero velocity reproduces legacy behaviour exactly', () => {
    expect(landingOffset(0.3, 0)).toBe(0.3);
    expect(landingOffset(-0.5, 0)).toBe(-0.5);
    expect(landingOffset(0, 0)).toBe(0);
  });

  it('carries in the direction of travel', () => {
    expect(landingOffset(0, 0.001)).toBeGreaterThan(0);
    expect(landingOffset(0, -0.001)).toBeLessThan(0);
  });

  it('drift is clamped to MAX_DRIFT', () => {
    expect(landingOffset(0, 10)).toBeLessThanOrEqual(MAX_DRIFT);
    expect(landingOffset(0, -10)).toBeGreaterThanOrEqual(-MAX_DRIFT);
  });

  it('drift equals vel*fall*carry inside the clamp', () => {
    const v = 0.0004;
    expect(landingOffset(0.1, v)).toBeCloseTo(0.1 + v * FALL_MS * CARRY_FACTOR, 10);
  });

  it('stays within release ± MAX_DRIFT for any velocity', () => {
    expect(Math.abs(landingOffset(1, 99))).toBeLessThanOrEqual(1 + MAX_DRIFT);
  });
});

describe('driftFracAt (visual drift curve)', () => {
  it('starts at 0, ends at 1, monotonic', () => {
    expect(driftFracAt(0)).toBe(0);
    expect(driftFracAt(1)).toBe(1);
    let prev = 0;
    for (let k = 0; k <= 1.001; k += 0.05) {
      const f = driftFracAt(k);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('clamps outside [0,1]', () => {
    expect(driftFracAt(-1)).toBe(0);
    expect(driftFracAt(2)).toBe(1);
  });
});

describe('momentum landing — crane verdict contract', () => {
  it('an early release with inward momentum lands CLOSER to centre (the skill)', () => {
    const projected = landingOffset(-0.4, 0.002); // trolley moving right, toward centre
    expect(Math.abs(projected)).toBeLessThan(0.4);
  });

  it('zero velocity preserves the legacy band verdicts at the documented edges', () => {
    expect(alignmentBand(Math.abs(landingOffset(PERFECT_MAX, 0)))).toBe('perfect');
    expect(alignmentBand(Math.abs(landingOffset(GOOD_MAX + 0.01, 0)))).toBe('sloppy');
  });

  it('overshooting momentum can turn a perfect release point into a worse band', () => {
    const projected = landingOffset(0.1, 0.004); // fast outward sweep
    expect(alignmentBand(Math.abs(projected))).not.toBe('perfect');
  });
});

describe('smoothVelocity (frame-noise EMA)', () => {
  it('moves toward the new sample without overshooting', () => {
    const s = smoothVelocity(0, 0.001);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(0.001);
  });

  it('is identity when samples agree', () => {
    expect(smoothVelocity(0.002, 0.002)).toBeCloseTo(0.002, 12);
  });
});
