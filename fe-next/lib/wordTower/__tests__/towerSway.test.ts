import { describe, it, expect } from 'vitest';
import {
  swayInstability,
  swayAmplitudeDeg,
  swayAngleAt,
  swayNormalizedOffset,
  effectiveDropError,
  SWAY_MAX_DEG,
  SWAY_START_INSTABILITY,
} from '../towerSway';
import { evaluatePlacement, alignmentBand } from '../cranePlacement';

describe('swayInstability — how shaky the tower is, 0..1', () => {
  it('is zero with a clean record (no sway in normal play)', () => {
    expect(swayInstability(0, 0)).toBe(0);
  });

  it('climbs with the bad-drop streak', () => {
    expect(swayInstability(1, 0)).toBeGreaterThan(swayInstability(0, 0));
    expect(swayInstability(2, 0)).toBeGreaterThan(swayInstability(1, 0));
  });

  it('also responds to a steep visible lean', () => {
    expect(swayInstability(0, 4)).toBeGreaterThan(swayInstability(0, 1));
  });

  it('saturates at 1', () => {
    expect(swayInstability(99, 99)).toBe(1);
  });
});

describe('swayAmplitudeDeg — gate + ramp', () => {
  it('is exactly zero below the start threshold (stable tower does NOT sway)', () => {
    expect(swayAmplitudeDeg(0)).toBe(0);
    expect(swayAmplitudeDeg(SWAY_START_INSTABILITY - 0.01)).toBe(0);
  });

  it('grows once unstable, never past the max', () => {
    expect(swayAmplitudeDeg(SWAY_START_INSTABILITY + 0.1)).toBeGreaterThan(0);
    expect(swayAmplitudeDeg(1)).toBeCloseTo(SWAY_MAX_DEG, 5);
    expect(swayAmplitudeDeg(1)).toBeLessThanOrEqual(SWAY_MAX_DEG);
  });
});

describe('swayAngleAt — continuous oscillation', () => {
  it('holds at zero when the tower is stable', () => {
    for (let t = 0; t < 3000; t += 250) expect(swayAngleAt(t, 0)).toBe(0);
  });

  it('oscillates through both signs when unstable', () => {
    let sawPos = false;
    let sawNeg = false;
    for (let t = 0; t < 4000; t += 50) {
      const a = swayAngleAt(t, 1);
      if (a > 0.1) sawPos = true;
      if (a < -0.1) sawNeg = true;
    }
    expect(sawPos && sawNeg).toBe(true);
  });

  it('stays within the amplitude envelope', () => {
    const amp = swayAmplitudeDeg(1);
    for (let t = 0; t < 4000; t += 37) {
      expect(Math.abs(swayAngleAt(t, 1))).toBeLessThanOrEqual(amp + 1e-6);
    }
  });
});

describe('swayNormalizedOffset — angle → crane-space horizontal shift', () => {
  it('is zero at zero angle', () => {
    expect(swayNormalizedOffset(0)).toBe(0);
  });

  it('maps a positive lean to a positive (same-direction) offset, bounded', () => {
    const o = swayNormalizedOffset(SWAY_MAX_DEG);
    expect(o).toBeGreaterThan(0);
    expect(o).toBeLessThan(0.5); // never moves the target more than half the rack
  });
});

describe('effectiveDropError — sway couples into the verdict', () => {
  it('equals the raw crane error when there is no sway (reduced-motion / stable)', () => {
    expect(effectiveDropError(0.05, 0)).toBeCloseTo(0.05, 6);
    expect(effectiveDropError(-0.3, 0)).toBeCloseTo(0.3, 6);
  });

  it('a swaying top shifts the true landing point — a dead-centre tap is no longer perfect', () => {
    const swayOff = swayNormalizedOffset(SWAY_MAX_DEG);
    const err = effectiveDropError(0, swayOff); // player aimed centre, top swung away
    expect(err).toBeGreaterThan(0);
  });

  it('is clamped to [0,1]', () => {
    expect(effectiveDropError(1, -1)).toBeLessThanOrEqual(1);
    expect(effectiveDropError(0, 0)).toBeGreaterThanOrEqual(0);
  });

  it('FAIR-HARD: compensating for the sway (matching the moving top) still lands perfect', () => {
    const swayOff = swayNormalizedOffset(SWAY_MAX_DEG);
    const err = effectiveDropError(swayOff, swayOff); // player tracked the top
    expect(alignmentBand(err)).toBe('perfect');
    expect(evaluatePlacement(err, 0).quality).toBe('perfect');
  });

  it('REACHABILITY: under max sway a centre tap can still register a topple-class miss', () => {
    // Worst case the player fights the sway instead of tracking it.
    const swayOff = swayNormalizedOffset(SWAY_MAX_DEG);
    const err = effectiveDropError(-1, swayOff);
    expect(err).toBeGreaterThan(0.6); // > SLOPPY_MAX => miss band stays reachable
  });
});
