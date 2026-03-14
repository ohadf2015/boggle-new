/**
 * Tests for analytics routes (retention, churn risk, engagement funnel)
 */

const mockRpc = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockLt = jest.fn().mockReturnThis();
const mockNot = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockRange = jest.fn().mockResolvedValue({ data: [], count: 0, error: null });
const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  eq: mockEq,
  lt: mockLt,
  not: mockNot,
  order: mockOrder,
  range: mockRange,
});
const mockSupabase = { rpc: mockRpc, from: mockFrom };

jest.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

jest.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  }),
  isRedisAvailable: () => true,
}));

import {
  fetchCohortRetention,
  fetchChurnRisk,
  fetchEngagementFunnel,
} from '../analyticsRoutes';

describe('analyticsRoutes', () => {
  beforeEach(() => jest.clearAllMocks());

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
});
