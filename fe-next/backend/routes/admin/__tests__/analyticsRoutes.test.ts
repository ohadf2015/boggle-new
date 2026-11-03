/**
 * Tests for analytics routes (retention, churn risk, engagement funnel)
 */

const { mockRpc, mockSelect, mockEq, mockLt, mockNot, mockOrder, mockRange, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockLt = vi.fn().mockReturnThis();
  const mockNot = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockRange = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    eq: mockEq,
    lt: mockLt,
    not: mockNot,
    order: mockOrder,
    range: mockRange,
  });
  const mockSupabase = { rpc: mockRpc, from: mockFrom };
  return { mockRpc, mockSelect, mockEq, mockLt, mockNot, mockOrder, mockRange, mockFrom, mockSupabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  isRedisAvailable: () => true,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  fetchCohortRetention,
  fetchChurnRisk,
  fetchEngagementFunnel,
  fetchSignupGrowth,
  fetchRevenueSummary,
  fetchDrilldown,
} from '../analyticsRoutes';

describe('analyticsRoutes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('fetchCohortRetention', () => {
    it('should call admin_cohort_retention RPC with weeks param', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { cohort_week: '2026-03-01', week_offset: 0, retained: 100, cohort_size: 100, retention_pct: 100 },
          { cohort_week: '2026-03-01', week_offset: 1, retained: 40, cohort_size: 100, retention_pct: 40 },
        ],
        error: null,
      });

      const result = await fetchCohortRetention(mockSupabase as never, 8);

      expect(mockRpc).toHaveBeenCalledWith('admin_cohort_retention', { weeks: 8 });
      expect(result).toHaveLength(2);
      expect(result[0].retention_pct).toBe(100);
      expect(result[1].retention_pct).toBe(40);
    });

    it('should return empty array on RPC error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'not found' } });

      const result = await fetchCohortRetention(mockSupabase as never, 12);
      expect(result).toEqual([]);
    });
  });

  describe('fetchChurnRisk', () => {
    it('should query profiles by last_game_at cutoff', async () => {
      mockRange.mockResolvedValue({
        data: [{ id: '1', username: 'alice', last_game_at: '2026-03-01' }],
        count: 1,
        error: null,
      });

      const result = await fetchChurnRisk(mockSupabase as never, 14, 50, 0);

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(result.players).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('fetchEngagementFunnel', () => {
    it('should call admin_engagement_funnel RPC', async () => {
      mockRpc.mockResolvedValue({
        data: { registered: 500, playedFirstGame: 350, returnedDay7: 120, returnedDay30: 50 },
        error: null,
      });

      const result = await fetchEngagementFunnel(mockSupabase as never);

      expect(mockRpc).toHaveBeenCalledWith('admin_engagement_funnel');
      expect(result.registered).toBe(500);
      expect(result.playedFirstGame).toBe(350);
    });

    it('should return zeroed defaults on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const result = await fetchEngagementFunnel(mockSupabase as never);
      expect(result.registered).toBe(0);
    });
  });

  describe('fetchSignupGrowth', () => {
    it('calls admin_signup_growth with the week window', async () => {
      mockRpc.mockResolvedValue({ data: [{ week: '2026-11-02', signups: 15, total: 905 }], error: null });
      const result = await fetchSignupGrowth(mockSupabase as never, 26);
      expect(mockRpc).toHaveBeenCalledWith('admin_signup_growth', { weeks: 26 });
      expect(result[0].total).toBe(905);
    });

    it('returns an empty list on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
      expect(await fetchSignupGrowth(mockSupabase as never, 26)).toEqual([]);
    });
  });

  describe('fetchRevenueSummary', () => {
    it('calls admin_revenue_summary', async () => {
      mockRpc.mockResolvedValue({ data: { paying: 1 }, error: null });
      expect(await fetchRevenueSummary(mockSupabase as never)).toEqual({ paying: 1 });
      expect(mockRpc).toHaveBeenCalledWith('admin_revenue_summary');
    });

    it('returns an empty object on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
      expect(await fetchRevenueSummary(mockSupabase as never)).toEqual({});
    });
  });

  describe('fetchDrilldown', () => {
    it('passes kind and week to admin_drilldown', async () => {
      mockRpc.mockResolvedValue({ data: [{ id: 'u1' }], error: null });
      expect(await fetchDrilldown(mockSupabase as never, 'signups', '2026-11-02')).toEqual([{ id: 'u1' }]);
      expect(mockRpc).toHaveBeenCalledWith('admin_drilldown', { kind: 'signups', week: '2026-11-02' });
    });

    it('returns an empty list on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });
      expect(await fetchDrilldown(mockSupabase as never, 'payers', null)).toEqual([]);
    });
  });
});
