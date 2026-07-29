import { describe, it, expect } from 'vitest';
import { COMBO_LEVEL_COUNT, comboLevelSrc, pickVariant, SOUND_VARIATIONS, wordLengthSrc } from '../soundVariations';

describe('comboLevelSrc', () => {
  it('returns combo-level-1 for level 1', () => {
    expect(comboLevelSrc(1)).toBe('/sounds/combo-levels/combo-level-1.mp3');
  });

  it('returns max combo-level file for the configured count', () => {
    expect(comboLevelSrc(COMBO_LEVEL_COUNT)).toBe(`/sounds/combo-levels/combo-level-${COMBO_LEVEL_COUNT}.mp3`);
  });

  it('clamps levels above max to the max file (no infinite escalation files)', () => {
    expect(comboLevelSrc(COMBO_LEVEL_COUNT + 7)).toBe(`/sounds/combo-levels/combo-level-${COMBO_LEVEL_COUNT}.mp3`);
  });

  it('clamps levels at or below 0 to level 1', () => {
    expect(comboLevelSrc(0)).toBe('/sounds/combo-levels/combo-level-1.mp3');
    expect(comboLevelSrc(-3)).toBe('/sounds/combo-levels/combo-level-1.mp3');
  });
});

describe('wordLengthSrc', () => {
  it('maps lengths 3..7 to bespoke files', () => {
    expect(wordLengthSrc(3)).toBe('/sounds/word-length/word-length-3.mp3');
    expect(wordLengthSrc(5)).toBe('/sounds/word-length/word-length-5.mp3');
    expect(wordLengthSrc(7)).toBe('/sounds/word-length/word-length-7.mp3');
  });

  it('collapses lengths 8 and above to the long-word celebration file', () => {
    expect(wordLengthSrc(8)).toBe('/sounds/word-length/word-length-8plus.mp3');
    expect(wordLengthSrc(15)).toBe('/sounds/word-length/word-length-8plus.mp3');
  });

  it('clamps lengths under 3 up to the smallest bespoke file', () => {
    expect(wordLengthSrc(2)).toBe('/sounds/word-length/word-length-3.mp3');
    expect(wordLengthSrc(0)).toBe('/sounds/word-length/word-length-3.mp3');
  });
});

describe('pickVariant', () => {
  it('returns the base source when the key has no variants registered', () => {
    expect(pickVariant('nonExistentKey', '/sounds/x.mp3')).toBe('/sounds/x.mp3');
  });

  it('only returns a value from {base, ...variants} pool', () => {
    const base = '/sounds/tile-select.mp3';
    const allowed = new Set([base, ...SOUND_VARIATIONS.tileSelect]);
    for (let i = 0; i < 50; i += 1) {
      expect(allowed.has(pickVariant('tileSelect', base))).toBe(true);
    }
  });
});
