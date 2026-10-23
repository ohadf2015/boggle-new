import { describe, it, expect } from 'vitest';
import { dailyPuzzleSet, puzzlesByIds } from '../daily';

describe('puzzlesByIds — restore the exact puzzles a player saw', () => {
  it('returns the puzzles in the stored order', () => {
    const set = dailyPuzzleSet('2026-11-05', 'en');
    const ids = set.map((p) => p.id);
    expect(puzzlesByIds([...ids].reverse(), 'en')?.map((p) => p.id)).toEqual([...ids].reverse());
  });

  it('returns null when any id left the pool, so callers fall back', () => {
    const [first] = dailyPuzzleSet('2026-11-05', 'en');
    expect(puzzlesByIds([first.id, 'gone-forever'], 'en')).toBeNull();
    expect(puzzlesByIds([first.id], 'he')).toBeNull();
  });
});
