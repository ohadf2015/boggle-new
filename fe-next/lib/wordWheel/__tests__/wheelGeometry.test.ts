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
    expect(computeWheelRadius(120, 136)).toBe(52); // (120-60)/2 = 30 → floored
    expect(computeWheelRadius(120, 136, 48)).toBe(48); // custom floor
  });

  it('scales down as the container shrinks (monotonic in width)', () => {
    const big = computeWheelRadius(288, 96);
    const small = computeWheelRadius(208, 96);
    expect(small).toBeLessThanOrEqual(big);
  });

  it('guards against 0 / negative / NaN widths (pre-measure render)', () => {
    expect(computeWheelRadius(0, 136)).toBe(52);
    expect(computeWheelRadius(-10, 136)).toBe(52);
    expect(computeWheelRadius(Number.NaN, 136)).toBe(52);
  });

  it('returns an integer (px transforms should not be sub-pixel)', () => {
    expect(Number.isInteger(computeWheelRadius(257, 136))).toBe(true);
  });
});
