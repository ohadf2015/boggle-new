/**
 * Spam Detector Tests
 * Tests for progressive penalty system for invalid word submissions
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  SpamDetector,
  PenaltyTier,
  InvalidReason,
  type RecordInvalidWordResult
} from '../modules/spamDetector';

// Mock logger
vi.mock('../utils/logger', () => ({ default: {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

describe('SpamDetector', () => {

  let detector: SpamDetector;

  beforeEach(() => {
    detector = new SpamDetector({
      windowMs: 10000,
      warningThreshold: 5,
      penaltyThreshold: 7,
      cooldownThreshold: 10,
      cooldownDurationMs: 3000,
      penaltyPoints: 2
    });
  });

  afterEach(() => {
    detector.shutdown();
  });

  describe('Basic Recording', () => {

    test('records invalid word and returns result', () => {
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'invalid', InvalidReason.NOT_ON_BOARD);

      expect(result).toBeDefined();
      expect(result.tier).toBe(PenaltyTier.NONE);
      expect(result.invalidCount).toBe(1);
      expect(result.penaltyApplied).toBe(0);
      expect(result.cooldownActive).toBe(false);
    });

    test('increments invalid count with each recording', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.TOO_SHORT);
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word3', InvalidReason.REJECTED);

      expect(result.invalidCount).toBe(3);
    });

    test('tracks different players separately', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.NOT_ON_BOARD);

      detector.recordInvalidWord('GAME1', 'Player2', 'word1', InvalidReason.NOT_ON_BOARD);

      const player1Status = detector.getPlayerStatus('GAME1', 'Player1');
      const player2Status = detector.getPlayerStatus('GAME1', 'Player2');

      expect(player1Status.invalidCount).toBe(2);
      expect(player2Status.invalidCount).toBe(1);
    });

    test('tracks different games separately', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.NOT_ON_BOARD);

      detector.recordInvalidWord('GAME2', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);

      const game1Status = detector.getPlayerStatus('GAME1', 'Player1');
      const game2Status = detector.getPlayerStatus('GAME2', 'Player1');

      expect(game1Status.invalidCount).toBe(2);
      expect(game2Status.invalidCount).toBe(1);
    });
  });

  describe('Warning Tier', () => {

    test('triggers warning at threshold', () => {
      // Record 4 words (below threshold)
      for (let i = 0; i < 4; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // 5th word should trigger warning
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word5', InvalidReason.NOT_ON_BOARD);

      expect(result.tier).toBe(PenaltyTier.WARNING);
      expect(result.message).toBe('warning');
    });

    test('warning only triggers once per window', () => {
      // Record 5 words to trigger warning
      for (let i = 0; i < 5; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // 6th word should still be in warning tier but no new message
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word6', InvalidReason.NOT_ON_BOARD);

      expect(result.tier).toBe(PenaltyTier.WARNING);
      expect(result.message).toBeNull(); // Warning already issued
    });

    test('warning tier has no penalty', () => {
      for (let i = 0; i < 5; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.tier).toBe(PenaltyTier.WARNING);
      expect(status.totalPenaltyPoints).toBe(0);
    });
  });

  describe('Penalty Tier', () => {

    test('triggers penalty at threshold', () => {
      // Record 6 words (below penalty threshold)
      for (let i = 0; i < 6; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // 7th word should trigger penalty tier
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word7', InvalidReason.NOT_ON_BOARD);

      expect(result.tier).toBe(PenaltyTier.PENALTY);
    });

    test('applies penalty points for words above threshold', () => {
      // Record 7 words to reach penalty threshold
      for (let i = 0; i < 7; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // 8th word should apply penalty
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word8', InvalidReason.NOT_ON_BOARD);

      expect(result.penaltyApplied).toBeGreaterThan(0);
      expect(result.message).toBe('penalty');
    });

    test('accumulates penalty points', () => {
      // Get to penalty tier
      for (let i = 0; i < 7; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // Record more words with penalties
      detector.recordInvalidWord('GAME1', 'Player1', 'word8', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word9', InvalidReason.NOT_ON_BOARD);

      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.totalPenaltyPoints).toBeGreaterThan(0);
    });
  });

  describe('Cooldown Tier', () => {

    test('triggers cooldown at threshold', () => {
      // Record 9 words (below cooldown threshold)
      for (let i = 0; i < 9; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // 10th word should trigger cooldown
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word10', InvalidReason.NOT_ON_BOARD);

      expect(result.tier).toBe(PenaltyTier.COOLDOWN);
      expect(result.cooldownActive).toBe(true);
      expect(result.cooldownDuration).toBeGreaterThan(0);
      expect(result.message).toBe('cooldown');
    });

    test('isOnCooldown returns true during cooldown', () => {
      // Trigger cooldown
      for (let i = 0; i < 10; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      expect(detector.isOnCooldown('GAME1', 'Player1')).toBe(true);
    });

    test('getRemainingCooldown returns time remaining', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      const remaining = detector.getRemainingCooldown('GAME1', 'Player1');
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3000);
    });

    test('cooldown expires after duration', async () => {
      // Use a shorter cooldown for testing
      const shortDetector = new SpamDetector({
        windowMs: 10000,
        warningThreshold: 5,
        penaltyThreshold: 7,
        cooldownThreshold: 10,
        cooldownDurationMs: 100, // 100ms cooldown
        penaltyPoints: 2
      });

      try {
        // Trigger cooldown
        for (let i = 0; i < 10; i++) {
          shortDetector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
        }

        expect(shortDetector.isOnCooldown('GAME1', 'Player1')).toBe(true);

        // Wait for cooldown to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(shortDetector.isOnCooldown('GAME1', 'Player1')).toBe(false);
      } finally {
        shortDetector.shutdown();
      }
    });

    test('cooldown only triggers once per window', () => {
      // Trigger cooldown
      for (let i = 0; i < 10; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // Record another word - should still be in cooldown but no new cooldown duration
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'word11', InvalidReason.NOT_ON_BOARD);

      expect(result.cooldownActive).toBe(true);
      expect(result.cooldownDuration).toBe(0); // No new cooldown applied
    });
  });

  describe('Player Status', () => {

    test('getPlayerStatus returns correct information', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.TOO_SHORT);
      detector.recordInvalidWord('GAME1', 'Player1', 'word3', InvalidReason.PROFANITY);

      const status = detector.getPlayerStatus('GAME1', 'Player1');

      expect(status.tier).toBe(PenaltyTier.NONE);
      expect(status.invalidCount).toBe(3);
      expect(status.cooldownRemaining).toBe(0);
      expect(status.totalPenaltyPoints).toBe(0);
    });

    test('returns none tier for unknown player', () => {
      const status = detector.getPlayerStatus('GAME1', 'UnknownPlayer');

      expect(status.tier).toBe(PenaltyTier.NONE);
      expect(status.invalidCount).toBe(0);
    });
  });

  describe('Cleanup Operations', () => {

    test('clearPlayer removes player data', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.NOT_ON_BOARD);

      detector.clearPlayer('GAME1', 'Player1');

      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.invalidCount).toBe(0);
    });

    test('clearGame removes all players in game', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player2', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME2', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);

      detector.clearGame('GAME1');

      expect(detector.getPlayerStatus('GAME1', 'Player1').invalidCount).toBe(0);
      expect(detector.getPlayerStatus('GAME1', 'Player2').invalidCount).toBe(0);
      expect(detector.getPlayerStatus('GAME2', 'Player1').invalidCount).toBe(1); // Other game unaffected
    });
  });

  describe('Statistics', () => {

    test('getStats returns detector statistics', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player2', 'word1', InvalidReason.NOT_ON_BOARD);

      const stats = detector.getStats();

      expect(stats.trackedPlayers).toBe(2);
      expect(stats.config).toBeDefined();
      expect(stats.config.windowMs).toBe(10000);
      expect(stats.config.warningThreshold).toBe(5);
      expect(stats.config.penaltyThreshold).toBe(7);
      expect(stats.config.cooldownThreshold).toBe(10);
    });
  });

  describe('Sliding Window', () => {

    test('expired entries are pruned', async () => {
      // Use a short window for testing
      const shortWindowDetector = new SpamDetector({
        windowMs: 100, // 100ms window
        warningThreshold: 5,
        penaltyThreshold: 7,
        cooldownThreshold: 10,
        cooldownDurationMs: 3000,
        penaltyPoints: 2
      });

      try {
        // Record words
        shortWindowDetector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
        shortWindowDetector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.NOT_ON_BOARD);

        expect(shortWindowDetector.getPlayerStatus('GAME1', 'Player1').invalidCount).toBe(2);

        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // Record new word and check status (should trigger pruning)
        shortWindowDetector.recordInvalidWord('GAME1', 'Player1', 'word3', InvalidReason.NOT_ON_BOARD);

        const status = shortWindowDetector.getPlayerStatus('GAME1', 'Player1');
        expect(status.invalidCount).toBe(1); // Only the new word should remain
      } finally {
        shortWindowDetector.shutdown();
      }
    });
  });

  describe('Invalid Reasons', () => {

    test('records different invalid reasons', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.TOO_SHORT);
      detector.recordInvalidWord('GAME1', 'Player1', 'word3', InvalidReason.PROFANITY);
      detector.recordInvalidWord('GAME1', 'Player1', 'word4', InvalidReason.REJECTED);

      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.invalidCount).toBe(4);
    });

    test('all reasons contribute equally to count', () => {
      // All should count toward the threshold
      detector.recordInvalidWord('GAME1', 'Player1', 'w1', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'w2', InvalidReason.TOO_SHORT);
      detector.recordInvalidWord('GAME1', 'Player1', 'w3', InvalidReason.PROFANITY);
      detector.recordInvalidWord('GAME1', 'Player1', 'w4', InvalidReason.REJECTED);
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'w5', InvalidReason.NOT_ON_BOARD);

      expect(result.tier).toBe(PenaltyTier.WARNING);
    });
  });

  describe('Edge Cases', () => {

    test('handles same word submitted multiple times', () => {
      detector.recordInvalidWord('GAME1', 'Player1', 'sameword', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'sameword', InvalidReason.NOT_ON_BOARD);
      detector.recordInvalidWord('GAME1', 'Player1', 'sameword', InvalidReason.NOT_ON_BOARD);

      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.invalidCount).toBe(3);
    });

    test('handles empty word', () => {
      const result = detector.recordInvalidWord('GAME1', 'Player1', '', InvalidReason.TOO_SHORT);

      expect(result.invalidCount).toBe(1);
    });

    test('handles special characters in word', () => {
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'עברית', InvalidReason.NOT_ON_BOARD);

      expect(result.invalidCount).toBe(1);
    });

    test('handles very long game codes and usernames', () => {
      const longGameCode = 'A'.repeat(100);
      const longUsername = 'B'.repeat(100);

      const result = detector.recordInvalidWord(longGameCode, longUsername, 'word', InvalidReason.NOT_ON_BOARD);

      expect(result.invalidCount).toBe(1);
    });
  });

  describe('Custom Configuration', () => {

    test('respects custom thresholds', () => {
      const customDetector = new SpamDetector({
        windowMs: 5000,
        warningThreshold: 2, // Very low threshold
        penaltyThreshold: 3,
        cooldownThreshold: 4,
        cooldownDurationMs: 1000,
        penaltyPoints: 5
      });

      try {
        // Should hit warning at 2 invalid words
        customDetector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);
        const result = customDetector.recordInvalidWord('GAME1', 'Player1', 'word2', InvalidReason.NOT_ON_BOARD);

        expect(result.tier).toBe(PenaltyTier.WARNING);
      } finally {
        customDetector.shutdown();
      }
    });
  });

  describe('Boundary Conditions', () => {

    test('exactly at warning threshold triggers warning', () => {
      // Record exactly warningThreshold (5) words
      for (let i = 0; i < 5; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }
      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.tier).toBe(PenaltyTier.WARNING);
      expect(status.invalidCount).toBe(5);
    });

    test('one below warning threshold stays at NONE', () => {
      for (let i = 0; i < 4; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }
      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.tier).toBe(PenaltyTier.NONE);
    });

    test('exactly at penalty threshold triggers penalty', () => {
      for (let i = 0; i < 7; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }
      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.tier).toBe(PenaltyTier.PENALTY);
    });

    test('exactly at cooldown threshold triggers cooldown', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }
      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.tier).toBe(PenaltyTier.COOLDOWN);
    });
  });

  describe('Penalty Points Calculation', () => {

    test('calculates exact penalty points for each word above threshold', () => {
      // Record 7 words to reach penalty threshold (invalidCount <= penaltyThreshold, no penalty yet)
      for (let i = 0; i < 7; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }
      expect(detector.getPlayerStatus('GAME1', 'Player1').totalPenaltyPoints).toBe(0);

      // 8th word: first word above threshold, applies penalty for ALL 8 words (8 * 2 = 16)
      // This is because lastPenaltyCount starts at 0, and newPenaltyCount = 8 - 0 = 8
      const result8 = detector.recordInvalidWord('GAME1', 'Player1', 'word8', InvalidReason.NOT_ON_BOARD);
      expect(result8.penaltyApplied).toBe(16); // 8 words * 2 points
      expect(result8.totalPenaltyPoints).toBe(16);

      // 9th word: only applies penalty for this NEW word (1 * 2 = 2)
      const result9 = detector.recordInvalidWord('GAME1', 'Player1', 'word9', InvalidReason.NOT_ON_BOARD);
      expect(result9.penaltyApplied).toBe(2);
      expect(result9.totalPenaltyPoints).toBe(18);
    });

    test('penalty persists even after tier escalation to cooldown', () => {
      // Get to penalty tier and accumulate points
      for (let i = 0; i < 9; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      // Check accumulated points before cooldown
      const statusBeforeCooldown = detector.getPlayerStatus('GAME1', 'Player1');
      const pointsBeforeCooldown = statusBeforeCooldown.totalPenaltyPoints;

      // Trigger cooldown
      detector.recordInvalidWord('GAME1', 'Player1', 'word10', InvalidReason.NOT_ON_BOARD);

      // Points should still be there
      const statusAfterCooldown = detector.getPlayerStatus('GAME1', 'Player1');
      expect(statusAfterCooldown.totalPenaltyPoints).toBeGreaterThanOrEqual(pointsBeforeCooldown);
    });
  });

  describe('Rapid Fire Submissions', () => {

    test('handles many submissions in quick succession', () => {
      // Simulate rapid submission of 20 invalid words
      for (let i = 0; i < 20; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.tier).toBe(PenaltyTier.COOLDOWN);
      expect(status.invalidCount).toBe(20);
      expect(status.cooldownRemaining).toBeGreaterThan(0);
    });

    test('handles multiple players submitting simultaneously', () => {
      // Simulate 5 players each submitting 5 words
      const players = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5'];

      for (let wordIndex = 0; wordIndex < 5; wordIndex++) {
        for (const player of players) {
          detector.recordInvalidWord('GAME1', player, `word${wordIndex}`, InvalidReason.NOT_ON_BOARD);
        }
      }

      // Each player should be at warning tier with 5 invalid words
      for (const player of players) {
        const status = detector.getPlayerStatus('GAME1', player);
        expect(status.invalidCount).toBe(5);
        expect(status.tier).toBe(PenaltyTier.WARNING);
      }
    });
  });

  describe('Singleton Instance', () => {

    test('singleton is properly exported and functional', async () => {
      const { spamDetector } = await import('../modules/spamDetector');

      expect(spamDetector).toBeDefined();
      expect(typeof spamDetector.recordInvalidWord).toBe('function');
      expect(typeof spamDetector.getPlayerStatus).toBe('function');
      expect(typeof spamDetector.isOnCooldown).toBe('function');
      expect(typeof spamDetector.getStats).toBe('function');
    });

    test('singleton respects environment variable defaults', async () => {
      const { spamDetector } = await import('../modules/spamDetector');
      const stats = spamDetector.getStats();

      // Should have default config values
      expect(stats.config.windowMs).toBeGreaterThan(0);
      expect(stats.config.warningThreshold).toBeGreaterThan(0);
      expect(stats.config.penaltyThreshold).toBeGreaterThan(stats.config.warningThreshold);
      expect(stats.config.cooldownThreshold).toBeGreaterThan(stats.config.penaltyThreshold);
    });
  });

  describe('Shutdown and Cleanup', () => {

    test('shutdown clears cleanup interval', () => {
      const testDetector = new SpamDetector();

      // Record some data
      testDetector.recordInvalidWord('GAME1', 'Player1', 'word1', InvalidReason.NOT_ON_BOARD);

      // Shutdown should not throw
      expect(() => testDetector.shutdown()).not.toThrow();

      // Multiple shutdowns should be safe
      expect(() => testDetector.shutdown()).not.toThrow();
    });

    test('clearPlayer also clears accumulated penalty', () => {
      // Accumulate penalties
      for (let i = 0; i < 9; i++) {
        detector.recordInvalidWord('GAME1', 'Player1', `word${i}`, InvalidReason.NOT_ON_BOARD);
      }

      expect(detector.getPlayerStatus('GAME1', 'Player1').totalPenaltyPoints).toBeGreaterThan(0);

      // Clear player
      detector.clearPlayer('GAME1', 'Player1');

      // All data should be reset including penalties
      const status = detector.getPlayerStatus('GAME1', 'Player1');
      expect(status.invalidCount).toBe(0);
      expect(status.totalPenaltyPoints).toBe(0);
    });
  });

  describe('Default Reason Handling', () => {

    test('uses REJECTED as default reason when not specified', () => {
      // Call without specifying reason
      const result = detector.recordInvalidWord('GAME1', 'Player1', 'testword');

      expect(result.invalidCount).toBe(1);
      expect(result.tier).toBe(PenaltyTier.NONE);
    });
  });
});

describe('PenaltyTier Enum', () => {

  test('has all expected values', () => {
    expect(PenaltyTier.NONE).toBe('none');
    expect(PenaltyTier.WARNING).toBe('warning');
    expect(PenaltyTier.PENALTY).toBe('penalty');
    expect(PenaltyTier.COOLDOWN).toBe('cooldown');
  });
});

describe('InvalidReason Enum', () => {

  test('has all expected values', () => {
    expect(InvalidReason.NOT_ON_BOARD).toBe('not_on_board');
    expect(InvalidReason.TOO_SHORT).toBe('too_short');
    expect(InvalidReason.PROFANITY).toBe('profanity');
    expect(InvalidReason.REJECTED).toBe('rejected');
  });
});
