/**
 * Tests for moderation routes (ban, suspend, investigate, queue)
 */

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
const mockSelectChain = {
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  single: jest.fn().mockResolvedValue({ data: { id: '1', username: 'alice' }, error: null }),
  range: jest.fn().mockResolvedValue({ data: [], count: 0, error: null }),
  in: jest.fn().mockReturnThis(),
};
const mockSelect = jest.fn().mockReturnValue(mockSelectChain);
const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
});
const mockSupabase = { from: mockFrom };

jest.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

jest.mock('../../../redis/connection', () => ({
  getRedisClient: () => null,
  isRedisAvailable: () => false,
}));

import {
  fetchPlayerInvestigation,
  fetchModerationQueue,
} from '../moderationRoutes';

describe('moderationRoutes', () => {
  beforeEach(() => jest.clearAllMocks());

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
