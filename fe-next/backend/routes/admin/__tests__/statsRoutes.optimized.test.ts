/**
 * Tests for optimized stats routes using RPC + caching
 */

const mockRpc = jest.fn();
const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
});
const mockSupabase = { rpc: mockRpc, from: mockFrom };

jest.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

// Mock Redis cache — always miss so we test the fetch logic
jest.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  }),
  isRedisAvailable: () => true,
}));

import { fetchDashboardStats } from '../statsService';

describe('statsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call all 3 RPCs in parallel', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { totalPlayers: 100, totalGames: 500, totalWords: 5000, totalGameTimeHours: 42.5 }, error: null })
      .mockResolvedValueOnce({ data: { gamesToday: 10, uniquePlayersToday: 8, uniquePlayersWeek: 30, uniquePlayersMonth: 60, signupsToday: 3, signupsWeek: 15 }, error: null })
      .mockResolvedValueOnce({ data: { en: 300, he: 100, sv: 50, ja: 50 }, error: null });

    const result = await fetchDashboardStats(mockSupabase as never);

    expect(mockRpc).toHaveBeenCalledTimes(3);
    expect(mockRpc).toHaveBeenCalledWith('admin_overview_stats');
    expect(mockRpc).toHaveBeenCalledWith('admin_activity_stats');
    expect(mockRpc).toHaveBeenCalledWith('admin_language_breakdown');
    expect(result.overview.totalPlayers).toBe(100);
    expect(result.activity.gamesToday).toBe(10);
    expect(result.languages).toEqual({ en: 300, he: 100, sv: 50, ja: 50 });
  });

  it('should handle RPC errors gracefully', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } });

    const result = await fetchDashboardStats(mockSupabase as never);

    // Should return zeroed defaults, not throw
    expect(result.overview.totalPlayers).toBe(0);
    expect(result.activity.gamesToday).toBe(0);
    expect(result.languages).toEqual({});
  });
});
