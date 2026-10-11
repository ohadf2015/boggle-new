import { describe, it, expect } from 'vitest';
import { plantStarterWord, findStarterOnGrid, STARTER_WORDS } from './starterWords';
import type { LetterGrid } from '@/types';

const board = (n: number, fill = 'Z'): LetterGrid => Array.from({ length: n }, () => Array.from({ length: n }, () => fill));

describe('plantStarterWord', () => {
  it('writes a starter word down the middle column and returns its path', () => {
    const planted = plantStarterWord(board(5), 'en', () => 0)!;
    expect(planted.word).toBe(STARTER_WORDS.en![0]);
    expect(planted.path.map((c) => c.col)).toEqual([2, 2, 2]);
    expect(planted.path.map((c) => c.row)).toEqual([1, 2, 3]);
    expect(planted.path.map((c) => planted.grid[c.row][c.col]).join('')).toBe(planted.word);
  });

  it('does not mutate the board it was given', () => {
    const original = board(5);
    plantStarterWord(original, 'en', () => 0);
    expect(original.flat().every((l) => l === 'Z')).toBe(true);
  });

  it('plants nothing for a language without starter words', () => {
    expect(plantStarterWord(board(5), 'ja', () => 0)).toBeNull();
  });

  it('has starter words for every board language but Japanese, sized to fit a 4x4 board', () => {
    for (const lang of ['en', 'he', 'sv', 'es'] as const) {
      const words = STARTER_WORDS[lang]!;
      expect(words.length).toBeGreaterThan(0);
      for (const w of words) expect([...w].length).toBeLessThanOrEqual(4);
    }
  });

  it('keeps Hebrew starters free of final letter forms the board never deals', () => {
    for (const w of STARTER_WORDS.he!) expect(/[ךםןףץ]/.test(w)).toBe(false);
  });
});

describe('findStarterOnGrid', () => {
  it('finds the planted starter again from the board alone', () => {
    const planted = plantStarterWord(board(5), 'en', () => 0)!;
    const hint = findStarterOnGrid(planted.grid, 'en');
    expect(hint?.word).toBe(planted.word);
    expect(hint?.path.map((c) => [c.row, c.col])).toEqual(planted.path.map((c) => [c.row, c.col]));
  });

  it('returns null when no starter is on the board', () => {
    expect(findStarterOnGrid(board(5), 'en')).toBeNull();
  });
});
