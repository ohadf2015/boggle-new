/**
 * Keyboard Trails Display Tests
 *
 * Tests that keyboard word trails (highlighted path) are shown based on:
 * 1. Player inactivity (time since last word found)
 * 2. Player experience level (new vs experienced players)
 *
 * New players (0-1 games): See trails after 10 seconds (tutorial help)
 * Experienced players (2+ games): See trails after 30 seconds (when stuck)
 */

import {
  shouldShowKeyboardTrails,
  NEW_PLAYER_THRESHOLD_MS,
  EXPERIENCED_PLAYER_THRESHOLD_MS,
  NEW_PLAYER_GAMES_THRESHOLD,
} from '../keyboardTrailsUtils';

describe('KeyboardTrailsDisplay', () => {
  describe('shouldShowKeyboardTrails', () => {
    const now = Date.now();

    describe('when player is NOT typing', () => {
      const isTypingMode = false;

      it('never shows trails when not typing, regardless of inactivity or experience', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 0, 0, now)).toBe(false);
        expect(shouldShowKeyboardTrails(isTypingMode, now - 60000, 0, now)).toBe(false);
        expect(shouldShowKeyboardTrails(isTypingMode, now - 60000, 10, now)).toBe(false);
      });
    });

    describe('NEW players (0-1 games) - tutorial help mode', () => {
      const isTypingMode = true;

      it.each([0, 1, undefined, null])('treats %s games as new player', (gamesPlayed) => {
        // New players should see trails after shorter threshold
        const inactiveTime = now - NEW_PLAYER_THRESHOLD_MS;
        expect(shouldShowKeyboardTrails(isTypingMode, inactiveTime, gamesPlayed as number, now)).toBe(true);
      });

      it('hides trails when game just started (lastWordFoundTime = 0 means game start)', () => {
        // When lastWordFoundTime is 0 (game just started), we don't show trails immediately
        // The caller should set lastWordFoundTime to Date.now() at game start
        // This prevents trails from showing right away on desktop
        expect(shouldShowKeyboardTrails(isTypingMode, 0, 0, now)).toBe(false);
        expect(shouldShowKeyboardTrails(isTypingMode, undefined, 0, now)).toBe(false);
      });

      it('hides trails when player recently found a word', () => {
        const recentWordTime = now - 5000; // 5 seconds ago (under 10s threshold)
        expect(shouldShowKeyboardTrails(isTypingMode, recentWordTime, 0, now)).toBe(false);
      });

      it('shows trails after 10 seconds of inactivity', () => {
        const inactiveTime = now - NEW_PLAYER_THRESHOLD_MS; // Exactly 10 seconds
        expect(shouldShowKeyboardTrails(isTypingMode, inactiveTime, 0, now)).toBe(true);
      });

      it('shows trails after more than 10 seconds of inactivity', () => {
        const longInactiveTime = now - (NEW_PLAYER_THRESHOLD_MS + 5000); // 15 seconds
        expect(shouldShowKeyboardTrails(isTypingMode, longInactiveTime, 1, now)).toBe(true);
      });
    });

    describe('EXPERIENCED players (2+ games) - longer threshold', () => {
      const isTypingMode = true;
      const experiencedGames = NEW_PLAYER_GAMES_THRESHOLD + 1; // 2 games

      it('hides trails when game just started (lastWordFoundTime = 0)', () => {
        // Even experienced players need to wait for threshold before seeing trails
        expect(shouldShowKeyboardTrails(isTypingMode, 0, experiencedGames, now)).toBe(false);
        expect(shouldShowKeyboardTrails(isTypingMode, undefined, experiencedGames, now)).toBe(false);
      });

      it('hides trails when player recently found a word', () => {
        const recentWordTime = now - 5000; // 5 seconds ago
        expect(shouldShowKeyboardTrails(isTypingMode, recentWordTime, experiencedGames, now)).toBe(false);
      });

      it('hides trails at new player threshold (10s) - experienced need longer', () => {
        const tenSecondsAgo = now - NEW_PLAYER_THRESHOLD_MS;
        expect(shouldShowKeyboardTrails(isTypingMode, tenSecondsAgo, experiencedGames, now)).toBe(false);
      });

      it('hides trails at 20 seconds - still under 30s threshold', () => {
        const twentySecondsAgo = now - 20000;
        expect(shouldShowKeyboardTrails(isTypingMode, twentySecondsAgo, experiencedGames, now)).toBe(false);
      });

      it('shows trails after 30 seconds of inactivity', () => {
        const thirtySecondsAgo = now - EXPERIENCED_PLAYER_THRESHOLD_MS;
        expect(shouldShowKeyboardTrails(isTypingMode, thirtySecondsAgo, experiencedGames, now)).toBe(true);
      });

      it('shows trails after more than 30 seconds of inactivity', () => {
        const longInactiveTime = now - (EXPERIENCED_PLAYER_THRESHOLD_MS + 10000); // 40 seconds
        expect(shouldShowKeyboardTrails(isTypingMode, longInactiveTime, 10, now)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles future timestamps gracefully (clock skew)', () => {
        const futureTime = now + 10000;
        expect(shouldShowKeyboardTrails(true, futureTime, 0, now)).toBe(false);
        expect(shouldShowKeyboardTrails(true, futureTime, 10, now)).toBe(false);
      });

      it('handles very old timestamps', () => {
        const veryOldTime = now - 3600000; // 1 hour ago
        expect(shouldShowKeyboardTrails(true, veryOldTime, 0, now)).toBe(true);
        expect(shouldShowKeyboardTrails(true, veryOldTime, 10, now)).toBe(true);
      });

      it('verifies threshold constants are correct', () => {
        expect(NEW_PLAYER_THRESHOLD_MS).toBe(10_000);
        expect(EXPERIENCED_PLAYER_THRESHOLD_MS).toBe(30_000);
        expect(NEW_PLAYER_GAMES_THRESHOLD).toBe(1);
      });
    });
  });
});
