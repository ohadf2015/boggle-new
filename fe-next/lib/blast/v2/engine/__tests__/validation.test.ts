import { describe, it, expect } from 'vitest';
import { validateSelection, type ValidationContext } from '../validation';
import { cellId } from '../cell-id';
import type { BlastLevel } from '../../types';
import { LOCALE_CONFIGS } from '../../locale-config';

const mockLevel: BlastLevel = {
  id: 'test-level-1',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

const mockContext: ValidationContext = {
  level: mockLevel,
  config: LOCALE_CONFIGS.en,
  foundWords: new Set(),
  bonusDict: new Set(),
  bonusDictEnabled: false,
};

describe('validation pipeline', () => {
  it('< 2 cells rejected with length reason', () => {
    const result = validateSelection([cellId(0, 0)], mockContext);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('length');
    }
  });

  it('cells on different axes rejected with axis reason', () => {
    const result = validateSelection([cellId(0, 0), cellId(1, 1)], mockContext);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('axis');
    }
  });

  it('non-contiguous cells rejected with gap reason', () => {
    const result = validateSelection([cellId(0, 0), cellId(2, 0)], mockContext);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('gap');
    }
  });

  it('cells crossing frozen tile rejected with frozen reason', () => {
    const ctxWithFrozen: ValidationContext = {
      ...mockContext,
      level: { ...mockLevel, tileFlags: { [cellId(0, 1)]: ['frozen'] } },
    };
    const result = validateSelection([cellId(0, 0), cellId(0, 1)], ctxWithFrozen);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('frozen');
    }
  });

  it('already-found word rejected with duplicate reason', () => {
    const ctxWithFound = { ...mockContext, foundWords: new Set(['CAT']) };
    const result = validateSelection([cellId(0, 0), cellId(0, 1), cellId(0, 2)], ctxWithFound);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('duplicate');
    }
  });

  it('theme word accepted as theme_match', () => {
    const result = validateSelection([cellId(0, 0), cellId(0, 1), cellId(0, 2)], mockContext);
    expect(result.kind).toBe('theme_match');
    if (result.kind === 'theme_match') {
      expect(result.word).toBe('CAT');
    }
  });

  it('reversed theme word accepted as theme_match', () => {
    const result = validateSelection([cellId(0, 2), cellId(0, 1), cellId(0, 0)], mockContext);
    expect(result.kind).toBe('theme_match');
    if (result.kind === 'theme_match') {
      expect(result.word).toBe('CAT');
    }
  });

  it('bonus dict word accepted when mechanic enabled', () => {
    const ctxWithBonus: ValidationContext = {
      ...mockContext,
      bonusDict: new Set(['BON']),
      bonusDictEnabled: true,
    };
    // Create a level with a path spelling BON
    const levelWithBonus: BlastLevel = {
      ...mockLevel,
      id: 'test-level-bonus',
      words: ['CAT'],
      resolvableOrder: ['CAT'],
      columns: [
        { index: 0, tiles: ['B', 'A', 'N'] },
        { index: 1, tiles: ['O', 'U', 'U'] },
        { index: 2, tiles: ['N', 'S', 'Z'] },
      ],
    };
    const ctxFinal = { ...ctxWithBonus, level: levelWithBonus };
    const result = validateSelection([cellId(0, 0), cellId(1, 0), cellId(2, 0)], ctxFinal);
    expect(result.kind).toBe('bonus');
    if (result.kind === 'bonus') {
      expect(result.word).toBe('BON');
    }
  });

  it('unknown word rejected', () => {
    const result = validateSelection([cellId(0, 0), cellId(1, 0)], mockContext);
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('unknown');
    }
  });

  it('free-form dictionary word accepted as bonus when dictionaryCheck provided', () => {
    // Board: row 0 across spells "CSE" — not in level.words, not in bonusDict.
    // dictionaryCheck accepts "cse" → treat as bonus.
    const ctxWithDict: ValidationContext = {
      ...mockContext,
      dictionaryCheck: (w) => w.toLowerCase() === 'cse',
    };
    const result = validateSelection(
      [cellId(0, 0), cellId(1, 0), cellId(2, 0)],
      ctxWithDict,
    );
    expect(result.kind).toBe('bonus');
    if (result.kind === 'bonus') {
      expect(result.word.toLowerCase()).toBe('cse');
    }
  });

  it('free-form dictionary word accepted in reverse', () => {
    // "ESC" reversed is "CSE" — dict has "esc".
    const ctxWithDict: ValidationContext = {
      ...mockContext,
      dictionaryCheck: (w) => w.toLowerCase() === 'esc',
    };
    const result = validateSelection(
      [cellId(0, 0), cellId(1, 0), cellId(2, 0)],
      ctxWithDict,
    );
    expect(result.kind).toBe('bonus');
  });

  it('dictionaryCheck rejection still falls through to unknown', () => {
    const ctxWithDict: ValidationContext = {
      ...mockContext,
      dictionaryCheck: () => false,
    };
    const result = validateSelection(
      [cellId(0, 0), cellId(1, 0)],
      ctxWithDict,
    );
    expect(result.kind).toBe('reject');
    if (result.kind === 'reject') {
      expect(result.reason).toBe('unknown');
    }
  });

  it('theme match prefers theme_match over dictionaryCheck bonus', () => {
    const ctxWithDict: ValidationContext = {
      ...mockContext,
      dictionaryCheck: () => true,
    };
    const result = validateSelection(
      [cellId(0, 0), cellId(0, 1), cellId(0, 2)],
      ctxWithDict,
    );
    expect(result.kind).toBe('theme_match');
  });
});
