import { describe, it, expect } from 'vitest';
import {
  deriveWeeklyProgressDigest,
  formatWowDelta,
  isPolarTrialDay7,
  isPolarTrialDay7EmailWindow,
} from '../weeklyProgressDigest';

const NOW = Date.parse('2026-10-13T12:00:00.000Z');
const day = (n: number) => new Date(NOW - n * 86400000).toISOString();

describe('isPolarTrialDay7', () => {
  it('is exact day 7 of a 14-day Polar trial (7 days left)', () => {
    expect(isPolarTrialDay7(7)).toBe(true);
    expect(isPolarTrialDay7(6)).toBe(false);
    expect(isPolarTrialDay7(8)).toBe(false);
    expect(isPolarTrialDay7(null)).toBe(false);
    expect(isPolarTrialDay7(undefined)).toBe(false);
  });
});

describe('isPolarTrialDay7EmailWindow', () => {
  it('catches a Monday send around mid-trial without stealing day 10', () => {
    expect(isPolarTrialDay7EmailWindow(7)).toBe(true);
    expect(isPolarTrialDay7EmailWindow(5)).toBe(true);
    expect(isPolarTrialDay7EmailWindow(4)).toBe(false);
    expect(isPolarTrialDay7EmailWindow(8)).toBe(false);
  });
});

describe('deriveWeeklyProgressDigest', () => {
  it('counts this-week students, games, words, assignments and wow vs last week', () => {
    const digest = deriveWeeklyProgressDigest({
      now: NOW,
      roster: [
        { studentId: 's1', name: 'Sam' },
        { studentId: 's2', name: 'Pat' },
        { studentId: 's3', name: 'Jo' },
      ],
      sessions: [
        { studentId: 's1', completedAt: day(1), foundCount: 8, missedCount: 2 },
        { studentId: 's1', completedAt: day(2), foundCount: 4, missedCount: 0 },
        { studentId: 's2', completedAt: day(3), foundCount: 6, missedCount: 1 },
        { studentId: 's1', completedAt: day(10), foundCount: 2, missedCount: 0 },
      ],
      assignmentCompletions: [{ completedAt: day(1) }, { completedAt: day(2) }, { completedAt: day(10) }],
      assignmentExpected: 6,
    });
    expect(digest.thisWeek.studentsActive).toBe(2);
    expect(digest.thisWeek.gamesCompleted).toBe(3);
    expect(digest.thisWeek.wordsCompleted).toBe(18);
    expect(digest.thisWeek.assignmentCompleted).toBe(2);
    expect(digest.thisWeek.assignmentCompletionPct).toBe(33);
    expect(digest.lastWeek.studentsActive).toBe(1);
    expect(digest.lastWeek.gamesCompleted).toBe(1);
    expect(digest.lastWeek.wordsCompleted).toBe(2);
    expect(digest.lastWeek.assignmentCompleted).toBe(1);
    expect(digest.wow.studentsActive).toBe(1);
    expect(digest.wow.gamesCompleted).toBe(2);
    expect(digest.wow.wordsCompleted).toBe(16);
    expect(digest.wow.assignmentCompletionPctPoints).toBe(16);
  });

  it('leaves assignment pct null when nothing was assigned', () => {
    const digest = deriveWeeklyProgressDigest({
      now: NOW,
      roster: [{ studentId: 's1', name: 'Sam' }],
      sessions: [],
      assignmentExpected: 0,
    });
    expect(digest.thisWeek.assignmentCompletionPct).toBeNull();
    expect(digest.wow.assignmentCompletionPctPoints).toBeNull();
  });
});

describe('formatWowDelta', () => {
  it('signs positive deltas', () => {
    expect(formatWowDelta(3)).toBe('+3');
    expect(formatWowDelta(0)).toBe('0');
    expect(formatWowDelta(-2)).toBe('-2');
  });
});
