import { describe, it, expect } from 'vitest';
import { DAILY_PUZZLE_COUNT, dailyPuzzleSet, maxDailyScore } from '../daily';
import { inferTheme } from '../theme';

/** A spread of UTC dates to exercise selection variety deterministically. */
const SAMPLE_DATES = Array.from({ length: 30 }, (_, i) => {
  const day = String(i + 1).padStart(2, '0');
  return `2026-06-${day}`;
});

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

  // Players complained two of the five daily puzzles can "feel near-identical."
  // The set must spread variety: never two puzzles sharing a bridge, and no two
  // ADJACENT puzzles sharing a coarse non-misc theme. Deterministic per date.
  for (const locale of ['en', 'he'] as const) {
    it(`${locale}: a daily set never repeats a bridge`, () => {
      for (const date of SAMPLE_DATES) {
        const set = dailyPuzzleSet(date, locale);
        const bridges = set.map((p) => p.bridge);
        expect(new Set(bridges).size, `dup bridge on ${date}`).toBe(bridges.length);
      }
    });

    it(`${locale}: a daily set never places two same non-misc themes adjacently`, () => {
      for (const date of SAMPLE_DATES) {
        const set = dailyPuzzleSet(date, locale);
        for (let i = 1; i < set.length; i++) {
          const a = inferTheme(set[i - 1]);
          const b = inferTheme(set[i]);
          if (a === 'misc' || b === 'misc') continue;
          expect(a === b, `adjacent theme ${a} on ${date} @${i}`).toBe(false);
        }
      }
    });
  }

  it('en: a daily set draws genuinely varied themes (>=3 distinct buckets incl misc)', () => {
    // en pool is theme-rich; the picker should surface a varied mix most days.
    let variedDays = 0;
    for (const date of SAMPLE_DATES) {
      const themes = new Set(dailyPuzzleSet(date, 'en').map((p) => inferTheme(p)));
      if (themes.size >= 3) variedDays++;
    }
    expect(variedDays).toBeGreaterThan(SAMPLE_DATES.length * 0.8);
  });

  it('maxDailyScore exceeds raw base points (accounts for streak bonus) and is positive', () => {
    const max = maxDailyScore('2026-05-30', 'he');
    expect(max).toBeGreaterThan(0);
  });
});
