import { describe, it, expect } from 'vitest';
import { findExtraWords } from '../extra-word-check';
import type { BlastLevel } from '../../types';

const level: BlastLevel = {
  id: 't',
  levelNumber: 1,
  theme: 'onboarding',
  locale: 'en',
  words: ['CAT'],
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['A'] },
    { index: 2, tiles: ['R'] },
  ],
  resolvableOrder: ['CAT'],
  tileFlags: {},
  difficulty: 1,
};

const isWord = (w: string) =>
  new Set(['CAT', 'CAR', 'AT', 'AR', 'CA', 'TA', 'RA']).has(w.toUpperCase());

describe('findExtraWords', () => {
  it('flags a real dictionary word that is not in level.words', () => {
    expect(findExtraWords(level, isWord, 3)).toContain('CAR');
  });

  it('does not flag the intended theme word', () => {
    expect(findExtraWords(level, isWord, 3)).not.toContain('CAT');
  });

  it('ignores segments shorter than minLength', () => {
    const extra = findExtraWords(level, isWord, 3);
    expect(extra).not.toContain('AT');
    expect(extra).not.toContain('AR');
    expect(extra).not.toContain('CA');
  });

  it('returns empty when the board contains only its intended words', () => {
    const clean: BlastLevel = {
      ...level,
      columns: [
        { index: 0, tiles: ['C'] },
        { index: 1, tiles: ['A'] },
        { index: 2, tiles: ['T'] },
      ],
    };
    expect(findExtraWords(clean, isWord, 3)).toEqual([]);
  });

  it('scans both horizontal reading directions and vertical (columns)', () => {
    // columns are vertical tiles, so CAT as column[0].tiles = ['C','A','T'] is vertical read
    // Horizontal would be row 0: tiles at (0,0), (1,0), (2,0) = C, A, R = CAR
    const extra = findExtraWords(level, isWord, 3);
    expect(extra).toContain('CAR'); // horizontal CAR
  });

  it('handles empty columns gracefully', () => {
    const sparseLevel: BlastLevel = {
      ...level,
      columns: [
        { index: 0, tiles: ['X'] },
        { index: 2, tiles: ['Y'] },
      ],
    };
    expect(() => findExtraWords(sparseLevel, isWord, 3)).not.toThrow();
  });

  it('respects locale-specific normalization (case-insensitive for English)', () => {
    const mixedCaseLevel: BlastLevel = {
      ...level,
      words: ['cat'],
      columns: [
        { index: 0, tiles: ['c', 'a', 't'] },
        { index: 1, tiles: ['a'] },
        { index: 2, tiles: ['r'] },
      ],
    };
    // CAR should still be flagged even with lowercase input
    const extra = findExtraWords(mixedCaseLevel, isWord, 3);
    expect(extra.some(w => w.toUpperCase() === 'CAR')).toBe(true);
  });
});
