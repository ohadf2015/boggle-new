/**
 * Regression test for patches/custom-pixi-particles+8.16.0.patch
 *
 * Upstream bug: Color.hex used `r << 16 | g << 8 | b` without clamping. When a
 * channel drifted below 0 (behaviour overshoot, fade-out math), the bitwise
 * shift sign-extended to negative int32 (e.g. -1, -2). PixiJS v8 then threw
 * "Unable to convert color -1" from sprite.tint, looping per Ticker frame.
 *
 * Observed in prod: 113 of 176 $exception events on /he/blast (PostHog
 * 2026-04-27 sweep).
 *
 * Patch clamps each channel to [0,255] before OR-ing.
 */

import { describe, it, expect } from 'vitest';
// Internal lib path: util/Color has no public types; Vitest resolves the .js fine.
import Color from 'custom-pixi-particles/dist/lib/util/Color.js';

describe('custom-pixi-particles Color.hex (patched)', () => {
  it('white returns 0xffffff', () => {
    const c = new Color(255, 255, 255);
    expect(c.hex).toBe(0xffffff);
  });

  it('black returns 0x000000', () => {
    const c = new Color(0, 0, 0);
    expect(c.hex).toBe(0);
  });

  it('negative r is clamped to 0 (regression: was -65536)', () => {
    const c = new Color(0, 0, 0);
    c.r = -1;
    expect(c.hex).toBeGreaterThanOrEqual(0);
    expect(c.hex).toBe(0);
  });

  it('r=-1 g=255 b=255 returns 0xffff (regression: was -1)', () => {
    const c = new Color(255, 255, 255);
    c.r = -1;
    expect(c.hex).toBeGreaterThanOrEqual(0);
    expect(c.hex).toBe(0xffff);
  });

  it('r=-1 g=255 b=254 returns 0xfffe (regression: was -2)', () => {
    const c = new Color(255, 255, 254);
    c.r = -1;
    expect(c.hex).toBeGreaterThanOrEqual(0);
    expect(c.hex).toBe(0xfffe);
  });

  it('over-bright channels clamp to 255', () => {
    const c = new Color(0, 0, 0);
    c.r = 999;
    c.g = 999;
    c.b = 999;
    expect(c.hex).toBe(0xffffff);
  });

  it('fractional channels round/truncate without sign extension', () => {
    const c = new Color(127.7, 127.3, 127.5);
    expect(c.hex).toBeGreaterThanOrEqual(0);
    expect(c.hex).toBeLessThanOrEqual(0xffffff);
  });
});
