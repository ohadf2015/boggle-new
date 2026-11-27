/**
 * Tests for optimized stats routes using RPC + caching
 */

const { mockRpc, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  const mockSupabase = { rpc: mockRpc, from: mockFrom };
  return { mockRpc, mockFrom, mockSupabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

// Mock Redis cache — always miss so we test the fetch logic
vi.mock('../../../redis/connection', () => ({
  getRedisClient: () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  }),
  isRedisAvailable: () => true,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { fetchDashboardStats } from '../statsService';

describe('statsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call all 4 RPCs in parallel', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { totalPlayers: 100, totalGames: 500, totalWords: 5000, totalGameTimeHours: 42.5 }, error: null })
      .mockResolvedValueOnce({ data: { gamesToday: 10, uniquePlayersToday: 8, uniquePlayersWeek: 30, uniquePlayersMonth: 60, signupsToday: 3, signupsWeek: 15 }, error: null })
      .mockResolvedValueOnce({ data: { en: 300, he: 100, sv: 50, ja: 50 }, error: null })
      .mockResolvedValueOnce({ data: { total: 5678, today: 44, week: 469 }, error: null });

    const result = await fetchDashboardStats(mockSupabase as never);

    expect(mockRpc).toHaveBeenCalledTimes(4);
    expect(mockRpc).toHaveBeenCalledWith('admin_overview_stats');
    expect(mockRpc).toHaveBeenCalledWith('admin_activity_stats', { p_tz: 'UTC' });
    expect(mockRpc).toHaveBeenCalledWith('admin_language_breakdown');
    expect(mockRpc).toHaveBeenCalledWith('admin_real_games_stats', { p_tz: 'UTC' });
    expect(result.overview.totalPlayers).toBe(100);
    expect(result.activity.gamesToday).toBe(10);
    expect(result.languages).toEqual({ en: 300, he: 100, sv: 50, ja: 50 });
    expect(result.realGames).toEqual({ total: 5678, today: 44, week: 469 });
  });

  it('passes the viewer timezone into the day-bucketed RPCs', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null });
    await fetchDashboardStats(mockSupabase as never, 'Asia/Jerusalem');
    expect(mockRpc).toHaveBeenCalledWith('admin_activity_stats', { p_tz: 'Asia/Jerusalem' });
    expect(mockRpc).toHaveBeenCalledWith('admin_real_games_stats', { p_tz: 'Asia/Jerusalem' });
  });

  it('should handle RPC errors gracefully', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC not found' } });

    const result = await fetchDashboardStats(mockSupabase as never);

    // Should return zeroed defaults, not throw
    expect(result.overview.totalPlayers).toBe(0);
    expect(result.activity.gamesToday).toBe(0);
    expect(result.languages).toEqual({});
    // No false zero for real games: the card hides until the RPC exists.
    expect(result.realGames).toBeUndefined();
  });
});
