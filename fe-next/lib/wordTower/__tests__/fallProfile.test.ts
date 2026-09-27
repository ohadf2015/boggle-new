import { describe, it, expect } from 'vitest';
import {
  fallEase,
  fallDurationMs,
  settleOvershoot,
  impactParams,
  FALL_MIN_MS,
  FALL_MAX_MS,
} from '../fallProfile';

describe('fallEase — gravity (accelerating) curve', () => {
  it('runs 0→1 across the drop', () => {
    expect(fallEase(0)).toBe(0);
    expect(fallEase(1)).toBe(1);
  });

  it('starts slow and accelerates (gravity, not linear)', () => {
    // First half covers less ground than the second half.
    const firstHalf = fallEase(0.5) - fallEase(0);
    const secondHalf = fallEase(1) - fallEase(0.5);
    expect(secondHalf).toBeGreaterThan(firstHalf);
  });

  it('is monotonic and clamps out-of-range progress', () => {
    expect(fallEase(-1)).toBe(0);
    expect(fallEase(2)).toBe(1);
    let prev = -1;
    for (let k = 0; k <= 1.0001; k += 0.1) {
      const v = fallEase(k);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('fallDurationMs — deeper falls take (a little) longer', () => {
  it('grows with fall depth', () => {
    expect(fallDurationMs(8)).toBeGreaterThan(fallDurationMs(1));
  });
  it('stays within sane animation bounds', () => {
    expect(fallDurationMs(0)).toBeGreaterThanOrEqual(FALL_MIN_MS);
    expect(fallDurationMs(1000)).toBe(FALL_MAX_MS);
    expect(fallDurationMs(-5)).toBeGreaterThanOrEqual(FALL_MIN_MS);
  });
});

describe('settleOvershoot — spring settle after impact', () => {
  it('is a small positive bounce that grows with impact depth', () => {
    expect(settleOvershoot(1)).toBeGreaterThan(0);
    expect(settleOvershoot(10)).toBeGreaterThan(settleOvershoot(1));
  });
  it('is capped so tall drops do not fling the tile off', () => {
    expect(settleOvershoot(1000)).toBeLessThanOrEqual(0.4);
  });
});

describe('impactParams — depth-scaled squash / shake / debris', () => {
  it('a ground-level tap is gentle', () => {
    const p = impactParams(0);
    expect(p.squash).toBeGreaterThan(0);
    expect(p.shakePx).toBeGreaterThanOrEqual(0);
    expect(p.debris).toBeGreaterThanOrEqual(0);
  });

  it('a deep drop hits harder on every channel', () => {
    const shallow = impactParams(1);
    const deep = impactParams(12);
    expect(deep.squash).toBeGreaterThan(shallow.squash);
    expect(deep.shakePx).toBeGreaterThan(shallow.shakePx);
    expect(deep.debris).toBeGreaterThan(shallow.debris);
  });

  it('clamps every channel so an extreme drop never breaks the scene', () => {
    const p = impactParams(9999);
    expect(p.squash).toBeLessThanOrEqual(0.4);
    expect(p.shakePx).toBeLessThanOrEqual(12);
    expect(p.debris).toBeLessThanOrEqual(20);
    expect(Number.isInteger(p.debris)).toBe(true);
  });
});
