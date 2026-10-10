import { describe, it, expect } from 'vitest';
import { pickStepHint } from './stepHint';
import type { LetterGrid } from '@/types';

const grid: LetterGrid = [
  ['C', 'A', 'T', 'S'],
  ['X', 'X', 'X', 'X'],
  ['D', 'O', 'G', 'X'],
  ['X', 'X', 'X', 'X'],
];
const words = { easy: ['cat', 'dog'], medium: ['cats'], hard: ['zebra'] };

describe('pickStepHint', () => {
  it('picks the shortest word on the board that meets the length', () => {
    expect(pickStepHint(words, grid, 'en', 3, new Set())?.word).toMatch(/^(CAT|DOG)$/);
    expect(pickStepHint(words, grid, 'en', 4, new Set())?.word).toBe('CATS');
  });

  it('skips words the player already found', () => {
    expect(pickStepHint(words, grid, 'en', 3, new Set(['cat']))?.word).toBe('DOG');
  });

  it('returns null when nothing on the board qualifies', () => {
    expect(pickStepHint(words, grid, 'en', 5, new Set())).toBeNull();
    expect(pickStepHint(null, grid, 'en', 3, new Set())).toBeNull();
  });

  it('returns a path that spells the word', () => {
    const hint = pickStepHint(words, grid, 'en', 4, new Set())!;
    expect(hint.path.map((c) => grid[c.row][c.col]).join('')).toBe('CATS');
  });
});
