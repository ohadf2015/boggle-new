import { describe, it, expect } from 'vitest';
import {
  countStudentsJoinedThisWeek,
  countWordsMasteredThisWeek,
  deriveWeeklyProgressDigest,
  formatWowDelta,
  isPolarTrialDay7,
  isPolarTrialDay7EmailWindow,
  shouldShowDigestUpgradeCta,
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
    expect(digest.averageScorePct).toBe(86);
    expect(digest.averageScoreWowDeltaPct).toBe(-14);
    expect(digest.inactiveCount).toBe(1);
    const jo = digest.students.find((s) => s.studentId === 's3');
    expect(jo?.inactive7d).toBe(true);
    const sam = digest.students.find((s) => s.studentId === 's1');
    expect(sam?.thisWeekSessions).toBe(2);
    expect(sam?.lastWeekSessions).toBe(1);
    expect(sam?.accuracyDelta).toBe(-14);
  });

  it('hides the digest upgrade CTA for paid Pro and shows it for trial or over-cap', () => {
    expect(
      shouldShowDigestUpgradeCta({ isPaidPro: true, isTrialing: false, trialExpired: false, overFreeTierCaps: true }),
    ).toBe(false);
    expect(
      shouldShowDigestUpgradeCta({ isPaidPro: false, isTrialing: true, trialExpired: false, overFreeTierCaps: false }),
    ).toBe(true);
    expect(
      shouldShowDigestUpgradeCta({ isPaidPro: false, isTrialing: false, trialExpired: false, overFreeTierCaps: true }),
    ).toBe(true);
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

describe('countStudentsJoinedThisWeek', () => {
  it('counts memberships whose joined_at falls inside the last 7 days', () => {
    const roster = [
      { studentId: 's1', name: 'Sam', joinedAt: day(1) },
      { studentId: 's2', name: 'Pat', joinedAt: day(6) },
      { studentId: 's3', name: 'Jo', joinedAt: day(8) },
      { studentId: 's4', name: 'Kim', joinedAt: null },
      { studentId: 's5', name: 'Zed' },
    ];
    expect(countStudentsJoinedThisWeek(roster, NOW)).toBe(2);
  });
});

describe('countWordsMasteredThisWeek', () => {
  it('dedupes words across students and only counts rows completed in the window', () => {
    const count = countWordsMasteredThisWeek(
      [
        { studentId: 's1', completedAt: day(1), words: ['Cat', 'dog'] },
        { studentId: 's2', completedAt: day(2), words: ['cat', 'sun'] },
        { studentId: 's3', completedAt: day(9), words: ['old'] },
        { studentId: 's4', completedAt: day(3), words: ['  ', 'moon'] },
      ],
      NOW,
    );
    expect(count).toBe(4);
  });

  it('returns 0 when nothing was mastered this week', () => {
    expect(
      countWordsMasteredThisWeek([{ studentId: 's1', completedAt: day(10), words: ['old'] }], NOW),
    ).toBe(0);
    expect(countWordsMasteredThisWeek([], NOW)).toBe(0);
  });
});
