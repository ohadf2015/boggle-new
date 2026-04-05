/**
 * Tests for SERP API budget monitoring and cache fallback logic
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { getMonthlyApiCallCount, getRemainingMonthlyBudget } from '../serpApiClient';

// Mock Supabase - chain: from().select().gte()
const { mockGte, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockGte = vi.fn();
  const mockSelect = vi.fn(() => ({ gte: mockGte }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockGte, mockSelect, mockFrom };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock Redis
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => null),
}));

describe('SERP API Budget Monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SERP_MONTHLY_BUDGET;
  });

  describe('getMonthlyApiCallCount', () => {
    test('should return count from serp_api_logs for current month', async () => {
      // GIVEN: Database returns a count of 42 API calls this month
      mockGte.mockResolvedValue({ count: 42, error: null });

      // WHEN
      const count = await getMonthlyApiCallCount();

      // THEN
      expect(count).toBe(42);
      expect(mockFrom).toHaveBeenCalledWith('serp_api_logs');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });

    test('should return 0 when count is null', async () => {
      // GIVEN
      mockGte.mockResolvedValue({ count: null, error: null });

      // WHEN
      const count = await getMonthlyApiCallCount();

      // THEN
      expect(count).toBe(0);
    });

    test('should return 0 on database error', async () => {
      // GIVEN: Database query fails
      mockGte.mockResolvedValue({ count: null, error: { message: 'Connection failed' } });

      // WHEN
      const count = await getMonthlyApiCallCount();

      // THEN
      expect(count).toBe(0);
    });

    test('should return 0 when supabase throws exception', async () => {
      // GIVEN
      mockGte.mockRejectedValue(new Error('Network error'));

      // WHEN
      const count = await getMonthlyApiCallCount();

      // THEN
      expect(count).toBe(0);
    });
  });

  describe('getRemainingMonthlyBudget', () => {
    test('should return remaining budget based on SERP_MONTHLY_BUDGET env var', async () => {
      // GIVEN: Budget is 100, used 42
      process.env.SERP_MONTHLY_BUDGET = '100';
      mockGte.mockResolvedValue({ count: 42, error: null });

      // WHEN
      const remaining = await getRemainingMonthlyBudget();

      // THEN
      expect(remaining).toBe(58);
    });

    test('should default to 100 when SERP_MONTHLY_BUDGET not set', async () => {
      // GIVEN: No env var, used 30
      mockGte.mockResolvedValue({ count: 30, error: null });

      // WHEN
      const remaining = await getRemainingMonthlyBudget();

      // THEN: 100 (default) - 30 = 70
      expect(remaining).toBe(70);
    });

    test('should return 0 when budget is exceeded', async () => {
      // GIVEN: Budget 100, used 120
      process.env.SERP_MONTHLY_BUDGET = '100';
      mockGte.mockResolvedValue({ count: 120, error: null });

      // WHEN
      const remaining = await getRemainingMonthlyBudget();

      // THEN
      expect(remaining).toBe(0);
    });
  });
});
