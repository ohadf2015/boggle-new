import { describe, it, expect } from 'vitest';
import { tileVariation } from './tileVariation';

describe('tileVariation', () => {
  it('is deterministic for a given position', () => {
    expect(tileVariation(7)).toEqual(tileVariation(7));
  });

  it('keeps the tonal shift small and centred', () => {
    for (let pos = 0; pos < 200; pos++) {
      const { tone } = tileVariation(pos);
      expect(tone).toBeGreaterThanOrEqual(-0.06);
      expect(tone).toBeLessThanOrEqual(0.06);
    }
  });

  it('keeps the highlight multiplier within a gentle band', () => {
    for (let pos = 0; pos < 200; pos++) {
      const { highlight } = tileVariation(pos);
      expect(highlight).toBeGreaterThanOrEqual(0.85);
      expect(highlight).toBeLessThanOrEqual(1.15);
    }
  });

  it('keeps the horizontal jitter sub-pixel-ish', () => {
    for (let pos = 0; pos < 200; pos++) {
      const { jitterX } = tileVariation(pos);
      expect(Math.abs(jitterX)).toBeLessThanOrEqual(1);
    }
  });

  it('actually varies across positions (not a constant)', () => {
    const tones = new Set(Array.from({ length: 20 }, (_, p) => tileVariation(p).tone.toFixed(4)));
    expect(tones.size).toBeGreaterThan(10);
  });
});
