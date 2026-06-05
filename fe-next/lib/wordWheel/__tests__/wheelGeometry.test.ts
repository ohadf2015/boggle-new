import { describe, it, expect } from 'vitest';
import { computeWheelRadius, WHEEL_LETTER_ALLOWANCE_PX } from '../wheelGeometry';

describe('computeWheelRadius', () => {
  it('keeps outer letters inside the rim: radius ≈ (width − one letter)/2', () => {
    // GIVEN a typical mobile wheel width
    // WHEN computing the radius (well below the max cap)
    // THEN it reserves one letter diameter so letters stay inside the wheel
    expect(computeWheelRadius(256, 136)).toBe(Math.round((256 - WHEEL_LETTER_ALLOWANCE_PX) / 2));
  });

  it('clamps to the provided max radius on large desktop canvases', () => {
    expect(computeWheelRadius(600, 140)).toBe(140);
    expect(computeWheelRadius(600, 96)).toBe(96);
  });

  it('never drops below the floor so the wheel stays usable when tiny', () => {
    expect(computeWheelRadius(120, 136)).toBe(76); // (120-60)/2 = 30 → floored
    expect(computeWheelRadius(120, 136, 48)).toBe(48); // custom floor
  });

  it('default floor clears the center letter so petals never overlap on a cramped wheel', () => {
    // REGRESSION: on height-constrained viewports the container shrinks, so
    // `(width − allowance)/2` collapses toward the floor. The mobile center
    // letter is 80px (radius 40) and outer letters 52px (radius 26), so the
    // orbit must be ≥ 66px or the petals overlap the center (and, at R < 52,
    // each other). The default floor therefore has to clear that threshold
    // with a small gap — a 52px floor let the flower collapse into itself.
    const CENTER_R = 80 / 2;
    const OUTER_R = 52 / 2;
    const flooredOnTinyBox = computeWheelRadius(120, 136);
    expect(flooredOnTinyBox).toBeGreaterThanOrEqual(CENTER_R + OUTER_R); // ≥ 66, no center overlap
    expect(flooredOnTinyBox).toBeGreaterThanOrEqual(52); // ≥ outer diameter, no petal-petal overlap
  });

  it('scales down as the container shrinks (monotonic in width)', () => {
    const big = computeWheelRadius(288, 96);
    const small = computeWheelRadius(208, 96);
    expect(small).toBeLessThanOrEqual(big);
  });

  it('guards against 0 / negative / NaN widths (pre-measure render)', () => {
    expect(computeWheelRadius(0, 136)).toBe(76);
    expect(computeWheelRadius(-10, 136)).toBe(76);
    expect(computeWheelRadius(Number.NaN, 136)).toBe(76);
  });

  it('returns an integer (px transforms should not be sub-pixel)', () => {
    expect(Number.isInteger(computeWheelRadius(257, 136))).toBe(true);
  });

  it('accepts a smaller letter allowance so a height-capped short wheel keeps letters inside', () => {
    // GIVEN a short/landscape wheel where the box is shrunk to ~140px and the
    // letters are also shrunk (short: variant → 48px outer letters)
    // WHEN computing the radius with a reduced allowance matching the small letters
    // THEN the orbit is larger than it would be with the default 60px allowance,
    //      because less rim space is reserved for the (now smaller) letters.
    const tightAllowance = computeWheelRadius(140, 88, 40, 44);
    const defaultAllowance = computeWheelRadius(140, 88, 40);
    expect(tightAllowance).toBe(Math.round((140 - 44) / 2)); // 48
    expect(defaultAllowance).toBe(Math.round((140 - WHEEL_LETTER_ALLOWANCE_PX) / 2)); // 40
    expect(tightAllowance).toBeGreaterThan(defaultAllowance);
  });

  it('still clamps to the short min/max bounds with a custom allowance', () => {
    // Tiny box → floored to the (lower) short minRadius, not the default 52.
    expect(computeWheelRadius(60, 88, 40, 44)).toBe(40);
    // Large box → capped to the (lower) short maxRadius.
    expect(computeWheelRadius(400, 88, 40, 44)).toBe(88);
  });
});
