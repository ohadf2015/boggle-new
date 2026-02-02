/**
 * Adaptive Difficulty Service Tests
 *
 * Tests bot difficulty calculation based on player performance
 * TDD RED phase - test before implementation
 */

import { calculatePlayerLevel, selectBotDifficulty } from '../adaptiveDifficulty';
import type { BotDifficulty } from '@/shared/schemas/socketSchemas';

describe('adaptiveDifficulty', () => {
  describe('calculatePlayerLevel', () => {
    it('should return "beginner" for users with 0% win rate', async () => {
      // GIVEN - User has played 10 games, won 0
      const recentGames = Array(10).fill(null).map(() => ({
        placement: 2, // Always lost (2nd place in 2-player game)
        score: 50,
        wordCount: 5,
      }));

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN
      expect(level).toBe('beginner');
    });

    it('should return "beginner" for users with 30% win rate', async () => {
      // GIVEN - User has played 10 games, won 3
      const recentGames = [
        { placement: 1, score: 100, wordCount: 10 }, // Win
        { placement: 1, score: 95, wordCount: 9 },  // Win
        { placement: 1, score: 90, wordCount: 8 },  // Win
        ...Array(7).fill(null).map(() => ({ placement: 2, score: 50, wordCount: 5 })), // Losses
      ];

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN
      expect(level).toBe('beginner');
    });

    it('should return "intermediate" for users with 50% win rate', async () => {
      // GIVEN - User has played 10 games, won 5
      const recentGames = [
        ...Array(5).fill(null).map(() => ({ placement: 1, score: 100, wordCount: 10 })), // Wins
        ...Array(5).fill(null).map(() => ({ placement: 2, score: 50, wordCount: 5 })),   // Losses
      ];

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN
      expect(level).toBe('intermediate');
    });

    it('should return "intermediate" for users with 70% win rate', async () => {
      // GIVEN - User has played 10 games, won 7
      const recentGames = [
        ...Array(7).fill(null).map(() => ({ placement: 1, score: 100, wordCount: 10 })), // Wins
        ...Array(3).fill(null).map(() => ({ placement: 2, score: 50, wordCount: 5 })),   // Losses
      ];

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN
      expect(level).toBe('intermediate');
    });

    it('should return "advanced" for users with 80% win rate', async () => {
      // GIVEN - User has played 10 games, won 8
      const recentGames = [
        ...Array(8).fill(null).map(() => ({ placement: 1, score: 100, wordCount: 10 })), // Wins
        ...Array(2).fill(null).map(() => ({ placement: 2, score: 50, wordCount: 5 })),   // Losses
      ];

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN
      expect(level).toBe('advanced');
    });

    it('should return "advanced" for users with 100% win rate', async () => {
      // GIVEN - User has played 10 games, won all
      const recentGames = Array(10).fill(null).map(() => ({
        placement: 1,
        score: 100,
        wordCount: 10,
      }));

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN
      expect(level).toBe('advanced');
    });

    it('should handle users with fewer than 10 games', async () => {
      // GIVEN - User has only played 3 games, won 2
      const recentGames = [
        { placement: 1, score: 100, wordCount: 10 },
        { placement: 1, score: 95, wordCount: 9 },
        { placement: 2, score: 50, wordCount: 5 },
      ];

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN - Should still calculate correctly
      expect(level).toBe('intermediate'); // 66.7% win rate
    });

    it('should return "beginner" for users with no games', async () => {
      // GIVEN - User has no games
      const recentGames: any[] = [];

      // WHEN
      const level = await calculatePlayerLevel(recentGames);

      // THEN - Default to beginner
      expect(level).toBe('beginner');
    });
  });

  describe('selectBotDifficulty', () => {
    it('should return "easy" for beginner players', () => {
      // GIVEN
      const playerLevel = 'beginner';

      // WHEN
      const difficulty = selectBotDifficulty(playerLevel);

      // THEN
      expect(difficulty).toBe('easy');
    });

    it('should return "medium" for intermediate players', () => {
      // GIVEN
      const playerLevel = 'intermediate';

      // WHEN
      const difficulty = selectBotDifficulty(playerLevel);

      // THEN
      expect(difficulty).toBe('medium');
    });

    it('should return "hard" for advanced players', () => {
      // GIVEN
      const playerLevel = 'advanced';

      // WHEN
      const difficulty = selectBotDifficulty(playerLevel);

      // THEN
      expect(difficulty).toBe('hard');
    });
  });
});
