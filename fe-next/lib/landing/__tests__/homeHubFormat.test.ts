import { describe, it, expect } from 'vitest';
import {
  formatLiveShort,
  clampPercent,
  formatTitleFallback,
  dailyWeekCells,
} from '../homeHubFormat';

describe('formatLiveShort', () => {
  it('leaves sub-1000 counts as plain integers', () => {
    expect(formatLiveShort(0)).toBe('0');
    expect(formatLiveShort(7)).toBe('7');
    expect(formatLiveShort(980)).toBe('980');
    expect(formatLiveShort(999)).toBe('999');
  });

  it('compacts thousands with one decimal, trimming a trailing .0', () => {
    expect(formatLiveShort(1000)).toBe('1k');
    expect(formatLiveShort(1240)).toBe('1.2k');
    expect(formatLiveShort(12000)).toBe('12k');
    expect(formatLiveShort(12500)).toBe('12.5k');
  });

  it('is defensive against negative / non-finite input', () => {
    expect(formatLiveShort(-5)).toBe('0');
    expect(formatLiveShort(Number.NaN)).toBe('0');
    expect(formatLiveShort(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatTitleFallback', () => {
  it('humanises a SNAKE_CASE title constant to Title Case', () => {
    expect(formatTitleFallback('LEXICON_KING')).toBe('Lexicon King');
    expect(formatTitleFallback('WORD_SEEKER')).toBe('Word Seeker');
    expect(formatTitleFallback('GRANDMASTER')).toBe('Grandmaster');
  });

  it('is defensive against empty / messy input', () => {
    expect(formatTitleFallback('')).toBe('');
    expect(formatTitleFallback('__WORD__KNIGHT__')).toBe('Word Knight');
  });
});

describe('dailyWeekCells', () => {
  it('returns `days` cells in chronological order ending today, today flagged last', () => {
    const cells = dailyWeekCells([], '2026-06-21', 7);
    expect(cells).toHaveLength(7);
    expect(cells[0].date).toBe('2026-06-15');
    expect(cells[6].date).toBe('2026-06-21');
    expect(cells[6].isToday).toBe(true);
    expect(cells.filter((c) => c.isToday)).toHaveLength(1);
  });

  it('marks a day played when its date is in the played set', () => {
    const cells = dailyWeekCells(['2026-06-19', '2026-06-21', '2026-05-01'], '2026-06-21', 7);
    const byDate = Object.fromEntries(cells.map((c) => [c.date, c.played]));
    expect(byDate['2026-06-19']).toBe(true);
    expect(byDate['2026-06-21']).toBe(true);
    expect(byDate['2026-06-20']).toBe(false);
    // a played date outside the window does not leak in
    expect(cells.some((c) => c.date === '2026-05-01')).toBe(false);
  });

  it('crosses month boundaries correctly', () => {
    const cells = dailyWeekCells([], '2026-03-02', 7);
    expect(cells[0].date).toBe('2026-02-24');
    expect(cells[6].date).toBe('2026-03-02');
  });

  it('is defensive against an invalid today string', () => {
    const cells = dailyWeekCells([], 'not-a-date', 7);
    expect(cells).toHaveLength(7);
    expect(cells.every((c) => c.played === false)).toBe(true);
  });
});

describe('clampPercent', () => {
  it('clamps into the 0..100 range', () => {
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
  });

  it('coerces non-finite to 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});
