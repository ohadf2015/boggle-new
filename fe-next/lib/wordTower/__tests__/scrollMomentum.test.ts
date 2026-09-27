import { describe, it, expect } from 'vitest';
import {
  clampFlickVelocity,
  stepMomentum,
  WHEEL_SCALE,
  MIN_FLICK_VELOCITY,
  MAX_FLICK_VELOCITY,
} from '../scrollMomentum';

describe('clampFlickVelocity', () => {
  it('caps the magnitude in both directions so a wild flick can never rocket the camera', () => {
    expect(clampFlickVelocity(99)).toBe(MAX_FLICK_VELOCITY);
    expect(clampFlickVelocity(-99)).toBe(-MAX_FLICK_VELOCITY);
    expect(clampFlickVelocity(0.5)).toBe(0.5);
  });
});

describe('stepMomentum', () => {
  const LO = -1000; // most-negative pan (base revealed)
  const HI = 0; // build line

  it('moves the offset in the direction of the velocity', () => {
    const up = stepMomentum(-100, 1, 16, LO, HI); // +v → toward 0
    expect(up.y).toBeGreaterThan(-100);
    const down = stepMomentum(-100, -1, 16, LO, HI); // -v → toward base
    expect(down.y).toBeLessThan(-100);
  });

  it('decays the velocity every step (friction) so a fling glides to a rest', () => {
    const a = stepMomentum(-500, -2, 16, LO, HI);
    expect(Math.abs(a.v)).toBeLessThan(2);
    expect(a.done).toBe(false);
  });

  it('reports done once the velocity falls below the cutoff', () => {
    const r = stepMomentum(-500, MIN_FLICK_VELOCITY / 2, 16, LO, HI);
    expect(r.done).toBe(true);
    expect(r.v).toBe(0);
  });

  it('clamps at a bound and stops dead (no overscroll bounce past the base)', () => {
    const hitBase = stepMomentum(-995, -5, 16, LO, HI);
    expect(hitBase.y).toBe(LO);
    expect(hitBase.done).toBe(true);
    expect(hitBase.v).toBe(0);

    const hitTop = stepMomentum(-3, 5, 16, LO, HI);
    expect(hitTop.y).toBe(HI);
    expect(hitTop.done).toBe(true);
  });
});

describe('WHEEL_SCALE', () => {
  it('amplifies wheel delta so scrolling a tall tower is fast, not a slog', () => {
    expect(WHEEL_SCALE).toBeGreaterThan(1);
  });
});
