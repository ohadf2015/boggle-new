import { describe, it, expect } from 'vitest';
import { dollyScaleFor, DOLLY_MAX_SCALE, DOLLY_FULL_ALT_M } from './dollyZoom';

describe('dollyScaleFor', () => {
  it('is exactly 1.0 at the ground', () => {
    expect(dollyScaleFor(0)).toBe(1);
  });

  it('treats negative / nullish altitude as the ground', () => {
    expect(dollyScaleFor(-50)).toBe(1);
    expect(dollyScaleFor(undefined as unknown as number)).toBe(1);
  });

  it('reaches the cap at the full-altitude point and holds above it', () => {
    expect(dollyScaleFor(DOLLY_FULL_ALT_M)).toBeCloseTo(DOLLY_MAX_SCALE, 5);
    expect(dollyScaleFor(DOLLY_FULL_ALT_M * 10)).toBeCloseTo(DOLLY_MAX_SCALE, 5);
  });

  it('is monotonic non-decreasing in altitude', () => {
    let prev = -Infinity;
    for (let a = 0; a <= DOLLY_FULL_ALT_M; a += 25) {
      const s = dollyScaleFor(a);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it('eases out — early climb gains more than the final stretch', () => {
    const firstQuarter = dollyScaleFor(DOLLY_FULL_ALT_M * 0.25) - dollyScaleFor(0);
    const lastQuarter = dollyScaleFor(DOLLY_FULL_ALT_M) - dollyScaleFor(DOLLY_FULL_ALT_M * 0.75);
    expect(firstQuarter).toBeGreaterThan(lastQuarter);
  });
});
