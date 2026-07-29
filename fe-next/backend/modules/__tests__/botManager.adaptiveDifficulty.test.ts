/**
 * Bot Manager Adaptive Difficulty Integration Tests
 *
 * Tests adaptive difficulty integration with bot creation
 * TDD RED phase - test before implementation
 */

import { vi, type Mock } from 'vitest';

// Mock logger to suppress output
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

const { mockGetRecentGames, mockCalculatePlayerLevel, mockSelectBotDifficulty } = vi.hoisted(() => ({
  mockGetRecentGames: vi.fn(),
  mockCalculatePlayerLevel: vi.fn(),
  mockSelectBotDifficulty: vi.fn(),
}));

vi.mock('../../services/playerGameHistory', () => ({
  getRecentGames: mockGetRecentGames,
}));

vi.mock('../../services/adaptiveDifficulty', () => ({
  calculatePlayerLevel: mockCalculatePlayerLevel,
  selectBotDifficulty: mockSelectBotDifficulty,
}));

import { addBotWithAdaptiveDifficulty } from '../botManager';

describe('botManager - Adaptive Difficulty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addBotWithAdaptiveDifficulty', () => {
    it('should create easy bot for beginner players', async () => {
      // GIVEN - Beginner player (20% win rate)
      const gameCode = 'TEST123';
      const userId = 'user-beginner';
      const recentGames = [
        { placement: 1, score: 100, wordCount: 10 }, // Win
        { placement: 1, score: 95, wordCount: 9 },  // Win
        ...Array(8).fill({ placement: 2, score: 50, wordCount: 5 }), // Losses
      ];

      mockGetRecentGames.mockResolvedValue(recentGames);
      mockCalculatePlayerLevel.mockResolvedValue('beginner');
      mockSelectBotDifficulty.mockReturnValue('easy');

      // WHEN
      const bot = await addBotWithAdaptiveDifficulty(gameCode, userId);

      // THEN - Bot should have easy difficulty
      expect(bot.difficulty).toBe('easy');
      expect(mockGetRecentGames).toHaveBeenCalledWith(userId);
      expect(mockCalculatePlayerLevel).toHaveBeenCalledWith(recentGames);
      expect(mockSelectBotDifficulty).toHaveBeenCalledWith('beginner');
    });

    it('should create medium bot for intermediate players', async () => {
      // GIVEN - Intermediate player (50% win rate)
      const gameCode = 'TEST456';
      const userId = 'user-intermediate';
      const recentGames = [
        ...Array(5).fill({ placement: 1, score: 100, wordCount: 10 }), // Wins
        ...Array(5).fill({ placement: 2, score: 50, wordCount: 5 }),   // Losses
      ];

      mockGetRecentGames.mockResolvedValue(recentGames);
      mockCalculatePlayerLevel.mockResolvedValue('intermediate');
      mockSelectBotDifficulty.mockReturnValue('medium');

      // WHEN
      const bot = await addBotWithAdaptiveDifficulty(gameCode, userId);

      // THEN - Bot should have medium difficulty
      expect(bot.difficulty).toBe('medium');
    });

    it('should create hard bot for advanced players', async () => {
      // GIVEN - Advanced player (80% win rate)
      const gameCode = 'TEST789';
      const userId = 'user-advanced';
      const recentGames = [
        ...Array(8).fill({ placement: 1, score: 100, wordCount: 10 }), // Wins
        ...Array(2).fill({ placement: 2, score: 50, wordCount: 5 }),   // Losses
      ];

      mockGetRecentGames.mockResolvedValue(recentGames);
      mockCalculatePlayerLevel.mockResolvedValue('advanced');
      mockSelectBotDifficulty.mockReturnValue('hard');

      // WHEN
      const bot = await addBotWithAdaptiveDifficulty(gameCode, userId);

      // THEN - Bot should have hard difficulty
      expect(bot.difficulty).toBe('hard');
    });

    it('should default to medium bot for new players with no game history', async () => {
      // GIVEN - New player with no games
      const gameCode = 'TEST000';
      const userId = 'user-new';

      mockGetRecentGames.mockResolvedValue([]);
      mockCalculatePlayerLevel.mockResolvedValue('beginner');
      mockSelectBotDifficulty.mockReturnValue('easy');

      // WHEN
      const bot = await addBotWithAdaptiveDifficulty(gameCode, userId);

      // THEN - Should default to easy for beginners
      expect(bot.difficulty).toBe('easy');
    });

    it('should respect manually specified difficulty when no userId provided', async () => {
      // GIVEN - No userId (manual difficulty selection)
      const gameCode = 'TEST111';
      const manualDifficulty = 'hard';

      // WHEN
      const bot = await addBotWithAdaptiveDifficulty(gameCode, undefined, manualDifficulty);

      // THEN - Should use manual difficulty, no adaptive logic called
      expect(bot.difficulty).toBe(manualDifficulty);
      expect(mockGetRecentGames).not.toHaveBeenCalled();
      expect(mockCalculatePlayerLevel).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and default to medium difficulty', async () => {
      // GIVEN - Error fetching game history
      const gameCode = 'TEST222';
      const userId = 'user-error';

      mockGetRecentGames.mockRejectedValue(new Error('Database error'));

      // WHEN
      const bot = await addBotWithAdaptiveDifficulty(gameCode, userId);

      // THEN - Should fall back to medium difficulty
      expect(bot.difficulty).toBe('medium');
    });
  });
});
