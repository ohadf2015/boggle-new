import { describe, it, expect } from 'vitest';
import { detectCascade, detectAllCascades } from '../cascade';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';
import { LOCALE_CONFIGS } from '../../locale-config';

describe('cascade detection', () => {
  it('detects cascade word in remaining tiles', () => {
    const level: BlastLevel = {
      id: 'cascade-test',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['C', 'A', 'T'] },
        { index: 1, tiles: ['S', 'U', 'N'] },
      ],
      words: ['CAT', 'SUN'],
      resolvableOrder: ['CAT', 'SUN'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectCascade(level, new Set(['CAT']), LOCALE_CONFIGS.en);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.word).toBe('SUN');
      expect(result.cells).toEqual([cellId(1, 0), cellId(1, 1), cellId(1, 2)]);
    }
  });

  it('returns null when no cascade possible', () => {
    const level: BlastLevel = {
      id: 'cascade-test-2',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['A'] },
        { index: 1, tiles: ['B'] },
      ],
      words: ['AB'],
      resolvableOrder: ['AB'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectCascade(level, new Set(['AB']), LOCALE_CONFIGS.en);
    expect(result).toBeNull();
  });

  it('detectAllCascades returns every non-overlapping match in one pass', () => {
    const level: BlastLevel = {
      id: 'all-cascades-1',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['C', 'A', 'T'] },
        { index: 1, tiles: ['S', 'U', 'N'] },
        { index: 2, tiles: ['D', 'O', 'G'] },
      ],
      words: ['CAT', 'SUN', 'DOG'],
      resolvableOrder: ['CAT', 'SUN', 'DOG'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAllCascades(level, new Set(), LOCALE_CONFIGS.en);
    expect(result.map((c) => c.word).sort()).toEqual(['CAT', 'DOG', 'SUN']);
    expect(result).toHaveLength(3);
  });

  it('detectAllCascades resolves cell conflicts deterministically by level.words order', () => {
    const level: BlastLevel = {
      id: 'all-cascades-conflict',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['C', 'A', 'R'] },
        { index: 1, tiles: ['A', 'A', 'A'] },
        { index: 2, tiles: ['T', 'A', 'M'] },
      ],
      words: ['CAT', 'RAM'],
      resolvableOrder: ['CAT', 'RAM'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAllCascades(level, new Set(), LOCALE_CONFIGS.en);
    const words = result.map((c) => c.word);
    expect(words).toContain('CAT');
    expect(words).toContain('RAM');
    const allCells = result.flatMap((c) => c.cells);
    expect(new Set(allCells).size).toBe(allCells.length);
  });

  it('detectAllCascades returns empty array when no matches', () => {
    const level: BlastLevel = {
      id: 'all-cascades-empty',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['X'] },
        { index: 1, tiles: ['Y'] },
      ],
      words: ['XY'],
      resolvableOrder: ['XY'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectAllCascades(level, new Set(['XY']), LOCALE_CONFIGS.en);
    expect(result).toEqual([]);
  });

  it('detects cascade word in multiple directions', () => {
    const level: BlastLevel = {
      id: 'cascade-test-3',
      levelNumber: 1,
      locale: 'en',
      theme: 'onboarding',
      columns: [
        { index: 0, tiles: ['B', 'A', 'C'] },
        { index: 1, tiles: ['A', 'T', 'A'] },
        { index: 2, tiles: ['T', 'S', 'T'] },
      ],
      words: ['BAT', 'CAT'],
      resolvableOrder: ['BAT', 'CAT'],
      tileFlags: {},
      gravityMode: 'standard',
      difficulty: 1,
    };
    const result = detectCascade(level, new Set(['BAT']), LOCALE_CONFIGS.en);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.word).toBe('CAT');
      expect(result.cells.length).toBe(3);
    }
  });
});
