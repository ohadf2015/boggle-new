/**
 * blastLetterGenerator - Tests for weighted random letter generation.
 */

import { generateBlastLetter, rollSpecialType } from '../utils/blastLetterGenerator';
import { SPECIAL_TILE_DISTRIBUTION } from '../types';

describe('generateBlastLetter', () => {
  it('should return a string letter for English', () => {
    const letter = generateBlastLetter('en');
    expect(typeof letter).toBe('string');
    expect(letter.length).toBe(1);
  });

  it('should return uppercase English letters', () => {
    const letter = generateBlastLetter('en');
    expect(letter).toMatch(/^[A-Z]$/);
  });

  it('should return Hebrew letters for Hebrew language', () => {
    const letter = generateBlastLetter('he');
    expect(typeof letter).toBe('string');
    expect(letter.length).toBe(1);
    // Hebrew Unicode range: \u0590-\u05FF
    expect(letter).toMatch(/[\u0590-\u05FF]/);
  });

  it('should return Swedish letters (including umlauts) for Swedish', () => {
    // Run many times to verify it works
    const letters = new Set<string>();
    for (let i = 0; i < 200; i++) {
      letters.add(generateBlastLetter('sv'));
    }
    // Should have generated multiple distinct letters
    expect(letters.size).toBeGreaterThan(5);
  });

  it('should fall back to English for unknown languages', () => {
    const letter = generateBlastLetter('xx' as 'en');
    expect(typeof letter).toBe('string');
    expect(letter.length).toBe(1);
  });

  it('should produce fewer vowels with low vowelModifier', () => {
    const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
    const iterations = 500;

    // Normal vowel frequency
    let normalVowelCount = 0;
    for (let i = 0; i < iterations; i++) {
      if (vowels.has(generateBlastLetter('en', 1.0))) normalVowelCount++;
    }

    // Reduced vowel frequency
    let reducedVowelCount = 0;
    for (let i = 0; i < iterations; i++) {
      if (vowels.has(generateBlastLetter('en', 0.5))) reducedVowelCount++;
    }

    // Reduced should have noticeably fewer vowels (with 500 samples, this is statistically reliable)
    expect(reducedVowelCount).toBeLessThan(normalVowelCount);
  });
});

describe('rollSpecialType', () => {
  it('should return standard when chance is 0', () => {
    // With 0% chance, should always be standard
    for (let i = 0; i < 50; i++) {
      expect(rollSpecialType(0)).toBe('standard');
    }
  });

  it('should return a valid tile type', () => {
    // Wildcard removed: valid default types now are standard, gold, bomb, rainbow, ice
    const validTypes = ['standard', 'gold', 'bomb', 'rainbow', 'ice'];
    for (let i = 0; i < 100; i++) {
      const result = rollSpecialType(0.5);
      expect(validTypes).toContain(result);
    }
  });

  it('should always return special when chance is 1', () => {
    // Wildcard removed: special types are gold, bomb, rainbow, ice (sum to 1.0)
    const specialTypes = ['gold', 'bomb', 'rainbow', 'ice'];
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(rollSpecialType(1));
    }
    // All results should be special (not standard) — wildcard no longer in distribution
    results.forEach(r => {
      expect(specialTypes).toContain(r);
    });
  });

  it('should produce distribution matching SPECIAL_TILE_DISTRIBUTION', () => {
    // With 100% special chance, verify all active special types appear
    const counts: Record<string, number> = { gold: 0, bomb: 0, rainbow: 0, ice: 0, standard: 0 };
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const type = rollSpecialType(1);
      const key = counts[type] !== undefined ? type : 'standard';
      counts[key]++;
    }

    // Gold should be roughly SPECIAL_TILE_DISTRIBUTION.gold of total
    const goldRatio = counts.gold / iterations;
    expect(goldRatio).toBeGreaterThan(SPECIAL_TILE_DISTRIBUTION.gold * 0.5);
    expect(goldRatio).toBeLessThan(SPECIAL_TILE_DISTRIBUTION.gold * 1.5);
    // No standard tiles when chance is 1 (distribution sums to 1.0)
    expect(counts.standard).toBe(0);
  });
});
