/**
 * themedWords Tests
 *
 * Tests for world-themed word pools used to seed adventure mode grids.
 */

import {
  WORLD_THEMED_WORDS,
  getThemedWords,
  isThemedWord,
  getThemeBonusMultiplier,
  getThemeDisplayKey,
} from '../themedWords';

describe('WORLD_THEMED_WORDS', () => {
  it('should have entries for all 10 worlds', () => {
    for (let world = 1; world <= 10; world++) {
      expect(WORLD_THEMED_WORDS[world]).toBeDefined();
    }
  });

  it('should have at least 35 words per world', () => {
    for (let world = 1; world <= 10; world++) {
      expect(WORLD_THEMED_WORDS[world].words.length).toBeGreaterThanOrEqual(35);
    }
  });

  it('should have all words in ALL CAPS', () => {
    for (let world = 1; world <= 10; world++) {
      for (const word of WORLD_THEMED_WORDS[world].words) {
        expect(word).toBe(word.toUpperCase());
      }
    }
  });

  it('should have words between 3 and 8 letters each', () => {
    for (let world = 1; world <= 10; world++) {
      for (const word of WORLD_THEMED_WORDS[world].words) {
        expect(word.length).toBeGreaterThanOrEqual(3);
        expect(word.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('should have a theme string for each world', () => {
    for (let world = 1; world <= 10; world++) {
      expect(typeof WORLD_THEMED_WORDS[world].theme).toBe('string');
      expect(WORLD_THEMED_WORDS[world].theme.length).toBeGreaterThan(0);
    }
  });

  it('should have a themeKey in the expected format for each world', () => {
    for (let world = 1; world <= 10; world++) {
      expect(WORLD_THEMED_WORDS[world].themeKey).toBe(`adventure.world.${world}.theme`);
    }
  });

  it('should have a bonusMultiplier >= 1 for each world', () => {
    for (let world = 1; world <= 10; world++) {
      expect(WORLD_THEMED_WORDS[world].bonusMultiplier).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('getThemedWords', () => {
  it('should return words array for a valid world', () => {
    // GIVEN
    const world = 1;

    // WHEN
    const words = getThemedWords(world);

    // THEN
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThanOrEqual(35);
  });

  it('should return empty array for invalid world', () => {
    // GIVEN / WHEN / THEN
    expect(getThemedWords(0)).toEqual([]);
    expect(getThemedWords(11)).toEqual([]);
    expect(getThemedWords(-1)).toEqual([]);
  });
});

describe('isThemedWord', () => {
  it('should return true for a word in the world pool (case-insensitive)', () => {
    // GIVEN
    const world = 1;
    const wordUpper = 'BLOOM';
    const wordLower = 'bloom';

    // WHEN / THEN
    expect(isThemedWord(world, wordUpper)).toBe(true);
    expect(isThemedWord(world, wordLower)).toBe(true);
  });

  it('should return false for a word not in the world pool', () => {
    // GIVEN
    const world = 1;
    const word = 'XYZZY';

    // WHEN / THEN
    expect(isThemedWord(world, word)).toBe(false);
  });

  it('should return false for an invalid world', () => {
    expect(isThemedWord(0, 'BLOOM')).toBe(false);
    expect(isThemedWord(11, 'BLOOM')).toBe(false);
  });
});

describe('getThemeBonusMultiplier', () => {
  it('should return multiplier for a valid world', () => {
    // GIVEN / WHEN
    const multiplier = getThemeBonusMultiplier(1);

    // THEN
    expect(multiplier).toBeGreaterThanOrEqual(1);
    expect(typeof multiplier).toBe('number');
  });

  it('should return 1 (no bonus) for an invalid world', () => {
    expect(getThemeBonusMultiplier(0)).toBe(1);
    expect(getThemeBonusMultiplier(99)).toBe(1);
  });
});

describe('getThemeDisplayKey', () => {
  it('should return the translation key for a valid world', () => {
    // GIVEN / WHEN
    const key = getThemeDisplayKey(3);

    // THEN
    expect(key).toBe('adventure.world.3.theme');
  });

  it('should return empty string for an invalid world', () => {
    expect(getThemeDisplayKey(0)).toBe('');
    expect(getThemeDisplayKey(11)).toBe('');
  });
});
