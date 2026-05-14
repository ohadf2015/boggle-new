import { describe, it, expect } from 'vitest';
import { scanFormableThemeWords } from '../word-scan';
import type { BlastLevel } from '../../types';

function lvl(columns: string[][], locale: string = 'en'): BlastLevel {
  return {
    id: 't',
    levelNumber: 1,
    theme: 'onboarding',
    locale: locale as any,
    words: [],
    resolvableOrder: [],
    tileFlags: {},
    difficulty: 1,
    columns: columns.map((tiles, index) => ({ index, tiles })),
  };
}

describe('scanFormableThemeWords', () => {
  it('finds a horizontal word along a row', () => {
    const board = lvl([['C'], ['A'], ['T']]);
    const matches = scanFormableThemeWords(board, ['CAT']);
    expect(matches).toEqual([{ word: 'CAT', cells: ['c0r0', 'c1r0', 'c2r0'] }]);
  });

  it('finds a vertical word within a column', () => {
    const board = lvl([['T', 'A', 'C']]); // bottom->top: T A C
    const matches = scanFormableThemeWords(board, ['CAT']);
    expect(matches.map((m) => m.word)).toEqual(['CAT']);
  });

  it('does NOT match an L-shape or diagonal', () => {
    const board = lvl([['C', 'A'], ['T']]);
    const matches = scanFormableThemeWords(board, ['CAT']);
    expect(matches).toEqual([]);
  });

  it('returns every placement when a word appears twice', () => {
    const board = lvl([['C'], ['A'], ['T'], ['C'], ['A'], ['T']]);
    const matches = scanFormableThemeWords(board, ['CAT']);
    expect(matches.length).toBe(2);
    expect(matches.map((m) => m.cells)).toEqual([
      ['c0r0', 'c1r0', 'c2r0'],
      ['c3r0', 'c4r0', 'c5r0'],
    ]);
  });

  it('respects locale normalization for Hebrew final forms', () => {
    const board = lvl([['ח'], ['ת'], ['ו'], ['ל']], 'he');
    const matches = scanFormableThemeWords(board, ['חתול']);
    expect(matches.map((m) => m.word)).toEqual(['חתול']);
  });
});
