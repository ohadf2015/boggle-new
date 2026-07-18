import { describe, it, expect } from 'vitest';
import { toppleCrashFx, CRASH_SHAKE_MAX_PX, CRASH_DEBRIS_MAX, CRASH_DARK_COLOR } from '../crashFx';

describe('toppleCrashFx — severity-scaled tower crash', () => {
  it('a single-floor wobble still produces a real crash beat', () => {
    const fx = toppleCrashFx(1);
    expect(fx.shakePx).toBeGreaterThan(0);
    expect(fx.debris).toBeGreaterThan(0);
    expect(fx.rubble).toBeGreaterThan(0);
    expect(fx.flashAlpha).toBeGreaterThan(0);
    expect(fx.durationS).toBeGreaterThan(0);
    expect(fx.biasX).toBe(1);
    expect(fx.darkColor).toBe(CRASH_DARK_COLOR);
  });

  it('losing more floors crashes harder on every channel', () => {
    const small = toppleCrashFx(1);
    const big = toppleCrashFx(5);
    expect(big.shakePx).toBeGreaterThan(small.shakePx);
    expect(big.debris).toBeGreaterThan(small.debris);
    expect(big.rubble).toBeGreaterThan(small.rubble);
    expect(big.flashAlpha).toBeGreaterThan(small.flashAlpha);
    expect(big.durationS).toBeGreaterThan(small.durationS);
  });

  it('treats a 0/negative floor count as a minimum one-floor crash (never a no-op)', () => {
    const z = toppleCrashFx(0);
    expect(z.shakePx).toEqual(toppleCrashFx(1).shakePx);
    expect(toppleCrashFx(-3).debris).toEqual(toppleCrashFx(1).debris);
    expect(toppleCrashFx(-3).rubble).toEqual(toppleCrashFx(1).rubble);
  });

  it('clamps an extreme collapse so the scene never breaks', () => {
    const fx = toppleCrashFx(9999);
    expect(fx.shakePx).toBeLessThanOrEqual(CRASH_SHAKE_MAX_PX);
    expect(fx.debris).toBeLessThanOrEqual(CRASH_DEBRIS_MAX);
    expect(fx.rubble).toBeLessThanOrEqual(36);
    expect(fx.flashAlpha).toBeLessThanOrEqual(0.6);
    expect(fx.durationS).toBeLessThanOrEqual(0.85);
    expect(Number.isInteger(fx.debris)).toBe(true);
    expect(Number.isInteger(fx.rubble)).toBe(true);
  });

  it('always shakes harder than a normal heavy LANDING (a crash must read as worse)', () => {
    // Heaviest clean landing shake is ~12px (fallProfile cap); a crash must exceed it.
    expect(toppleCrashFx(1).shakePx).toBeGreaterThan(12);
  });

  it('pulls the shake toward the lean direction', () => {
    expect(toppleCrashFx(1, -1).biasX).toBe(-1);
    expect(toppleCrashFx(1, 1).biasX).toBe(1);
    expect(toppleCrashFx(1, 0).biasX).toBe(1);
  });

  it('accepts a custom dark flash colour', () => {
    expect(toppleCrashFx(1, 1, 0x112233).darkColor).toBe(0x112233);
  });
});
