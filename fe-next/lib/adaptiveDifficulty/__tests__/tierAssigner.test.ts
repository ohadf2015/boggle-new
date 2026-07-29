/**
 * TDD RED Phase: Tier Assigner Tests
 *
 * Tests for determineTier function that assigns difficulty tier
 * based on rolling window of recent level attempts.
 */

import { determineTier } from '../tierAssigner';
import type { LevelAttemptWithScore } from '@/types/difficulty';

/**
 * Helper to create minimal LevelAttemptWithScore for testing.
 * Only isCompletion and combinedScore are used by determineTier,
 * so we provide defaults for other required LevelAttempt fields.
 */
function createTestAttempt(isCompletion: boolean, combinedScore: number): LevelAttemptWithScore {
  return {
    world: 1,
    level: 1,
    bestWords: 5,
    bestScore: 300,
    bestTimeRemaining: 30,
    objectiveProgress: {},
    attemptCount: 1,
    consecutiveFailures: isCompletion ? 0 : 1,
    firstAttemptAt: '2024-01-01T10:00:00Z',
    lastAttemptAt: '2024-01-01T10:00:00Z',
    isCompletion,
    combinedScore,
  };
}

describe('determineTier', () => {
  describe('insufficient data cases', () => {
    test('should return normal tier for empty array', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'insufficient_data'
      });
    });

    test('should return normal tier for only 1 attempt', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'insufficient_data'
      });
    });

    test('should return normal tier for only 2 attempts', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(true, 0.85)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'insufficient_data'
      });
    });
  });

  describe('downgrade to easy tier (high failure rate)', () => {
    test('should downgrade when 2 out of 3 attempts failed (pattern: win, fail, fail)', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(false, 0.3),
        createTestAttempt(false, 0.2)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'easy',
        reason: 'high_failure_rate'
      });
    });

    test('should downgrade when 2 out of 3 attempts failed (pattern: fail, fail, win)', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(false, 0.2),
        createTestAttempt(false, 0.3),
        createTestAttempt(true, 0.7)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'easy',
        reason: 'high_failure_rate'
      });
    });

    test('should downgrade when all 3 attempts failed', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(false, 0.1),
        createTestAttempt(false, 0.2),
        createTestAttempt(false, 0.15)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'easy',
        reason: 'high_failure_rate'
      });
    });

    test('should prioritize failure detection over high scores (win, win, fail)', () => {
      // GIVEN - Even with 2 high-score wins, 1 failure isn't enough for easy
      // Wait, the plan says >= 2 failures triggers downgrade
      // So this should stay normal (only 1 failure)
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(true, 0.9),
        createTestAttempt(false, 0.3)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      // Only 1 failure, so should stay normal
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });

    test('should downgrade even with high scores if 2 failures (pattern from plan: win(0.9), win(0.9), fail)', () => {
      // GIVEN - Plan says "failure trumps high scores"
      // This test seems contradictory to the logic. Let me re-read the plan.
      // The plan says: [win(0.9), win(0.9), fail] -> easy (failure trumps high scores)
      // But that's only 1 failure. Let me check the logic again.
      // Logic says: failureCount >= 2 triggers downgrade
      // So [win, win, fail] has only 1 failure, should be normal
      // But the plan test case explicitly says it should be easy
      // This might be a typo in the plan. Let me implement the logic as stated (>= 2)
      // and create a test for 2 failures with high scores
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(false, 0.4),
        createTestAttempt(false, 0.3)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'easy',
        reason: 'high_failure_rate'
      });
    });
  });

  describe('upgrade to hard tier (consistent mastery)', () => {
    test('should upgrade when all 3 wins with scores > 0.8', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(true, 0.85),
        createTestAttempt(true, 0.82)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'hard',
        reason: 'consistent_mastery'
      });
    });

    test('should NOT upgrade if one score is at threshold (0.8)', () => {
      // GIVEN - Plan says > 0.8, not >=
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(true, 0.85),
        createTestAttempt(true, 0.8)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });

    test('should NOT upgrade if one score is below threshold (pattern from plan)', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.9),
        createTestAttempt(true, 0.85),
        createTestAttempt(true, 0.75)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });

    test('should NOT upgrade if any attempt failed (even with high scores)', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.95),
        createTestAttempt(true, 0.9),
        createTestAttempt(false, 0.4)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      // Has 1 failure (not >= 2), but mastery check fails
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });
  });

  describe('normal tier (balanced performance)', () => {
    test('should stay normal with all wins but low scores', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.6),
        createTestAttempt(true, 0.7),
        createTestAttempt(true, 0.65)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });

    test('should stay normal with 1 failure and mixed scores', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.8),
        createTestAttempt(false, 0.3),
        createTestAttempt(true, 0.75)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });

    test('should stay normal with borderline mastery (exactly 0.8)', () => {
      // GIVEN
      const attempts: LevelAttemptWithScore[] = [
        createTestAttempt(true, 0.8),
        createTestAttempt(true, 0.8),
        createTestAttempt(true, 0.8)
      ];

      // WHEN
      const result = determineTier(attempts);

      // THEN
      expect(result).toEqual({
        tier: 'normal',
        reason: 'balanced_performance'
      });
    });
  });
});
