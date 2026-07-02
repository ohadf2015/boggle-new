import { describe, it, expect } from 'vitest';
import {
  pendulumTargetDeg,
  stepPendulum,
  REST_PENDULUM,
  PENDULUM_MAX_DEG,
  cableRecoilPx,
  type PendulumState,
} from '../cranePendulum';

describe('pendulumTargetDeg — the hanging load lags the trolley', () => {
  it('is zero when the trolley is still', () => {
    expect(pendulumTargetDeg(0)).toBe(0);
  });

  it('swings OPPOSITE to the trolley motion (load trails)', () => {
    expect(pendulumTargetDeg(1)).toBeLessThan(0); // moving right → load lags left
    expect(pendulumTargetDeg(-1)).toBeGreaterThan(0);
  });

  it('clamps to the max tilt for out-of-range velocities', () => {
    expect(pendulumTargetDeg(5)).toBeCloseTo(-PENDULUM_MAX_DEG, 6);
    expect(pendulumTargetDeg(-5)).toBeCloseTo(PENDULUM_MAX_DEG, 6);
  });
});

describe('stepPendulum — spring-damper integration (cosmetic, stable)', () => {
  it('a load at rest with a zero target never moves', () => {
    let s: PendulumState = { ...REST_PENDULUM };
    for (let i = 0; i < 50; i++) s = stepPendulum(s, 0, 16);
    expect(s.angleDeg).toBeCloseTo(0, 6);
    expect(s.velDegPerSec).toBeCloseTo(0, 6);
  });

  it('converges toward a constant target (does not run away)', () => {
    let s: PendulumState = { ...REST_PENDULUM };
    for (let i = 0; i < 400; i++) s = stepPendulum(s, 5, 16);
    expect(s.angleDeg).toBeCloseTo(5, 1);
    expect(s.velDegPerSec).toBeCloseTo(0, 1);
  });

  it('stays bounded under a constantly flipping target (no divergence)', () => {
    let s: PendulumState = { ...REST_PENDULUM };
    for (let i = 0; i < 2000; i++) {
      const target = i % 2 === 0 ? PENDULUM_MAX_DEG : -PENDULUM_MAX_DEG;
      s = stepPendulum(s, target, 16);
      expect(Math.abs(s.angleDeg)).toBeLessThan(PENDULUM_MAX_DEG * 3);
    }
  });

  it('clamps a huge frame delta so a stall cannot explode the spring', () => {
    const s = stepPendulum({ ...REST_PENDULUM }, PENDULUM_MAX_DEG, 100000);
    expect(Number.isFinite(s.angleDeg)).toBe(true);
    expect(Math.abs(s.angleDeg)).toBeLessThan(PENDULUM_MAX_DEG * 3);
  });
});

describe('cableRecoilPx — post-release whip', () => {
  it('is 0 at release and after settling', () => {
    expect(cableRecoilPx(0)).toBe(0);
    expect(cableRecoilPx(1)).toBeCloseTo(0, 5);
  });

  it('shortens the cable (negative) at its peak — the freed cable whips UP', () => {
    const peak = Math.min(...[0.1, 0.2, 0.3, 0.4].map(cableRecoilPx));
    expect(peak).toBeLessThan(0);
    expect(peak).toBeGreaterThanOrEqual(-8);
  });

  it('clamps outside the window', () => {
    expect(cableRecoilPx(-1)).toBe(0);
    expect(cableRecoilPx(2)).toBeCloseTo(0, 5);
  });
});
