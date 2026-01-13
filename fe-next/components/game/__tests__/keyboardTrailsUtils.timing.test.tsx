/**
 * Keyboard Trails Timing Bug Test
 *
 * Reproduces the bug where keyboard trails show immediately at game start
 * instead of only appearing after the inactivity threshold.
 *
 * Bug behavior:
 * - Trail hint shows at beginning of game
 * - Trail stays visible instead of fading out
 *
 * Expected behavior:
 * - Trail hint only shows after inactivity period (10s new, 30s experienced)
 * - Trail should fade out after being displayed
 */

import {
  shouldShowKeyboardTrails,
  NEW_PLAYER_THRESHOLD_MS,
  EXPERIENCED_PLAYER_THRESHOLD_MS,
} from '../keyboardTrailsUtils';

describe('Keyboard Trails Timing Bug', () => {
  describe('Bug: Trails should NOT show at game start', () => {
    const now = Date.now();
    const isTypingMode = true;

    it('should NOT show trails when lastWordFoundTime is 0 (initial state)', () => {
      // Bug: If lastWordFoundTime starts at 0, trails may show immediately
      // if the calculation (now - 0) exceeds threshold
      expect(shouldShowKeyboardTrails(isTypingMode, 0, 0, now)).toBe(false);
    });

    it('should NOT show trails immediately when game just started (lastWordFoundTime = now)', () => {
      // Even when lastWordFoundTime is properly set to game start time,
      // trails should NOT show immediately
      expect(shouldShowKeyboardTrails(isTypingMode, now, 0, now)).toBe(false);
    });

    it('should NOT show trails 1 second after game start', () => {
      const gameStartTime = now - 1000; // 1 second ago
      expect(shouldShowKeyboardTrails(isTypingMode, gameStartTime, 0, now)).toBe(false);
    });

    it('should NOT show trails 5 seconds after game start (new player)', () => {
      const gameStartTime = now - 5000; // 5 seconds ago
      // New players have 10s threshold
      expect(shouldShowKeyboardTrails(isTypingMode, gameStartTime, 0, now)).toBe(false);
    });

    it('should NOT show trails 9 seconds after game start (new player, just under threshold)', () => {
      const gameStartTime = now - 9000; // 9 seconds ago
      // New players have 10s threshold, so 9s should not trigger
      expect(shouldShowKeyboardTrails(isTypingMode, gameStartTime, 0, now)).toBe(false);
    });

    it('should show trails after 10 seconds of inactivity (new player threshold)', () => {
      const gameStartTime = now - NEW_PLAYER_THRESHOLD_MS; // Exactly 10 seconds
      expect(shouldShowKeyboardTrails(isTypingMode, gameStartTime, 0, now)).toBe(true);
    });

    it('should NOT show trails at 20 seconds for experienced player (under 30s threshold)', () => {
      const gameStartTime = now - 20000; // 20 seconds ago
      // Experienced player (5 games) has 30s threshold
      expect(shouldShowKeyboardTrails(isTypingMode, gameStartTime, 5, now)).toBe(false);
    });

    it('should show trails after 30 seconds of inactivity (experienced player threshold)', () => {
      const gameStartTime = now - EXPERIENCED_PLAYER_THRESHOLD_MS; // Exactly 30 seconds
      expect(shouldShowKeyboardTrails(isTypingMode, gameStartTime, 5, now)).toBe(true);
    });
  });

  describe('Bug: Trails should reset after finding a word', () => {
    const now = Date.now();
    const isTypingMode = true;

    it('should NOT show trails immediately after finding a word', () => {
      // If player just found a word, lastWordFoundTime should be updated to now
      // and trails should not show
      const justFoundWord = now; // Word found just now
      expect(shouldShowKeyboardTrails(isTypingMode, justFoundWord, 0, now)).toBe(false);
    });

    it('should show trails again after being inactive for threshold period after word found', () => {
      const wordFoundTime = now - NEW_PLAYER_THRESHOLD_MS; // Found word 10 seconds ago
      expect(shouldShowKeyboardTrails(isTypingMode, wordFoundTime, 0, now)).toBe(true);
    });
  });

  describe('Bug: Trails should NOT show when not typing', () => {
    const now = Date.now();
    const isTypingMode = false;

    it('should NOT show trails when not in typing mode, even after long inactivity', () => {
      const longTimeAgo = now - 60000; // 1 minute ago
      expect(shouldShowKeyboardTrails(isTypingMode, longTimeAgo, 0, now)).toBe(false);
      expect(shouldShowKeyboardTrails(isTypingMode, longTimeAgo, 5, now)).toBe(false);
    });
  });

  describe('Edge case: undefined or null values', () => {
    const now = Date.now();
    const isTypingMode = true;

    it('should NOT show trails when lastWordFoundTime is undefined', () => {
      expect(shouldShowKeyboardTrails(isTypingMode, undefined as unknown as number, 0, now)).toBe(false);
    });

    it('should NOT show trails when lastWordFoundTime is null', () => {
      expect(shouldShowKeyboardTrails(isTypingMode, null as unknown as number, 0, now)).toBe(false);
    });

    it('should treat undefined totalGamesPlayed as new player (10s threshold)', () => {
      const tenSecondsAgo = now - NEW_PLAYER_THRESHOLD_MS;
      expect(shouldShowKeyboardTrails(isTypingMode, tenSecondsAgo, undefined, now)).toBe(true);
    });
  });
});
