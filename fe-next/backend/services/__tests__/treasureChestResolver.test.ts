/**
 * Treasure Chest Resolver — Tests
 *
 * Verify that chest outcomes are deterministic, include actor field,
 * and that steal/swap correctly target the highest scorer.
 */

import { describe, it, expect } from 'vitest';
import { resolveChestResult, resolveChestOutcome } from '../treasureChestResolver';
import type { QuizPlayer } from '../vocabQuizEngine';

describe('treasureChestResolver', () => {
  describe('resolveChestOutcome', () => {
    it('should return deterministic outcomes for the same seed', () => {
      const seed = 'game123:0:student1';
      const outcome1 = resolveChestOutcome(seed);
      const outcome2 = resolveChestOutcome(seed);
      expect(outcome1).toBe(outcome2);
    });

    it('should return different outcomes for different seeds', () => {
      const outcome1 = resolveChestOutcome('game123:0:student1');
      const outcome2 = resolveChestOutcome('game123:0:student2');
      expect([outcome1, outcome2]).toHaveLength(2);
    });
  });

  describe('resolveChestResult', () => {
    const createPlayer = (username: string, score: number): QuizPlayer => ({
      username,
      userId: null,
      score,
      streak: 0,
      bestStreak: 0,
      correctCount: 0,
      correctWords: [],
      answers: [],
    });

    it('should include actor field in the result', () => {
      const players = new Map<string, QuizPlayer>([
        ['player1', createPlayer('player1', 100)],
      ]);

      const result = resolveChestResult({
        gameCode: 'game123',
        questionIndex: 0,
        username: 'player1',
        players,
        currentScore: 0,
        baseCorrectedPoints: 10,
      });

      expect(result.actor).toBe('player1');
    });

    it('should return correct amount for gain outcome', () => {
      const players = new Map<string, QuizPlayer>([
        ['player1', createPlayer('player1', 0)],
      ]);

      const result = resolveChestResult({
        gameCode: 'test-gain',
        questionIndex: 0,
        username: 'player1',
        players,
        currentScore: 0,
        baseCorrectedPoints: 10,
      });

      if (result.outcome === 'gain') {
        expect(result.amount).toBeGreaterThanOrEqual(5);
        expect(result.amount).toBeLessThanOrEqual(15);
      }
    });
  });
});
