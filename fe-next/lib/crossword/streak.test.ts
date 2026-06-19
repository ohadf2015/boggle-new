import { describe, it, expect } from 'vitest';
import { recordSolve, type StreakState, emptyStreak } from './streak';

describe('recordSolve (daily crossword streak)', () => {
  it('GIVEN no prior streak WHEN solving THEN starts at 1', () => {
    const next = recordSolve(emptyStreak(), '2026-06-20');
    expect(next).toEqual({ current: 1, best: 1, lastDateISO: '2026-06-20' });
  });

  it('GIVEN already solved today WHEN solving again THEN nothing changes', () => {
    const prev: StreakState = { current: 3, best: 5, lastDateISO: '2026-06-20' };
    expect(recordSolve(prev, '2026-06-20')).toEqual(prev);
  });

  it('GIVEN solved yesterday WHEN solving today THEN streak increments', () => {
    const prev: StreakState = { current: 3, best: 5, lastDateISO: '2026-06-19' };
    expect(recordSolve(prev, '2026-06-20')).toEqual({ current: 4, best: 5, lastDateISO: '2026-06-20' });
  });

  it('GIVEN a new best WHEN incrementing past best THEN best follows current', () => {
    const prev: StreakState = { current: 5, best: 5, lastDateISO: '2026-06-19' };
    expect(recordSolve(prev, '2026-06-20')).toEqual({ current: 6, best: 6, lastDateISO: '2026-06-20' });
  });

  it('GIVEN a gap of 2+ days WHEN solving THEN current resets to 1 but best is kept', () => {
    const prev: StreakState = { current: 7, best: 7, lastDateISO: '2026-06-17' };
    expect(recordSolve(prev, '2026-06-20')).toEqual({ current: 1, best: 7, lastDateISO: '2026-06-20' });
  });

  it('handles month boundaries correctly (consecutive across month end)', () => {
    const prev: StreakState = { current: 2, best: 2, lastDateISO: '2026-05-31' };
    expect(recordSolve(prev, '2026-06-01')).toEqual({ current: 3, best: 3, lastDateISO: '2026-06-01' });
  });
});
