import { describe, it, expect } from 'vitest';
import { formatLiveShort, streakStripCells, clampPercent, dailyProgressCells, cycleProgressCells } from '../homeHubFormat';

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

describe('streakStripCells', () => {
  it('fills the first N of `total` cells from the start', () => {
    expect(streakStripCells(4, 5)).toEqual([true, true, true, true, false]);
    expect(streakStripCells(0, 5)).toEqual([false, false, false, false, false]);
    expect(streakStripCells(5, 5)).toEqual([true, true, true, true, true]);
  });

  it('caps at `total` for long streaks and floors negatives at 0', () => {
    expect(streakStripCells(99, 5)).toEqual([true, true, true, true, true]);
    expect(streakStripCells(-3, 5)).toEqual([false, false, false, false, false]);
  });

  it('defaults to 5 cells', () => {
    expect(streakStripCells(2)).toHaveLength(5);
  });
});

describe('dailyProgressCells', () => {
  const day = (done: boolean) => ({ wordHunt: done, wordWheel: false });

  it('maps the last `total` days to completed/empty cells (oldest→newest)', () => {
    const days = [day(true), day(false), day(true), day(true), day(false)];
    expect(dailyProgressCells(days, 5)).toEqual([true, false, true, true, false]);
  });

  it('treats either word-hunt OR word-wheel completion as done', () => {
    const days = [
      { wordHunt: false, wordWheel: true },
      { wordHunt: true, wordWheel: false },
      { wordHunt: false, wordWheel: false },
    ];
    expect(dailyProgressCells(days, 3)).toEqual([true, true, false]);
  });

  it('keeps only the most recent `total` days when given more', () => {
    const days = Array.from({ length: 7 }, (_, i) => day(i >= 5)); // last 2 done
    expect(dailyProgressCells(days, 5)).toEqual([false, false, false, true, true]);
  });

  it('left-pads with empty cells when fewer days than `total` are available', () => {
    expect(dailyProgressCells([day(true), day(true)], 5)).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('defaults to 5 cells and is defensive against empty / missing input', () => {
    expect(dailyProgressCells([])).toEqual([false, false, false, false, false]);
    expect(dailyProgressCells(undefined as never)).toHaveLength(5);
  });
});

describe('cycleProgressCells', () => {
  // Mirrors the weekly chest's day markers: 7 cells starting at `cycleStart`,
  // each filled iff that UTC date is in the server's all-modes `completedDates`.
  const cycleStart = '2026-05-06';

  it('fills the 7 cycle days that match the chest completedDates (oldest→newest)', () => {
    // completed: day 1, day 3, day 4 of the cycle
    const completed = ['2026-05-06', '2026-05-08', '2026-05-09'];
    expect(cycleProgressCells(completed, cycleStart, 7)).toEqual([
      true, false, true, true, false, false, false,
    ]);
  });

  it('ignores dates outside the cycle window', () => {
    const completed = ['2026-05-01', '2026-05-06', '2026-05-20'];
    expect(cycleProgressCells(completed, cycleStart, 7)).toEqual([
      true, false, false, false, false, false, false,
    ]);
  });

  it('returns all-empty cells when cycleStart is missing (guest / not loaded yet)', () => {
    expect(cycleProgressCells(['2026-05-06'], '', 7)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });

  it('defaults to 7 cells and is defensive against missing completedDates', () => {
    expect(cycleProgressCells(undefined as never, cycleStart)).toHaveLength(7);
    expect(cycleProgressCells(undefined as never, cycleStart)).toEqual([
      false, false, false, false, false, false, false,
    ]);
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
