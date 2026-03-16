/**
 * TDD: Timer should not count down during 3-2-1-GO countdown animation
 *
 * Bug: Server sends timeUpdate events after all players ACK, but client
 * ACKs immediately before the countdown animation finishes. This causes
 * the timer to visually tick down during the 3-2-1-GO animation.
 *
 * Fix: handleTimeUpdate must return early while showStartAnimation is true,
 * preventing timer sync and game activation during the countdown.
 */

import fs from 'fs';
import path from 'path';

const sourceCode = fs.readFileSync(
  path.resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf-8'
);

describe('usePlayerGameEvents countdown timer guard', () => {
  describe('handleTimeUpdate skips all processing during countdown', () => {
    it('should return early when countdown animation is showing', () => {
      // Extract the handleTimeUpdate handler
      const timeUpdateMatch = sourceCode.match(
        /const handleTimeUpdate[\s\S]*?(?=\n    const handle[A-Z])/
      );
      expect(timeUpdateMatch).not.toBeNull();
      const handler = timeUpdateMatch![0];

      // The handler should check showStartAnimationRef and return early
      // before any timer sync or game activation happens
      expect(handler).toContain('isCountdownShowing');
      expect(handler).toMatch(/isCountdownShowing[\s\S]*?return/);

      // The early return should come BEFORE gameTimerRef.current.setTime
      const returnIndex = handler.indexOf('return;');
      const setTimeIndex = handler.indexOf('gameTimerRef.current.setTime');
      expect(returnIndex).toBeGreaterThan(-1);
      expect(setTimeIndex).toBeGreaterThan(-1);
      expect(returnIndex).toBeLessThan(setTimeIndex);
    });
  });

  describe('handleStartGame sets timer value but timer stays paused', () => {
    it('should call gameTimer.reset() and setTime() to display correct initial value', () => {
      // Extract the handleStartGame handler
      const startGameMatch = sourceCode.match(
        /const handleStartGame[\s\S]*?(?=\n    const handleEndGame)/
      );
      expect(startGameMatch).not.toBeNull();
      const handler = startGameMatch![0];

      // setTime is OK here — the timer is paused (isPaused: !gameActive) so it
      // displays the correct initial value without ticking
      expect(handler).toContain('gameTimerRef.current.reset()');
      expect(handler).toContain('gameTimerRef.current.setTime');
    });

    it('should NOT set gameActive=true during countdown (only for lateJoin)', () => {
      const startGameMatch = sourceCode.match(
        /const handleStartGame[\s\S]*?(?=\n    const handleEndGame)/
      );
      const handler = startGameMatch![0];

      // For normal starts, it should set showStartAnimation=true (not gameActive)
      expect(handler).toContain('showStartAnimation = true');
      // gameActive=true is only set in the lateJoin branch
      expect(handler).toMatch(/lateJoin[\s\S]*?gameActive.*true/);
    });
  });
});
