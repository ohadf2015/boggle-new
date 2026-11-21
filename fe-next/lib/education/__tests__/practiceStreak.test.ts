import { describe, expect, it } from 'vitest';
import { nextPracticeStreak } from '../practiceStreak';

const TODAY = '2026-11-21';
const row = (current: number, longest: number, last: string | null) => ({ current_streak: current, longest_streak: longest, last_practice_date: last });

describe('nextPracticeStreak', () => {
  it('given no earlier practice, when a completion earns XP, then the streak starts at 1', () => {
    expect(nextPracticeStreak(null, TODAY)).toEqual({ current: 1, longest: 1 });
    expect(nextPracticeStreak(row(0, 0, null), TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('given a practice earlier today, when another completes, then the streak is unchanged', () => {
    expect(nextPracticeStreak(row(4, 9, TODAY), TODAY)).toEqual({ current: 4, longest: 9 });
  });

  it('given a legacy row stamped today with a 0 streak, when a completion lands, then it counts as day 1', () => {
    expect(nextPracticeStreak(row(0, 0, TODAY), TODAY)).toEqual({ current: 1, longest: 1 });
  });

  it('given a practice yesterday, when one completes today, then the streak grows by one and longest follows', () => {
    expect(nextPracticeStreak(row(6, 6, '2026-11-20'), TODAY)).toEqual({ current: 7, longest: 7 });
  });

  it('given yesterday was the last day of a month, when one completes today, then it still counts as consecutive', () => {
    expect(nextPracticeStreak(row(2, 5, '2026-11-30'), '2026-12-01')).toEqual({ current: 3, longest: 5 });
  });

  it('given a gap of a day or more, when one completes, then the streak restarts at 1 and longest is kept', () => {
    expect(nextPracticeStreak(row(12, 12, '2026-11-19'), TODAY)).toEqual({ current: 1, longest: 12 });
  });
});
