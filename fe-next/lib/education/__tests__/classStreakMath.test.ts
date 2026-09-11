/**
 * Server-shared class-streak math — RED first.
 *
 * The class streak (consecutive assignment days where at least one student
 * finished the homework) must compute identically on the device and on the
 * server, so the arithmetic lives in one pure module both import.
 */
import { describe, it, expect } from 'vitest';
import {
  addCompletionDay,
  consecutiveDaysEndingAt,
  longestConsecutiveRun,
} from '../classStreakMath';

describe('consecutiveDaysEndingAt', () => {
  it('counts back through unbroken days', () => {
    expect(
      consecutiveDaysEndingAt(['2026-09-08', '2026-09-09', '2026-09-10'], '2026-09-10'),
    ).toBe(3);
  });

  it('stops at the first gap', () => {
    expect(
      consecutiveDaysEndingAt(['2026-09-06', '2026-09-09', '2026-09-10'], '2026-09-10'),
    ).toBe(2);
  });

  it('returns 0 when the end day itself is missing', () => {
    expect(consecutiveDaysEndingAt(['2026-09-09'], '2026-09-11')).toBe(0);
  });

  it('crosses a month boundary', () => {
    expect(
      consecutiveDaysEndingAt(['2026-08-31', '2026-09-01'], '2026-09-01'),
    ).toBe(2);
  });
});

describe('longestConsecutiveRun', () => {
  it('finds the longest streak anywhere in the history', () => {
    expect(
      longestConsecutiveRun([
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-07',
        '2026-09-08',
      ]),
    ).toBe(3);
  });

  it('is 0 for no days', () => {
    expect(longestConsecutiveRun([])).toBe(0);
  });
});

describe('addCompletionDay', () => {
  it('adds a new day in sorted order', () => {
    expect(addCompletionDay(['2026-09-10'], '2026-09-09')).toEqual([
      '2026-09-09',
      '2026-09-10',
    ]);
  });

  it('is idempotent for a day already recorded', () => {
    expect(addCompletionDay(['2026-09-10'], '2026-09-10')).toEqual(['2026-09-10']);
  });

  it('ignores a malformed day', () => {
    expect(addCompletionDay(['2026-09-10'], 'nope')).toEqual(['2026-09-10']);
  });

  it('caps the history to the most recent days', () => {
    const days = Array.from({ length: 5 }, (_, i) => `2026-09-0${i + 1}`);
    expect(addCompletionDay(days, '2026-09-06', 3)).toEqual([
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
  });
});
