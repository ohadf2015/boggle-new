import { describe, it, expect } from 'vitest';
import { isCoachSeed, plantCoachWord, COACH_SEED_PREFIX } from '../coachBoard';
import { wordUsesCell } from '../goldenTile';

const GRID = Array.from({ length: 5 }, () => ['x', 'x', 'x', 'x', 'x']);

describe('coach board', () => {
  it('recognises coach seeds only', () => {
    expect(isCoachSeed(`${COACH_SEED_PREFIX}abc`)).toBe(true);
    expect(isCoachSeed('abc')).toBe(false);
    expect(isCoachSeed(null)).toBe(false);
  });

  it('plants a traceable starter word, the same one for the same seed', () => {
    const a = plantCoachWord(GRID, 'en', 'coach-1')!;
    expect(a).not.toBeNull();
    expect(plantCoachWord(GRID, 'en', 'coach-1')).toEqual(a);
    expect(wordUsesCell(a.grid, a.word.toLowerCase(), { row: 1, col: 2 })).toBe(true);
    expect(GRID.flat().every((c) => c === 'x')).toBe(true); // input untouched
  });

  it('plants nothing for a language without starter words', () => {
    expect(plantCoachWord(GRID, 'ja', 'coach-1')).toBeNull();
  });
});
