/**
 * Tests for attemptsUsed validation in survival game results
 *
 * Bug: When a player wins via auto-win (all positions revealed through discoveries),
 * the attemptsUsed could be 0 if they never made a target-length guess.
 * This causes both saveWordHuntResult and useResultSubmission to reject the result,
 * resulting in no leaderboard entry.
 *
 * Fix: Ensure attemptsUsed is always at least 1 when the game is won.
 */

import type { TargetAttempt, SurvivalGameResult } from '../types';

/**
 * Simulates the attemptsUsed calculation from handleGameOver
 * This is extracted to make the bug testable without full hook setup
 */
function calculateAttemptsUsed(
  attempts: TargetAttempt[],
  won: boolean
): number {
  // Original buggy logic: only counts non-discovery attempts
  const targetAttemptsCount = attempts.filter((a) => !a.isDiscovery).length;
  return targetAttemptsCount;
}

/**
 * Fixed version that ensures minimum 1 attempt when won
 */
function calculateAttemptsUsedFixed(
  attempts: TargetAttempt[],
  won: boolean
): number {
  const targetAttemptsCount = attempts.filter((a) => !a.isDiscovery).length;
  // When won, ensure at least 1 attempt (the mental/auto-win counts as an attempt)
  return won ? Math.max(1, targetAttemptsCount) : targetAttemptsCount;
}

describe('attemptsUsed validation', () => {
  describe('BUG: auto-win with zero target attempts', () => {
    it('should have attemptsUsed >= 1 when player wins (even with no target guesses)', () => {
      // Scenario: Player discovers all letters through word discoveries
      // and never makes a target-length guess before auto-win triggers
      const discoveryOnlyAttempts: TargetAttempt[] = [
        {
          word: 'CAT',
          feedback: [
            { letter: 'C', position: 0, feedback: 'green' },
            { letter: 'A', position: 1, feedback: 'green' },
            { letter: 'T', position: 2, feedback: 'yellow' },
          ],
          timestamp: Date.now(),
          isDiscovery: true, // This is a discovery, not a target guess
        },
        {
          word: 'DOG',
          feedback: [
            { letter: 'D', position: 0, feedback: 'gray' },
            { letter: 'O', position: 1, feedback: 'yellow' },
            { letter: 'G', position: 2, feedback: 'gray' },
          ],
          timestamp: Date.now(),
          isDiscovery: true, // Also a discovery
        },
      ];

      const won = true;

      // BUG: Original calculation returns 0
      const buggyResult = calculateAttemptsUsed(discoveryOnlyAttempts, won);
      expect(buggyResult).toBe(0); // This is the bug!

      // FIX: Should return at least 1 when won
      const fixedResult = calculateAttemptsUsedFixed(discoveryOnlyAttempts, won);
      expect(fixedResult).toBeGreaterThanOrEqual(1);
    });

    it('should return 0 attemptsUsed when player loses with no target guesses', () => {
      // If player loses (life ran out) without any target guesses, 0 is valid
      const discoveryOnlyAttempts: TargetAttempt[] = [
        {
          word: 'CAT',
          feedback: [],
          timestamp: Date.now(),
          isDiscovery: true,
        },
      ];

      const won = false;

      // When lost, 0 is acceptable (player ran out of life without guessing)
      const result = calculateAttemptsUsedFixed(discoveryOnlyAttempts, won);
      expect(result).toBe(0);
    });

    it('should preserve actual attempt count when player made target guesses', () => {
      // Normal scenario: player made actual target-length guesses
      const mixedAttempts: TargetAttempt[] = [
        {
          word: 'CAT',
          feedback: [],
          timestamp: Date.now(),
          isDiscovery: true,
        },
        {
          word: 'HOPE', // Target-length guess (not discovery)
          feedback: [
            { letter: 'H', position: 0, feedback: 'green' },
            { letter: 'O', position: 1, feedback: 'green' },
            { letter: 'P', position: 2, feedback: 'green' },
            { letter: 'E', position: 3, feedback: 'green' },
          ],
          timestamp: Date.now(),
          isDiscovery: false, // This is a real target guess
        },
      ];

      const won = true;
      const result = calculateAttemptsUsedFixed(mixedAttempts, won);
      expect(result).toBe(1); // One actual target guess
    });

    it('should count multiple target guesses correctly', () => {
      const attemptsWithMultipleGuesses: TargetAttempt[] = [
        {
          word: 'HATE',
          feedback: [],
          timestamp: Date.now(),
          isDiscovery: false, // Target guess #1
        },
        {
          word: 'CAPE',
          feedback: [],
          timestamp: Date.now(),
          isDiscovery: false, // Target guess #2
        },
        {
          word: 'HOPE', // Winning guess
          feedback: [],
          timestamp: Date.now(),
          isDiscovery: false, // Target guess #3
        },
      ];

      const won = true;
      const result = calculateAttemptsUsedFixed(attemptsWithMultipleGuesses, won);
      expect(result).toBe(3);
    });
  });

  describe('win on first try', () => {
    it('should count as 1 attempt when player wins on first guess (isDiscovery undefined)', () => {
      // When player makes a target guess, isDiscovery is NOT set (undefined)
      // This is the normal case - first guess wins
      const firstTryWin: TargetAttempt[] = [
        {
          word: 'HOPE',
          feedback: [
            { letter: 'H', position: 0, feedback: 'green' },
            { letter: 'O', position: 1, feedback: 'green' },
            { letter: 'P', position: 2, feedback: 'green' },
            { letter: 'E', position: 3, feedback: 'green' },
          ],
          timestamp: Date.now(),
          // isDiscovery is NOT set - this is a real target attempt
        },
      ];

      const won = true;
      const result = calculateAttemptsUsedFixed(firstTryWin, won);
      expect(result).toBe(1); // Should count as 1 attempt
    });

    it('should count as 1 attempt when player wins on first guess (isDiscovery explicitly false)', () => {
      const firstTryWin: TargetAttempt[] = [
        {
          word: 'HOPE',
          feedback: [
            { letter: 'H', position: 0, feedback: 'green' },
            { letter: 'O', position: 1, feedback: 'green' },
            { letter: 'P', position: 2, feedback: 'green' },
            { letter: 'E', position: 3, feedback: 'green' },
          ],
          timestamp: Date.now(),
          isDiscovery: false,
        },
      ];

      const won = true;
      const result = calculateAttemptsUsedFixed(firstTryWin, won);
      expect(result).toBe(1);
    });

    it('should still count as 1 even when attempts array is empty (edge case)', () => {
      // Edge case: somehow won with empty attempts array
      // This shouldn't happen in practice but the fix should handle it
      const emptyAttempts: TargetAttempt[] = [];

      const won = true;
      const result = calculateAttemptsUsedFixed(emptyAttempts, won);
      expect(result).toBe(1); // Math.max(1, 0) = 1
    });
  });

  describe('validation boundaries', () => {
    it('attemptsUsed should be within valid range 1-10 for wins', () => {
      // Minimum valid for wins
      const minAttempts: TargetAttempt[] = [];
      expect(calculateAttemptsUsedFixed(minAttempts, true)).toBeGreaterThanOrEqual(1);
      expect(calculateAttemptsUsedFixed(minAttempts, true)).toBeLessThanOrEqual(10);
    });
  });
});
