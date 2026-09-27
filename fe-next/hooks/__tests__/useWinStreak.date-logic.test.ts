import { vi } from 'vitest';
/**
 * Tests for the date comparison logic in useWinStreak
 *
 * These tests verify that:
 * 1. isSameDay correctly identifies same-day dates
 * 2. isYesterday correctly identifies yesterday's date
 * 3. The streak continuation logic works across different time scenarios
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Test helper functions (matching the ones in useWinStreak.ts)
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

describe('useWinStreak date logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isSameDay', () => {
    it('should return true for same calendar day', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T23:59:59');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different calendar days', () => {
      const date1 = new Date('2024-01-15T23:59:59');
      const date2 = new Date('2024-01-16T00:00:01');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should work across month boundaries', () => {
      const date1 = new Date('2024-01-31T10:00:00');
      const date2 = new Date('2024-02-01T10:00:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should work across year boundaries', () => {
      const date1 = new Date('2023-12-31T10:00:00');
      const date2 = new Date('2024-01-01T10:00:00');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should return true for yesterday (same time)', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
      const yesterday = new Date('2024-01-14T10:00:00');
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('should return true for yesterday (different times)', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
      const yesterdayLate = new Date('2024-01-14T23:59:59');
      const yesterdayEarly = new Date('2024-01-14T00:00:01');
      expect(isYesterday(yesterdayLate)).toBe(true);
      expect(isYesterday(yesterdayEarly)).toBe(true);
    });

    it('should return false for today', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
      const today = new Date('2024-01-15T08:00:00');
      expect(isYesterday(today)).toBe(false);
    });

    it('should return false for two days ago', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
      const twoDaysAgo = new Date('2024-01-13T10:00:00');
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });

    it('should work across month boundaries', () => {
      vi.setSystemTime(new Date('2024-02-01T10:00:00'));
      const lastDayOfJan = new Date('2024-01-31T10:00:00');
      expect(isYesterday(lastDayOfJan)).toBe(true);
    });

    it('should work across year boundaries', () => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00'));
      const lastDayOfPrevYear = new Date('2023-12-31T10:00:00');
      expect(isYesterday(lastDayOfPrevYear)).toBe(true);
    });

    it('should work with ISO date strings (simulating localStorage storage)', () => {
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
      // Simulate how dates are stored: as ISO strings from new Date().toISOString()
      const storedDateIso = '2024-01-14T18:30:00.000Z';
      const parsedDate = new Date(storedDateIso);
      expect(isYesterday(parsedDate)).toBe(true);
    });
  });

  describe('streak continuation scenarios', () => {
    it('should continue streak when winning on consecutive days', () => {
      // Day 1: User wins at 8 PM
      vi.setSystemTime(new Date('2024-01-14T20:00:00'));
      const day1WinTime = new Date().toISOString();

      // Day 2: User opens app at 10 AM
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
      const lastDate = new Date(day1WinTime);

      expect(isSameDay(lastDate, new Date())).toBe(false); // Not same day
      expect(isYesterday(lastDate)).toBe(true); // IS yesterday
    });

    it('should break streak when skipping a day', () => {
      // Day 1: User wins
      vi.setSystemTime(new Date('2024-01-14T20:00:00'));
      const day1WinTime = new Date().toISOString();

      // Day 3: User opens app (skipped Day 2)
      vi.setSystemTime(new Date('2024-01-16T10:00:00'));
      const lastDate = new Date(day1WinTime);

      expect(isSameDay(lastDate, new Date())).toBe(false); // Not same day
      expect(isYesterday(lastDate)).toBe(false); // NOT yesterday (yesterday is Jan 15)
    });

    it('should handle late night win followed by early morning play', () => {
      // Day 1: User wins at 11:59 PM
      vi.setSystemTime(new Date('2024-01-14T23:59:00'));
      const lateNightWin = new Date().toISOString();

      // Day 2: User plays at 12:01 AM (2 minutes later)
      vi.setSystemTime(new Date('2024-01-15T00:01:00'));
      const lastDate = new Date(lateNightWin);

      expect(isSameDay(lastDate, new Date())).toBe(false); // Different calendar days
      expect(isYesterday(lastDate)).toBe(true); // Jan 14 IS yesterday when today is Jan 15
    });
  });
});
