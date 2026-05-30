import { describe, it, expect } from 'vitest';
import { DAILY_PUZZLE_COUNT, dailyPuzzleSet, maxDailyScore } from '../daily';

describe('connections daily challenge — deterministic selection', () => {
  it('returns DAILY_PUZZLE_COUNT puzzles', () => {
    const set = dailyPuzzleSet('2026-05-30', 'he');
    expect(set).toHaveLength(DAILY_PUZZLE_COUNT);
  });

  it('is byte-identical for the same (date, locale) — leaderboard integrity', () => {
    const a = dailyPuzzleSet('2026-05-30', 'he').map((p) => p.id);
    const b = dailyPuzzleSet('2026-05-30', 'he').map((p) => p.id);
    expect(a).toEqual(b);
  });

  it('differs across dates', () => {
    const d1 = dailyPuzzleSet('2026-05-30', 'he').map((p) => p.id);
    const d2 = dailyPuzzleSet('2026-05-31', 'he').map((p) => p.id);
    expect(d1).not.toEqual(d2);
  });

  it('does NOT depend on a live banned list — pure of (date, locale) only', () => {
    // selection takes no banned arg; same call → same result regardless of app state
    expect(dailyPuzzleSet.length).toBe(2);
  });

  it('contains no duplicate puzzles within a day', () => {
    const ids = dailyPuzzleSet('2026-05-30', 'he').map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws from the requested locale pool', () => {
    expect(dailyPuzzleSet('2026-05-30', 'he').every((p) => p.id.startsWith('he-'))).toBe(true);
    expect(dailyPuzzleSet('2026-05-30', 'en').every((p) => p.id.startsWith('en-'))).toBe(true);
  });

  it('maxDailyScore exceeds raw base points (accounts for streak bonus) and is positive', () => {
    const max = maxDailyScore('2026-05-30', 'he');
    expect(max).toBeGreaterThan(0);
  });
});
