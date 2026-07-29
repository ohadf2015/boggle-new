import { describe, expect, it } from 'vitest';
import { scaleDistribution } from '../tileBag.scaler';
import * as en from '../tileBags/en';

const FULL_EN = en.distribution;

describe('scaleDistribution', () => {
  it('returns identical map when target equals full size', () => {
    const total = Object.values(FULL_EN).reduce((a, b) => a + b, 0);
    expect(scaleDistribution(FULL_EN, total)).toEqual(FULL_EN);
  });

  it('produces a distribution summing exactly to the target', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    const sum = Object.values(scaled).reduce((a, b) => a + b, 0);
    expect(sum).toBe(78);
  });

  it('preserves blank tile count', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    expect(scaled['_']).toBe(FULL_EN['_']);  // blanks unchanged
  });

  it('keeps every letter at >= 1 (floor)', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    for (const [letter, count] of Object.entries(scaled)) {
      if (letter === '_') continue;
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it('reduces high-frequency letters most aggressively', () => {
    const scaled = scaleDistribution(FULL_EN, 78);
    // E: 12 -> 9 (loses 3, largest reduction). Q: 1 -> 2 (gains 1, largest frac).
    expect(scaled['E']).toBeLessThan(FULL_EN['E']);
    expect(scaled['E']).toBe(9);
  });

  it('works for non-English distributions', () => {
    const HE_FAKE: Record<string, number> = { א: 10, ב: 5, ג: 3, _: 2 };
    const scaled = scaleDistribution(HE_FAKE, 12);
    const sum = Object.values(scaled).reduce((a, b) => a + b, 0);
    expect(sum).toBe(12);
    expect(scaled['_']).toBe(2);
  });
});
