/**
 * Player Game History Service Tests
 *
 * Tests fetching recent game results for adaptive difficulty
 * TDD RED phase - test before implementation
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { getRecentGames } from '../playerGameHistory';
import { getSupabase } from '../../modules/supabase';

// Mock Supabase
vi.mock('../../modules/supabase', () => ({
  getSupabase: vi.fn(),
}));

describe('playerGameHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecentGames', () => {
    it('should fetch last 10 games for a user', async () => {
      // GIVEN - User with 10 recent games
      const userId = 'user-123';
      const mockGames = Array(10)
        .fill(null)
        .map((_, i) => ({
          placement: i < 5 ? 1 : 2, // 5 wins, 5 losses
          score: 100 - i * 10,
          word_count: 10 - i,
          created_at: new Date(Date.now() - i * 1000000).toISOString(),
        }));

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockGames,
                error: null,
              }),
            }),
          }),
        }),
      });

      (getSupabase as Mock).mockReturnValue({
        from: mockFrom,
      });

      // WHEN
      const result = await getRecentGames(userId);

      // THEN - Should return formatted game results
      expect(result).toHaveLength(10);
      expect(result[0]).toEqual({
        placement: 1,
        score: 100,
        wordCount: 10,
      });
      expect(mockFrom).toHaveBeenCalledWith('game_results');
    });

    it('should return empty array if user has no games', async () => {
      // GIVEN - User with no games
      const userId = 'user-456';

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      (getSupabase as Mock).mockReturnValue({
        from: mockFrom,
      });

      // WHEN
      const result = await getRecentGames(userId);

      // THEN
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // GIVEN - Database error
      const userId = 'user-789';

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      (getSupabase as Mock).mockReturnValue({
        from: mockFrom,
      });

      // WHEN
      const result = await getRecentGames(userId);

      // THEN - Should return empty array on error (default to beginner)
      expect(result).toEqual([]);
    });

    it('should return games with fewer than 10 if user has played less', async () => {
      // GIVEN - User with only 3 games
      const userId = 'user-new';
      const mockGames = [
        { placement: 1, score: 100, word_count: 10, created_at: new Date().toISOString() },
        { placement: 2, score: 80, word_count: 8, created_at: new Date().toISOString() },
        { placement: 1, score: 90, word_count: 9, created_at: new Date().toISOString() },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockGames,
                error: null,
              }),
            }),
          }),
        }),
      });

      (getSupabase as Mock).mockReturnValue({
        from: mockFrom,
      });

      // WHEN
      const result = await getRecentGames(userId);

      // THEN
      expect(result).toHaveLength(3);
    });
  });
});
