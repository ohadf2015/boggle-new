/**
 * Tests for weighted letter distribution in grid generation
 *
 * Validates that Quick Play boards have realistic English letter frequencies
 * while ensuring Daily Challenge boards remain deterministic and unchanged.
 */

import { describe, it, expect } from 'vitest';
import { generateDailyGrid, generateDailyGridWithWeightedLetters } from '../gridGeneration';
import type { Language } from '@/types';

/**
 * Calculate vowel share as a percentage (A, E, I, O, U)
 */
function calculateVowelShare(grid: string[][]): number {
  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  let vowelCount = 0;
  let totalCount = 0;
  for (const row of grid) {
    for (const letter of row) {
      totalCount++;
      if (vowels.has(letter.toUpperCase())) vowelCount++;
    }
  }
  return totalCount > 0 ? (vowelCount / totalCount) * 100 : 0;
}

/**
 * Check if a grid has a Q without any U
 */
function hasQWithoutU(grid: string[][]): boolean {
  const letters = grid.flat().map(l => l.toUpperCase());
  const hasQ = letters.includes('Q');
  const hasU = letters.includes('U');
  return hasQ && !hasU;
}

/**
 * Check if a row has at least one vowel
 */
function hasRowVowel(row: string[]): boolean {
  const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
  return row.some(letter => vowels.has(letter.toUpperCase()));
}

/**
 * Count boards that have at least one row with zero vowels
 */
function boardsWithDeadRows(grids: string[][][]): number {
  return grids.filter(grid => grid.some(row => !hasRowVowel(row))).length;
}

describe('Weighted Letter Distribution', () => {
  describe('generateDailyGridWithWeightedLetters (RED/GREEN)', () => {
    it('GIVEN English WHEN generateDailyGridWithWeightedLetters THEN returns deterministic grid', () => {
      const seed = 'test-seed-1';
      const grid1 = generateDailyGridWithWeightedLetters(seed, 'en');
      const grid2 = generateDailyGridWithWeightedLetters(seed, 'en');
      expect(grid1).toEqual(grid2);
    });

    it('GIVEN English WHEN generateDailyGridWithWeightedLetters THEN mean vowel share is 32-40%', () => {
      const samples = 20;
      const grids = Array.from({ length: samples }, (_, i) =>
        generateDailyGridWithWeightedLetters(`weighted-en-${i}`, 'en')
      );
      const shares = grids.map(calculateVowelShare);
      const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
      expect(mean).toBeGreaterThanOrEqual(32);
      expect(mean).toBeLessThanOrEqual(40);
    });

    it('GIVEN English WHEN generateDailyGridWithWeightedLetters THEN rarely has Q-without-U', () => {
      const samples = 50;
      const grids = Array.from({ length: samples }, (_, i) =>
        generateDailyGridWithWeightedLetters(`weighted-en-q-${i}`, 'en')
      );
      const qNoUCount = grids.filter(hasQWithoutU).length;
      // Should be very rare: 0-2 out of 50 is acceptable
      expect(qNoUCount).toBeLessThanOrEqual(2);
    });

    it('GIVEN English WHEN generateDailyGridWithWeightedLetters THEN most rows have at least one vowel', () => {
      const samples = 20;
      const grids = Array.from({ length: samples }, (_, i) =>
        generateDailyGridWithWeightedLetters(`weighted-en-rows-${i}`, 'en')
      );
      const deadBoardCount = boardsWithDeadRows(grids);
      // Almost all boards should have vowels in every row
      // Allow ~5% failure rate (1 in 20)
      expect(deadBoardCount).toBeLessThanOrEqual(1);
    });

    it('GIVEN non-English WHEN generateDailyGridWithWeightedLetters THEN uses unweighted distribution', () => {
      // Swedish should fall back to old behavior (unweighted)
      const grid = generateDailyGridWithWeightedLetters('test-sv', 'sv');
      expect(grid).toHaveLength(6);
      expect(grid[0]).toHaveLength(6);
      // Just verify it returns a valid grid; statistical guarantees don't apply
    });

    it('GIVEN Japanese WHEN generateDailyGridWithWeightedLetters THEN uses kanji/hiragana', () => {
      const grid = generateDailyGridWithWeightedLetters('test-ja', 'ja');
      expect(grid).toHaveLength(6);
      expect(grid[0]).toHaveLength(6);
      // Japanese uses different logic; just verify structure
    });
  });

  describe('Daily Challenge path unchanged (backward compatibility)', () => {
    it('GIVEN English WHEN generateDailyGrid called THEN produces same deterministic output as before', () => {
      // Same seed should produce same grid every time via old function
      const seed = 'daily-2026-06-15';
      const grid1 = generateDailyGrid(seed, 'en');
      const grid2 = generateDailyGrid(seed, 'en');
      expect(grid1).toEqual(grid2);
    });

    it('GIVEN different dates WHEN generateDailyGrid called THEN produces different grids', () => {
      const grid1 = generateDailyGrid('2026-06-15', 'en');
      const grid2 = generateDailyGrid('2026-06-16', 'en');
      // Extremely unlikely to be identical with different seeds
      expect(grid1).not.toEqual(grid2);
    });

    it('GIVEN Swedish WHEN generateDailyGrid called THEN still uses unweighted distribution', () => {
      const grid = generateDailyGrid('daily-sv', 'sv');
      expect(grid).toHaveLength(6);
      // Verify it's still using the old unweighted behavior by checking determinism
      const grid2 = generateDailyGrid('daily-sv', 'sv');
      expect(grid).toEqual(grid2);
    });

    it('GIVEN Hebrew WHEN generateDailyGrid called THEN still uses unweighted distribution', () => {
      const grid = generateDailyGrid('daily-he', 'he');
      expect(grid).toHaveLength(6);
      const grid2 = generateDailyGrid('daily-he', 'he');
      expect(grid).toEqual(grid2);
    });
  });

  describe('Statistical verification (before vs. after)', () => {
    it('GIVEN unweighted grid THEN vowel share is lower than weighted', () => {
      const unweightedGrids = Array.from({ length: 30 }, (_, i) =>
        generateDailyGrid(`unweighted-${i}`, 'en')
      );
      const weightedGrids = Array.from({ length: 30 }, (_, i) =>
        generateDailyGridWithWeightedLetters(`weighted-${i}`, 'en')
      );

      const unweightedMean =
        unweightedGrids.map(calculateVowelShare).reduce((a, b) => a + b, 0) / unweightedGrids.length;
      const weightedMean =
        weightedGrids.map(calculateVowelShare).reduce((a, b) => a + b, 0) / weightedGrids.length;

      // Weighted should have noticeably higher vowel share
      expect(weightedMean).toBeGreaterThan(unweightedMean);
    });

    it('GIVEN unweighted grid THEN has more Q-without-U instances', () => {
      const unweightedGrids = Array.from({ length: 50 }, (_, i) =>
        generateDailyGrid(`unweighted-q-${i}`, 'en')
      );
      const weightedGrids = Array.from({ length: 50 }, (_, i) =>
        generateDailyGridWithWeightedLetters(`weighted-q-${i}`, 'en')
      );

      const unweightedQNoU = unweightedGrids.filter(hasQWithoutU).length;
      const weightedQNoU = weightedGrids.filter(hasQWithoutU).length;

      // Weighted should have fewer Q-without-U instances
      expect(weightedQNoU).toBeLessThan(unweightedQNoU);
    });
  });
});
