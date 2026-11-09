import { describe, it, expect } from 'vitest';
import { findStarterWord } from '../starterWord';
import type { LetterGrid } from '@/types';

// TREE is in the curated English starter list; CAKE is too.
const GRID: LetterGrid = [
  ['T', 'R', 'X', 'Q'],
  ['Z', 'E', 'E', 'Q'],
  ['C', 'A', 'K', 'E'],
  ['Q', 'Q', 'Q', 'Q'],
];

const never = () => false;

describe('findStarterWord', () => {
  it('finds a curated word that can be traced on the board, with its path', () => {
    const found = findStarterWord({ grid: GRID, language: 'en', targetLength: 5, exclude: [], isWord: never });
    expect(found).not.toBeNull();
    expect(['TREE', 'CAKE']).toContain(found!.word);
    expect(found!.path).toHaveLength(4);
    expect(found!.path.map((c) => GRID[c.row][c.col]).join('')).toBe(found!.word);
  });

  it('never suggests a word of the hidden word length, because that would spend a try', () => {
    const found = findStarterWord({ grid: GRID, language: 'en', targetLength: 4, exclude: [], isWord: never });
    expect(found).toBeNull();
  });

  it('skips words the player already found', () => {
    const found = findStarterWord({ grid: GRID, language: 'en', targetLength: 5, exclude: ['tree', 'CAKE'], isWord: never });
    expect(found).toBeNull();
  });

  it('falls back to the dictionary when no curated word is on the board', () => {
    const grid: LetterGrid = [
      ['C', 'A', 'T'],
      ['Q', 'Q', 'Q'],
      ['Q', 'Q', 'Q'],
    ];
    const isWord = (w: string) => w.toUpperCase() === 'CAT';
    const found = findStarterWord({ grid, language: 'en', targetLength: 5, exclude: [], isWord });
    expect(found?.word).toBe('CAT');
    expect(found?.path).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
  });

  it('returns null when nothing traceable is known', () => {
    const grid: LetterGrid = [
      ['Q', 'Q'],
      ['Q', 'Q'],
    ];
    expect(findStarterWord({ grid, language: 'en', targetLength: 5, exclude: [], isWord: never })).toBeNull();
  });
});
