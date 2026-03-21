/**
 * TDD: Timer sync during 3-2-1-GO countdown animation
 *
 * The server starts its timer after all players ACK. The client ACKs
 * immediately, so timeUpdate events arrive during the countdown animation.
 *
 * Fix: handleTimeUpdate ALWAYS syncs the timer with server time (even during
 * countdown) so the timer starts from the correct value when the game activates.
 * Game activation is still deferred until the countdown animation completes.
 */

import fs from 'fs';
import path from 'path';

const sourceCode = fs.readFileSync(
  path.resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf-8'
);

describe('usePlayerGameEvents countdown timer guard', () => {
  describe('handleTimeUpdate syncs timer during countdown but defers activation', () => {
    it('should sync timer with server BEFORE the countdown guard return', () => {
      // Extract the handleTimeUpdate handler
      const timeUpdateMatch = sourceCode.match(
        /const handleTimeUpdate[\s\S]*?(?=\n    const handle[A-Z])/
      );
      expect(timeUpdateMatch).not.toBeNull();
      const handler = timeUpdateMatch![0];

      // Timer sync (setTime) should happen BEFORE the countdown early return
      // so non-host players always have accurate server time
      const setTimeIndex = handler.indexOf('gameTimerRef.current.setTime');
      const countdownReturnMatch = handler.match(/showStartAnimationRef\.current[\s\S]*?return;/);
      expect(setTimeIndex).toBeGreaterThan(-1);
      expect(countdownReturnMatch).not.toBeNull();
      const countdownReturnIndex = handler.indexOf(countdownReturnMatch![0]);
      expect(setTimeIndex).toBeLessThan(countdownReturnIndex);
    });

    it('should still guard game activation during countdown', () => {
      const timeUpdateMatch = sourceCode.match(
        /const handleTimeUpdate[\s\S]*?(?=\n    const handle[A-Z])/
      );
      const handler = timeUpdateMatch![0];

      // showStartAnimationRef check should still exist and return early
      expect(handler).toContain('showStartAnimationRef.current');
      expect(handler).toMatch(/showStartAnimationRef\.current[\s\S]*?return/);
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
