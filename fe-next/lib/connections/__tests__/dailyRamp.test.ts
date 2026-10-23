import { describe, it, expect } from 'vitest';
import { dailyPuzzleSet, DAILY_PUZZLE_COUNT } from '../daily';

const RANK = { easy: 0, medium: 1, hard: 2 } as const;

describe('dailyPuzzleSet — the run ramps from easy to hard', () => {
  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('is never harder-before-easier (%s)', (locale) => {
    for (let d = 1; d <= 28; d++) {
      const date = `2026-11-${String(d).padStart(2, '0')}`;
      const set = dailyPuzzleSet(date, locale);
      expect(set).toHaveLength(DAILY_PUZZLE_COUNT);
      const ranks = set.map((p) => RANK[p.difficulty]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('stays deterministic per (date, locale)', () => {
    expect(dailyPuzzleSet('2026-11-05', 'en').map((p) => p.id)).toEqual(
      dailyPuzzleSet('2026-11-05', 'en').map((p) => p.id),
    );
  });
});
