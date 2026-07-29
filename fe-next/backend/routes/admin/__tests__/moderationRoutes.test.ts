/**
 * Tests for moderation routes (ban, suspend, investigate, queue)
 */

const { mockInsert, mockUpdate, mockSelectChain, mockSelect, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const mockSelectChain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: '1', username: 'alice' }, error: null }),
    range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
    in: vi.fn().mockReturnThis(),
  };
  const mockSelect = vi.fn().mockReturnValue(mockSelectChain);
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  });
  const mockSupabase = { from: mockFrom };
  return { mockInsert, mockUpdate, mockSelectChain, mockSelect, mockFrom, mockSupabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock('../../../redis/connection', () => ({
  getRedisClient: () => null,
  isRedisAvailable: () => false,
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  fetchPlayerInvestigation,
  fetchModerationQueue,
} from '../moderationRoutes';

describe('moderationRoutes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('fetchPlayerInvestigation', () => {
    it('should query profile, games, and moderation history in parallel', async () => {
      const result = await fetchPlayerInvestigation(mockSupabase as never, 'player-1');

      // Should call from() for profiles, game_results, moderation_actions
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockFrom).toHaveBeenCalledWith('game_results');
      expect(mockFrom).toHaveBeenCalledWith('moderation_actions');
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('recentGames');
      expect(result).toHaveProperty('moderationHistory');
    });
  });

  describe('fetchModerationQueue', () => {
    it('should query invalid_word_submissions for pending items', async () => {
      mockSelectChain.range.mockResolvedValue({
        data: [{ id: '1', word: 'xyz', status: 'pending' }],
        count: 1,
        error: null,
      });

      const result = await fetchModerationQueue(mockSupabase as never, 50, 0);

      expect(mockFrom).toHaveBeenCalledWith('invalid_word_submissions');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items).toHaveLength(1);
    });
  });
});
