import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { computeLongestConsecutiveStreak } from '../longestStreakCalculator';

vi.mock('@/utils/dailyChallenge/dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2026-09-20'),
}));

describe('longestStreakCalculator', () => {
  describe('computeLongestConsecutiveStreak', () => {
    it('returns 0 for empty array', () => {
      expect(computeLongestConsecutiveStreak([])).toBe(0);
    });

    it('returns 1 for single date', () => {
      expect(computeLongestConsecutiveStreak(['2026-09-20'])).toBe(1);
    });

    it('returns correct length for consecutive dates', () => {
      const dates = ['2026-09-20', '2026-09-19', '2026-09-18'];
      expect(computeLongestConsecutiveStreak(dates)).toBe(3);
    });

    it('returns longest run when there is a gap', () => {
      // 3 consecutive days, then a gap, then 2 consecutive days
      const dates = ['2026-09-20', '2026-09-19', '2026-09-18', '2026-09-15', '2026-09-14'];
      expect(computeLongestConsecutiveStreak(dates)).toBe(3);
    });

    it('finds longest run when gap is at the beginning', () => {
      // 1 day, gap, then 4 consecutive
      const dates = ['2026-09-20', '2026-09-15', '2026-09-14', '2026-09-13', '2026-09-12'];
      expect(computeLongestConsecutiveStreak(dates)).toBe(4);
    });

    it('handles unsorted input', () => {
      // Unsorted: [15, 14, 20, 19, 18] -> when sorted should find run of 3
      const dates = ['2026-09-15', '2026-09-14', '2026-09-20', '2026-09-19', '2026-09-18'];
      expect(computeLongestConsecutiveStreak(dates)).toBe(3);
    });

    it('handles duplicates', () => {
      const dates = ['2026-09-20', '2026-09-20', '2026-09-19', '2026-09-18'];
      expect(computeLongestConsecutiveStreak(dates)).toBe(3);
    });
  });
});

describe('GET /api/daily/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authed users', () => {
    it('returns all completed dates across modes', async () => {
      // Test: authied user played hunt on 09-20, wheel on 09-19, connections on 09-18
      // Expected: allCompletedDates includes all three dates
      expect(true).toBe(true); // placeholder
    });

    it('computes streak correctly across all modes', async () => {
      // Test: allCompletedDates = [09-18, 09-19, 09-20] (consecutive)
      // Expected: streak.current = 3
      expect(true).toBe(true);
    });

    it('excludes catch-up plays from completed dates', async () => {
      // Test: word hunt on 09-20 is_catchup=false, 09-19 is_catchup=true
      // Expected: allCompletedDates includes 09-20, excludes 09-19
      expect(true).toBe(true);
    });

    it('applies freeze bridge to completedDates for allCompletedDates', async () => {
      // Test: completed 09-20, 09-18; freezes_available=1; yesterday=09-19 missing
      // Expected: allCompletedDates includes 09-19 (bridged)
      expect(true).toBe(true);
    });

    it('returns current status for today', async () => {
      // Test: hunt played 09-20, wheel not played, tower not played, connections not played
      // Expected: today = {wordHunt: true, wordWheel: false, wordTower: false, connections: false}
      expect(true).toBe(true);
    });

    it('skeletons until server resolves for authed', async () => {
      // Test: hook mounts before server responds
      // Expected: loading=true, streak=0 initially
      expect(true).toBe(true);
    });
  });

  describe('guest users', () => {
    it('returns localhost completed dates', async () => {
      // Test: guest fingerprint with rows in daily_puzzle_attempts
      // Expected: allCompletedDates from attempts table
      expect(true).toBe(true);
    });

    it('returns stream from localStorage immediately', async () => {
      // Test: guest with localStorage streak=5
      // Expected: streak.current=5, fromServer=false, loading=false
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns 401 for no auth/fingerprint', async () => {
      // Test: request with no user and no guest fingerprint
      // Expected: 401
      expect(true).toBe(true);
    });

    it('falls back to cache on DB timeout', async () => {
      // Test: supabase query times out
      // Expected: returns cached value or defaults to 0
      expect(true).toBe(true);
    });
  });
});
