import { describe, it, expect } from 'vitest';
import { wordVw } from '../UnpluggedStage';

/**
 * Back-row legibility bar: the projected word must never render under 10vw,
 * which at 1440px wide is 144px. The natural constant-width taper (120/length)
 * falls under that from 13 letters up, so the floor has to clamp it.
 */
describe('wordVw', () => {
  it('caps at 13vw so a short word does not overflow the stage', () => {
    expect(wordVw(4)).toBe(13);
    expect(wordVw(9)).toBe(13);
  });

  it('tapers between the cap and the floor for mid-length words', () => {
    expect(wordVw(10)).toBe(12);
    expect(wordVw(11)).toBeCloseTo(120 / 11, 5);
  });

  it('never drops below the 10vw back-row floor, however long the word', () => {
    for (const len of [12, 13, 16, 20, 40]) {
      expect(wordVw(len)).toBeGreaterThanOrEqual(10);
    }
  });

  it('falls back to the cap for an empty word rather than dividing by zero', () => {
    expect(wordVw(0)).toBe(13);
    expect(Number.isFinite(wordVw(0))).toBe(true);
  });
});
