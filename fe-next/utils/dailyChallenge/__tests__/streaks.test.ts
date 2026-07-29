/**
 * Streak Calculation Tests
 *
 * Tests for the daily challenge streak functionality
 * to ensure streaks are properly maintained when:
 * 1. Playing on consecutive days (streak increases)
 * 2. Missing a day (streak resets to 1)
 * 3. Playing same day twice (streak stays same)
 */

import {
  getDailyStreak,
  updateDailyStreak,
  getStreakMilestone,
  isStreakAtRisk,
  getStreakMilestoneMessage,
} from '../streaks';
import { DAILY_STREAK_KEY } from '../constants';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock date utilities
vi.mock('../dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2026-01-31'),
  getYesterdayDate: vi.fn(() => '2026-01-30'),
  getPreviousDate: vi.fn((date: string) => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }),
}));

describe('Daily Challenge Streaks', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getDailyStreak', () => {
    it('should return default streak when no data exists', () => {
      // GIVEN: No streak data in localStorage
      // WHEN: Getting the streak
      const streak = getDailyStreak();

      // THEN: Should return default values
      expect(streak).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: null,
        totalDailiesCompleted: 0,
      });
    });

    it('should return stored streak data', () => {
      // GIVEN: Existing streak data
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastPlayedDate: '2026-01-30',
        totalDailiesCompleted: 15,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Getting the streak
      const streak = getDailyStreak();

      // THEN: Should return stored values
      expect(streak).toEqual(existingStreak);
    });
  });

  describe('updateDailyStreak', () => {
    it('should start a new streak when first time playing', () => {
      // GIVEN: No previous streak data
      // WHEN: Updating streak for first time
      const result = updateDailyStreak('2026-01-31');

      // THEN: Should start streak at 1
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.lastPlayedDate).toBe('2026-01-31');
      expect(result.totalDailiesCompleted).toBe(1);
    });

    it('should continue streak when played yesterday', () => {
      // GIVEN: Played yesterday with streak of 5
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastPlayedDate: '2026-01-30', // Yesterday
        totalDailiesCompleted: 15,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Playing today (2026-01-31)
      const result = updateDailyStreak('2026-01-31');

      // THEN: Streak should increase by 1
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(10); // Unchanged (6 < 10)
      expect(result.lastPlayedDate).toBe('2026-01-31');
      expect(result.totalDailiesCompleted).toBe(16);
    });

    it('should reset streak when missed a day', () => {
      // GIVEN: Played two days ago with streak of 5
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastPlayedDate: '2026-01-29', // Two days ago
        totalDailiesCompleted: 15,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Playing today (2026-01-31) after missing yesterday
      const result = updateDailyStreak('2026-01-31');

      // THEN: Streak should reset to 1
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10); // Unchanged
      expect(result.lastPlayedDate).toBe('2026-01-31');
      expect(result.totalDailiesCompleted).toBe(16);
    });

    it('should not update when already played today', () => {
      // GIVEN: Already played today with streak of 5
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastPlayedDate: '2026-01-31', // Today
        totalDailiesCompleted: 15,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Trying to update again today
      const result = updateDailyStreak('2026-01-31');

      // THEN: Should return unchanged
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
      expect(result.lastPlayedDate).toBe('2026-01-31');
      expect(result.totalDailiesCompleted).toBe(15); // Not incremented
    });

    it('should update longest streak when current exceeds it', () => {
      // GIVEN: Current streak equals longest streak
      const existingStreak = {
        currentStreak: 10,
        longestStreak: 10,
        lastPlayedDate: '2026-01-30', // Yesterday
        totalDailiesCompleted: 50,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Continuing streak today
      const result = updateDailyStreak('2026-01-31');

      // THEN: Both current and longest should increase
      expect(result.currentStreak).toBe(11);
      expect(result.longestStreak).toBe(11);
    });
  });

  describe('getStreakMilestone', () => {
    it('should return milestone for 7-day streak', () => {
      expect(getStreakMilestone(7)).toBe(7);
    });

    it('should return milestone for 14-day streak', () => {
      expect(getStreakMilestone(14)).toBe(14);
    });

    it('should return milestone for 30-day streak', () => {
      expect(getStreakMilestone(30)).toBe(30);
    });

    it('should return null for non-milestone streaks', () => {
      expect(getStreakMilestone(5)).toBeNull();
      expect(getStreakMilestone(8)).toBeNull();
      expect(getStreakMilestone(15)).toBeNull();
    });
  });

  describe('getStreakMilestoneMessage', () => {
    it('should return message for 7-day milestone', () => {
      const message = getStreakMilestoneMessage(7);
      expect(message).not.toBeNull();
      expect(message?.emoji).toBe('🔥');
      expect(message?.title).toContain('WEEK');
    });

    it('should return null for non-milestone streaks', () => {
      expect(getStreakMilestoneMessage(5)).toBeNull();
      expect(getStreakMilestoneMessage(8)).toBeNull();
    });
  });

  describe('isStreakAtRisk', () => {
    it('should not be at risk when no streak', () => {
      // GIVEN: No streak data
      // WHEN: Checking if at risk
      const result = isStreakAtRisk();

      // THEN: Should not be at risk
      expect(result.atRisk).toBe(false);
      expect(result.currentStreak).toBe(0);
    });

    it('should not be at risk when already played today', () => {
      // GIVEN: Played today with active streak
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastPlayedDate: '2026-01-31', // Today (mocked)
        totalDailiesCompleted: 15,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Checking if at risk
      const result = isStreakAtRisk();

      // THEN: Should not be at risk (already played today)
      expect(result.atRisk).toBe(false);
      expect(result.currentStreak).toBe(5);
    });

    it('should be at risk when played yesterday but not today', () => {
      // GIVEN: Played yesterday with active streak >= 2
      const existingStreak = {
        currentStreak: 5,
        longestStreak: 10,
        lastPlayedDate: '2026-01-30', // Yesterday (mocked)
        totalDailiesCompleted: 15,
      };
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify(existingStreak));

      // WHEN: Checking if at risk
      const result = isStreakAtRisk();

      // THEN: Should be at risk (need to play today to maintain streak)
      expect(result.atRisk).toBe(true);
      expect(result.currentStreak).toBe(5);
      expect(result.hoursRemaining).toBeGreaterThanOrEqual(0);
    });
  });
});
