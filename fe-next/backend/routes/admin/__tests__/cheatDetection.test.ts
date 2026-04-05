/**
 * Tests for cheat detection routes
 */

const { mockSelectChain, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockSelectChain = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  };
  const mockFrom = vi.fn().mockReturnValue(mockSelectChain);
  const mockSupabase = { from: mockFrom };
  return { mockSelectChain, mockFrom, mockSupabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock('../../../redis/connection', () => ({
  getRedisClient: () => null,
  isRedisAvailable: () => false,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { fetchFlaggedPlayers } from '../cheatDetectionRoutes';

describe('cheatDetection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should query mv_cheat_signals above threshold', async () => {
    mockSelectChain.range.mockResolvedValue({
      data: [
        { player_id: '1', avg_score: 200, max_score: 500, score_zscore: 4.2, games_played: 20 },
      ],
      count: 1,
      error: null,
    });

    const result = await fetchFlaggedPlayers(mockSupabase as never, 3.0, 50, 0);

    expect(mockFrom).toHaveBeenCalledWith('mv_cheat_signals');
    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0].score_zscore).toBe(4.2);
    expect(result.pagination.total).toBe(1);
  });

  it('should return empty on error', async () => {
    mockSelectChain.range.mockResolvedValue({ data: null, count: 0, error: { message: 'fail' } });

    const result = await fetchFlaggedPlayers(mockSupabase as never, 3.0, 50, 0);
    expect(result.flagged).toEqual([]);
  });
});
