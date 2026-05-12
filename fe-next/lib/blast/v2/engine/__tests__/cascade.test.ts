import { describe, it, expect } from 'vitest';
import { detectCascade } from '../cascade';
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
