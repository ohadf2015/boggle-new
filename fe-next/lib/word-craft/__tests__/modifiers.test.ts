import { describe, expect, it } from 'vitest';
import {
  rollModifier,
  toScoreModifier,
  modifierCaptureSpread,
  WORDCRAFT_MODIFIERS,
  modifierLabelKey,
} from '../modifiers';

describe('WordCraft modifiers', () => {
  it('rollModifier is deterministic for a given seed', () => {
    expect(rollModifier(12345)).toBe(rollModifier(12345));
    expect(rollModifier(1)).toBe(rollModifier(1));
  });

  it('only ever returns a known modifier', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(WORDCRAFT_MODIFIERS).toContain(rollModifier(seed));
    }
  });

  it('produces a spread of modifiers across seeds (not stuck on one)', () => {
    const seen = new Set(Array.from({ length: 300 }, (_, s) => rollModifier(s)));
    // At least 3 distinct outcomes including the no-op baseline.
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(seen.has('none')).toBe(true);
  });

  it('none maps to an empty (no-op) score spec', () => {
    expect(toScoreModifier('none')).toEqual({});
  });

  it('bingo_bonanza raises the bingo bonus above the default 50', () => {
    const spec = toScoreModifier('bingo_bonanza');
    expect(spec.bingoBonus).toBeGreaterThan(50);
  });

  it('long_words grants a flat bonus to words at/above a length threshold', () => {
    const spec = toScoreModifier('long_words');
    expect(spec.longWordThreshold).toBeGreaterThanOrEqual(5);
    expect(spec.longWordBonus).toBeGreaterThan(0);
  });

  it('rich_letters multiplies high-value tiles', () => {
    const spec = toScoreModifier('rich_letters');
    expect(spec.richLetterThreshold).toBeGreaterThanOrEqual(4);
    expect(spec.richLetterMult).toBeGreaterThan(1);
  });

  it('land_grab is a registered modifier with no scoring change (it is a capture rule)', () => {
    expect(WORDCRAFT_MODIFIERS).toContain('land_grab');
    expect(toScoreModifier('land_grab')).toEqual({});
  });

  it('only land_grab enables capture spread', () => {
    expect(modifierCaptureSpread('land_grab')).toBe(true);
    expect(modifierCaptureSpread('none')).toBe(false);
    expect(modifierCaptureSpread('bingo_bonanza')).toBe(false);
    expect(modifierCaptureSpread('long_words')).toBe(false);
    expect(modifierCaptureSpread('rich_letters')).toBe(false);
  });

  it('exposes an i18n label key per modifier', () => {
    for (const m of WORDCRAFT_MODIFIERS) {
      expect(modifierLabelKey(m)).toMatch(/^wordcraft\.modifier\./);
    }
  });
});
