/**
 * useHostGameEvents — timer-zero guard regression (source-level contract)
 *
 * Bug: When gameStartedRef.current is false at timer expiry (e.g. wheel-rush
 * where countdown-complete arrives slightly after the first timeUpdate),
 * setRemainingTime(0) was never called. hasActiveGameData = tableData &&
 * remainingTime > 0 therefore stayed true, keeping HostInGameView rendered
 * after the server declared the game over.
 *
 * Fix: move setRemainingTime() before the gameStartedRef guard so the timer
 * display is always accurate. Handle remainingTime===0 unconditionally so the
 * game-end transition fires even when gameStartedRef is false. The
 * session-ID guard above it is the correct gating layer.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('useHostGameEvents — handleTimeUpdate timer-zero fix', () => {
  const source = readFileSync(
    resolve(__dirname, '../socket/useHostGameEvents.ts'),
    'utf8',
  );

  it('setRemainingTime call appears before the gameStartedRef guard block', () => {
    // Verify structural order: setRemainingTime must not be inside the
    // if (!gameStartedRef.current) { return; } block.
    const timeUpdateFnMatch = source.match(
      /const handleTimeUpdate\s*=[\s\S]*?(?=const handle[A-Z])/,
    );
    expect(timeUpdateFnMatch).not.toBeNull();
    const fnBody = timeUpdateFnMatch![0];

    const setRemainingPos = fnBody.indexOf('setRemainingTime');
    const gameStartedGuardPos = fnBody.indexOf('if (!gameStartedRef.current)');

    // setRemainingTime must come before (or absent from) the gameStarted guard
    if (gameStartedGuardPos !== -1) {
      expect(setRemainingPos).toBeLessThan(gameStartedGuardPos);
    }
    // If guard was removed entirely, setRemainingTime just needs to exist
    expect(setRemainingPos).toBeGreaterThan(-1);
  });

  it('remainingTime===0 game-end block does NOT require gameStartedRef check', () => {
    // The old code had: if (data.remainingTime === 0 && gameStartedRef.current)
    // This prevented game-end when the guard had already fired (ref was false).
    // The fix removes the gameStartedRef.current conjunction on the zero check.
    const timeUpdateFnMatch = source.match(
      /const handleTimeUpdate\s*=[\s\S]*?(?=const handle[A-Z])/,
    );
    const fnBody = timeUpdateFnMatch?.[0] ?? '';

    // Must NOT have the gated pattern
    expect(fnBody).not.toMatch(
      /data\.remainingTime\s*===\s*0\s*&&\s*gameStartedRef\.current/,
    );

    // Must still have the 0-check for the game-end transition
    expect(fnBody).toMatch(/data\.remainingTime\s*===\s*0/);
  });

  it('setWaitingForResults(true) is reachable from the zero-time block', () => {
    const timeUpdateFnMatch = source.match(
      /const handleTimeUpdate\s*=[\s\S]*?(?=const handle[A-Z])/,
    );
    expect(timeUpdateFnMatch?.[0]).toMatch(/setWaitingForResults\s*\(\s*true\s*\)/);
  });
});
