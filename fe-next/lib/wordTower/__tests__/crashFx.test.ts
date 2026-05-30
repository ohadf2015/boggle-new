import { describe, it, expect } from 'vitest';
import { toppleCrashFx, CRASH_SHAKE_MAX_PX, CRASH_DEBRIS_MAX } from '../crashFx';

describe('toppleCrashFx — severity-scaled tower crash', () => {
  it('a single-floor wobble still produces a real crash beat', () => {
    const fx = toppleCrashFx(1);
    expect(fx.shakePx).toBeGreaterThan(0);
    expect(fx.debris).toBeGreaterThan(0);
    expect(fx.flashAlpha).toBeGreaterThan(0);
    expect(fx.durationS).toBeGreaterThan(0);
  });

  it('losing more floors crashes harder on every channel', () => {
    const small = toppleCrashFx(1);
    const big = toppleCrashFx(5);
    expect(big.shakePx).toBeGreaterThan(small.shakePx);
    expect(big.debris).toBeGreaterThan(small.debris);
    expect(big.flashAlpha).toBeGreaterThan(small.flashAlpha);
    expect(big.durationS).toBeGreaterThan(small.durationS);
  });

  it('treats a 0/negative floor count as a minimum one-floor crash (never a no-op)', () => {
    const z = toppleCrashFx(0);
    expect(z.shakePx).toEqual(toppleCrashFx(1).shakePx);
    expect(toppleCrashFx(-3).debris).toEqual(toppleCrashFx(1).debris);
  });

  it('clamps an extreme collapse so the scene never breaks', () => {
    const fx = toppleCrashFx(9999);
    expect(fx.shakePx).toBeLessThanOrEqual(CRASH_SHAKE_MAX_PX);
    expect(fx.debris).toBeLessThanOrEqual(CRASH_DEBRIS_MAX);
    expect(fx.flashAlpha).toBeLessThanOrEqual(0.6);
    expect(fx.durationS).toBeLessThanOrEqual(0.85);
    expect(Number.isInteger(fx.debris)).toBe(true);
  });

  it('always shakes harder than a normal heavy LANDING (a crash must read as worse)', () => {
    // Heaviest clean landing shake is ~12px (fallProfile cap); a crash must exceed it.
    expect(toppleCrashFx(1).shakePx).toBeGreaterThan(12);
  });
});
