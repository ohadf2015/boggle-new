/**
 * Streak Telemetry Tests
 *
 * Verifies streak lifecycle emits the analytics events the PostHog "Streak
 * Engagement" goal expects (`growth:streak_continued`, `streak_broken`,
 * `streak_milestone`, `streak_freeze_used`). Without these, the goal sees
 * zero conversions even when streaks are advancing — which is exactly the
 * 30-day data we observed before this fix.
 */

import { vi, describe, beforeEach, it, expect } from 'vitest';
import { updateDailyStreak } from '../streaks';
import { updateDailyStreakWithFreeze } from '../streakFreeze';
import { DAILY_STREAK_KEY } from '../constants';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));
vi.mock('@/components/GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn() } }));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
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

function eventNames(): string[] {
  return captureMock.mock.calls.map((call) => call[0] as string);
}

describe('Daily Streak Telemetry', () => {
  beforeEach(() => {
    localStorageMock.clear();
    captureMock.mockClear();
  });

  describe('updateDailyStreak', () => {
    it('emits streak_continued when extending an existing streak', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 4, longestStreak: 4,
        lastPlayedDate: '2026-01-30', totalDailiesCompleted: 4,
      }));

      updateDailyStreak('2026-01-31');

      expect(eventNames()).toContain('growth:streak_continued');
    });

    it('emits streak_broken when prior streak existed but missed a day', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 5, longestStreak: 10,
        lastPlayedDate: '2026-01-29', totalDailiesCompleted: 15,
      }));

      updateDailyStreak('2026-01-31');

      expect(eventNames()).toContain('growth:streak_broken');
    });

    it('emits streak_milestone on 7-day mark', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 6, longestStreak: 6,
        lastPlayedDate: '2026-01-30', totalDailiesCompleted: 6,
      }));

      updateDailyStreak('2026-01-31');

      expect(eventNames()).toContain('growth:streak_milestone');
    });

    it('does not emit on same-day re-update (no real change)', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 5, longestStreak: 5,
        lastPlayedDate: '2026-01-31', totalDailiesCompleted: 5,
      }));

      updateDailyStreak('2026-01-31');

      expect(captureMock).not.toHaveBeenCalled();
    });

    it('does not emit streak_broken on first-ever play', () => {
      updateDailyStreak('2026-01-31');

      expect(eventNames()).toContain('growth:streak_continued');
      expect(eventNames()).not.toContain('growth:streak_broken');
    });
  });

  describe('updateDailyStreakWithFreeze', () => {
    it('emits streak_freeze_used when freeze rescues the streak', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 4, longestStreak: 4,
        lastPlayedDate: '2026-01-29', totalDailiesCompleted: 4,
      }));
      localStorageMock.setItem('lexiclash_streak_freezes', JSON.stringify({ count: 1 }));

      updateDailyStreakWithFreeze('2026-01-31');

      expect(eventNames()).toContain('growth:streak_freeze_used');
      expect(eventNames()).toContain('growth:streak_continued');
    });

    it('emits streak_continued (not freeze_used) on normal continuation', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 4, longestStreak: 4,
        lastPlayedDate: '2026-01-30', totalDailiesCompleted: 4,
      }));

      updateDailyStreakWithFreeze('2026-01-31');

      expect(eventNames()).toContain('growth:streak_continued');
      expect(eventNames()).not.toContain('growth:streak_freeze_used');
    });

    it('emits streak_broken when no freeze available and day missed', () => {
      localStorageMock.setItem(DAILY_STREAK_KEY, JSON.stringify({
        currentStreak: 5, longestStreak: 10,
        lastPlayedDate: '2026-01-29', totalDailiesCompleted: 15,
      }));

      updateDailyStreakWithFreeze('2026-01-31');

      expect(eventNames()).toContain('growth:streak_broken');
    });
  });
});
