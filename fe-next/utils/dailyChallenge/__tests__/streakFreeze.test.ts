/**
 * Streak Freeze Integration Tests
 * Tests updateDailyStreakWithFreeze: auto-consumes freeze when streak would break
 */

import { updateDailyStreakWithFreeze, STREAK_FREEZE_KEY } from '../streakFreeze';
import { DAILY_STREAK_KEY } from '../constants';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('../dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2026-01-31'),
  getYesterdayDate: vi.fn(() => '2026-01-30'),
  getPreviousDate: vi.fn((date: string) => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }),
}));

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('updateDailyStreakWithFreeze', () => {
  test('continues streak normally when played yesterday (no freeze needed)', () => {
    // Set up: played yesterday, streak of 5
    localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
      currentStreak: 5, longestStreak: 5, lastPlayedDate: '2026-01-30', totalDailiesCompleted: 5,
    }));

    const result = updateDailyStreakWithFreeze('2026-01-31');
    expect(result.streak.currentStreak).toBe(6);
    expect(result.freezeUsed).toBe(false);
  });

  test('consumes freeze when day was missed but freeze available', () => {
    // Set up: played 2 days ago (missed yesterday), have 1 freeze
    localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
      currentStreak: 5, longestStreak: 5, lastPlayedDate: '2026-01-29', totalDailiesCompleted: 5,
    }));
    localStorageMock.setItem(STREAK_FREEZE_KEY, JSON.stringify({ count: 2 }));

    const result = updateDailyStreakWithFreeze('2026-01-31');
    expect(result.streak.currentStreak).toBe(6); // streak continues
    expect(result.freezeUsed).toBe(true);

    // Verify freeze was decremented
    const freezeData = JSON.parse(localStorageMock.getItem(STREAK_FREEZE_KEY)!);
    expect(freezeData.count).toBe(1);
  });

  test('streak breaks when day missed and no freezes available', () => {
    localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
      currentStreak: 5, longestStreak: 5, lastPlayedDate: '2026-01-29', totalDailiesCompleted: 5,
    }));
    // No freezes set

    const result = updateDailyStreakWithFreeze('2026-01-31');
    expect(result.streak.currentStreak).toBe(1); // streak broken
    expect(result.freezeUsed).toBe(false);
  });

  test('freeze count 0 does not protect streak', () => {
    localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
      currentStreak: 10, longestStreak: 10, lastPlayedDate: '2026-01-29', totalDailiesCompleted: 10,
    }));
    localStorageMock.setItem(STREAK_FREEZE_KEY, JSON.stringify({ count: 0 }));

    const result = updateDailyStreakWithFreeze('2026-01-31');
    expect(result.streak.currentStreak).toBe(1);
    expect(result.freezeUsed).toBe(false);
  });
});
