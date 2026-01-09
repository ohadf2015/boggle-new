/**
 * Keyboard Trails Display Tests
 *
 * Tests that keyboard word trails (highlighted path) are only shown
 * for new players who haven't played more than one game.
 * Experienced players shouldn't see keyboard trails during typing
 * as they already know how to play.
 *
 * This tests the utility function that determines whether to show keyboard trails.
 */

import { shouldShowKeyboardTrails } from '../keyboardTrailsUtils';

describe('KeyboardTrailsDisplay', () => {
  describe('shouldShowKeyboardTrails', () => {
    describe('when player is typing (keyboard input mode)', () => {
      const isTypingMode = true;

      it('shows keyboard trails for new players (0 games played)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 0)).toBe(true);
      });

      it('shows keyboard trails for players with exactly 1 game played', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 1)).toBe(true);
      });

      it('hides keyboard trails for experienced players (2+ games played)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 2)).toBe(false);
      });

      it('hides keyboard trails for very experienced players (10+ games)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 10)).toBe(false);
      });

      it('shows keyboard trails when totalGamesPlayed is undefined (guest/new)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, undefined)).toBe(true);
      });

      it('shows keyboard trails when totalGamesPlayed is null (guest/new)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, null as unknown as number)).toBe(true);
      });
    });

    describe('when player is NOT typing', () => {
      const isTypingMode = false;

      it('never shows trails when not typing, regardless of experience (0 games)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 0)).toBe(false);
      });

      it('never shows trails when not typing, regardless of experience (10 games)', () => {
        expect(shouldShowKeyboardTrails(isTypingMode, 10)).toBe(false);
      });
    });
  });
});
