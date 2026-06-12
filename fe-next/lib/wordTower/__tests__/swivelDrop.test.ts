import { describe, it, expect } from 'vitest';
import {
  clamp01,
  swivelSettle,
  swivelDescent,
  swivelStartDeg,
  swivelBrickFrame,
  swivelDurationMs,
  SWIVEL_BASE_DEG,
  SWIVEL_MAX_DEG,
  SWIVEL_ARC_CAP_PX,
  SWIVEL_MIN_MS,
  SWIVEL_MAX_MS,
} from '../swivelDrop';

describe('clamp01', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(3)).toBe(1);
  });
});

describe('swivelSettle — damped tip-through to upright', () => {
  it('starts at full tilt and lands exactly upright', () => {
    expect(swivelSettle(0)).toBeCloseTo(1, 6);
    expect(swivelSettle(1)).toBeCloseTo(0, 6);
  });

  it('overshoots once (a single sign change) — the pendulum swings past upright', () => {
    let sign = Math.sign(swivelSettle(0.01));
    let flips = 0;
    for (let k = 0.02; k <= 1; k += 0.01) {
      const s = Math.sign(swivelSettle(k));
      if (s !== 0 && s !== sign) {
        flips += 1;
        sign = s;
      }
    }
    expect(flips).toBe(1);
  });

  it('keeps the overshoot bounded well under the start amplitude', () => {
    let minVal = 0;
    for (let k = 0; k <= 1; k += 0.01) minVal = Math.min(minVal, swivelSettle(k));
    expect(minVal).toBeLessThan(0); // it DOES overshoot
    expect(minVal).toBeGreaterThan(-0.6); // but not violently
  });

  it('clamps out-of-range k', () => {
    expect(swivelSettle(-1)).toBeCloseTo(1, 6);
    expect(swivelSettle(2)).toBeCloseTo(0, 6);
  });
});

describe('swivelDescent — group lowers into place (ease-out)', () => {
  it('goes 0 → 1', () => {
    expect(swivelDescent(0)).toBeCloseTo(0, 6);
    expect(swivelDescent(1)).toBeCloseTo(1, 6);
  });

  it('is monotonically increasing and decelerating', () => {
    const first = swivelDescent(0.5) - swivelDescent(0);
    const second = swivelDescent(1) - swivelDescent(0.5);
    expect(first).toBeGreaterThan(second); // most distance covered early
    let prev = -1;
    for (let k = 0; k <= 1; k += 0.05) {
      const v = swivelDescent(k);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('swivelStartDeg — clean drops tip gently, sloppy ones tip harder', () => {
  it('a clean drop (lean 0) tips the base amount in the default (+) direction', () => {
    const deg = swivelStartDeg(0, 120); // tall enough not to hit the arc cap
    expect(deg).toBeGreaterThan(0);
    expect(deg).toBeCloseTo(SWIVEL_BASE_DEG, 5);
  });

  it('a sloppy drop tips harder and follows the lean direction', () => {
    const right = swivelStartDeg(10, 120);
    const left = swivelStartDeg(-10, 120);
    expect(right).toBeGreaterThan(SWIVEL_BASE_DEG);
    expect(left).toBeLessThan(0);
    expect(Math.abs(left)).toBeCloseTo(right, 5); // symmetric in magnitude
  });

  it('never exceeds the max tilt however sloppy', () => {
    expect(swivelStartDeg(999, 120)).toBeLessThanOrEqual(SWIVEL_MAX_DEG + 1e-6);
    expect(swivelStartDeg(-999, 120)).toBeGreaterThanOrEqual(-(SWIVEL_MAX_DEG + 1e-6));
  });

  it('caps the angle for TALL runs so the top brick arc stays bounded', () => {
    const tall = Math.abs(swivelStartDeg(0, 600)); // top brick far from pivot
    const short = Math.abs(swivelStartDeg(0, 80));
    expect(tall).toBeLessThan(short); // tall run forced to a gentler tip
    // Top-brick horizontal swing = topDy*sin(theta) must respect the arc cap.
    const arc = 600 * Math.sin((tall * Math.PI) / 180);
    expect(arc).toBeLessThanOrEqual(SWIVEL_ARC_CAP_PX + 0.5);
  });
});

describe('swivelBrickFrame — rigid rotation about the base pivot', () => {
  const pivotX = 200;
  const pivotY = 500; // bottom (larger y) — run rises to smaller y

  it('lands every brick exactly on its rest slot, upright, at k=1', () => {
    for (const rest of [{ x: 200, y: 500 }, { x: 200, y: 440 }, { x: 200, y: 380 }]) {
      const f = swivelBrickFrame(rest, pivotX, pivotY, 14, 30, 1);
      expect(f.x).toBeCloseTo(rest.x, 4);
      expect(f.y).toBeCloseTo(rest.y, 4);
      expect(f.angleDeg).toBeCloseTo(0, 4);
    }
  });

  it('at k=0 the group is tilted by the start angle and lifted by the descent', () => {
    const rest = { x: 200, y: 380 }; // a brick high up the run
    const f = swivelBrickFrame(rest, pivotX, pivotY, 14, 30, 0);
    expect(f.angleDeg).toBeCloseTo(14, 4);
    // Lifted: a brick above the pivot starts higher than its rest (smaller y).
    expect(f.y).toBeLessThan(rest.y);
    // Tilted right (+deg) swings a brick ABOVE the pivot toward +x.
    expect(f.x).toBeGreaterThan(rest.x);
  });

  it('keeps the run rigid — all bricks share one rotation (collinear about pivot)', () => {
    const k = 0.2;
    const a = swivelBrickFrame({ x: 200, y: 440 }, pivotX, pivotY, 16, 30, k);
    const b = swivelBrickFrame({ x: 200, y: 380 }, pivotX, pivotY, 16, 30, k);
    // Same angle for every brick (rigid body).
    expect(a.angleDeg).toBeCloseTo(b.angleDeg, 6);
    // Both lie on the same ray from the pivot (rigid rotation preserves the line).
    const pyLift = pivotY - 30 * (1 - swivelDescent(k));
    const slopeA = (a.x - pivotX) / (a.y - pyLift);
    const slopeB = (b.x - pivotX) / (b.y - pyLift);
    expect(slopeA).toBeCloseTo(slopeB, 6);
  });
});

describe('swivelDurationMs — slower, weightier; longer words settle a touch longer', () => {
  it('is far slower than the old 300ms snap', () => {
    expect(swivelDurationMs(3)).toBeGreaterThan(450);
  });

  it('grows with run length but clamps', () => {
    expect(swivelDurationMs(7)).toBeGreaterThan(swivelDurationMs(3));
    expect(swivelDurationMs(2)).toBeGreaterThanOrEqual(SWIVEL_MIN_MS);
    expect(swivelDurationMs(99)).toBe(SWIVEL_MAX_MS);
  });
});
