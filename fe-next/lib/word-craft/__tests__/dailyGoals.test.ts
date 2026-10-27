import { describe, it, expect } from 'vitest';
import { evaluateDailyGoals } from '../dailyGoals';

const hl = (longest: string | null) => ({ bestMove: longest ? { word: longest, score: 9 } : null, longestWord: longest, moves: longest ? 1 : 0 });

describe('evaluateDailyGoals', () => {
  it('marks each goal independently', () => {
    const r = evaluateDailyGoals({ highlights: hl('plant'), playerCells: 6, botCells: 9 });
    expect(r).toEqual([
      { id: 'longWord', done: true },
      { id: 'claim', done: false },
      { id: 'win', done: false },
    ]);
  });
  it('completes everything on a big win', () => {
    expect(evaluateDailyGoals({ highlights: hl('quartz'), playerCells: 12, botCells: 4 }).every((g) => g.done)).toBe(true);
  });
  it('fails all goals when the player never scored', () => {
    expect(evaluateDailyGoals({ highlights: hl(null), playerCells: 0, botCells: 5 }).some((g) => g.done)).toBe(false);
  });
  it('a tie is not a win', () => {
    expect(evaluateDailyGoals({ highlights: hl('ab'), playerCells: 5, botCells: 5 }).find((g) => g.id === 'win')?.done).toBe(false);
  });
});
