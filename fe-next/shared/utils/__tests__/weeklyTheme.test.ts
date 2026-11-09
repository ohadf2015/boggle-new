import { describe, it, expect } from 'vitest';
import { isoWeekKey, weeklyThemeFor, weeklySeed, parseWeeklySeed, applyThemeBias } from '../weeklyTheme';

const GRID = Array.from({ length: 5 }, () => ['T', 'T', 'T', 'T', 'T']);

describe('isoWeekKey', () => {
  it('uses ISO-8601 weeks in UTC', () => {
    expect(isoWeekKey(new Date('2026-11-09T12:00:00Z'))).toBe('2026-W46');
    expect(isoWeekKey(new Date('2026-11-15T23:00:00Z'))).toBe('2026-W46');
    expect(isoWeekKey(new Date('2026-11-16T00:30:00Z'))).toBe('2026-W47');
    expect(isoWeekKey(new Date('2021-01-01T00:00:00Z'))).toBe('2020-W53');
  });
});

describe('weekly seed', () => {
  it('round-trips the week key and rejects other seeds', () => {
    expect(parseWeeklySeed(weeklySeed('2026-W46'))).toBe('2026-W46');
    expect(parseWeeklySeed('weekly-nope')).toBeNull();
    expect(parseWeeklySeed('coach-123')).toBeNull();
    expect(parseWeeklySeed(undefined)).toBeNull();
  });
});

describe('weeklyThemeFor', () => {
  it('is the same theme for everyone in a week and rotates week to week', () => {
    const a = weeklyThemeFor('2026-W46', 'en');
    expect(weeklyThemeFor('2026-W46', 'en')).toEqual(a);
    const ids = new Set(['2026-W46', '2026-W47', '2026-W48', '2026-W49'].map((w) => weeklyThemeFor(w, 'en').id));
    expect(ids.size).toBe(4);
  });

  it('falls back to Gold Rush (golden tile guaranteed) when a language has no theme letters', () => {
    for (const w of ['2026-W46', '2026-W47', '2026-W48', '2026-W49']) {
      const t = weeklyThemeFor(w, 'ja');
      expect(t.id).toBe('goldRush');
      expect(t.goldenChance).toBe(1);
      expect(t.letters).toEqual([]);
    }
  });
});

describe('applyThemeBias', () => {
  it('sprinkles the theme letters deterministically and keeps the grid case', () => {
    const theme = { id: 'sStorm' as const, letters: ['s'], biasCount: 3, goldenChance: 0.6 };
    const a = applyThemeBias(GRID, theme, 'weekly-2026-W46');
    expect(a).toEqual(applyThemeBias(GRID, theme, 'weekly-2026-W46'));
    expect(a.flat().filter((c) => c === 'S')).toHaveLength(3);
    expect(GRID.flat().every((c) => c === 'T')).toBe(true); // input untouched
  });

  it('leaves the board alone for a theme without letters', () => {
    const theme = weeklyThemeFor('2026-W46', 'ja');
    expect(applyThemeBias(GRID, theme, 'x')).toBe(GRID);
  });
});
