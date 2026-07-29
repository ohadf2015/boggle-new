/**
 * HostView — timer-zero watchdog wiring (source-level contract)
 *
 * Bug: wheel-rush MP game doesn't end when server timer expires on the host.
 * Root cause: host-side `handleTimeUpdate` is guarded by `gameStartedRef.current`,
 * which can be false for wheel-rush if `GoRipplesAnimation.onComplete` fires before
 * `tableData` or `remainingTime>0` reaches the effect that sets `gameStarted=true`.
 *
 * Fix: wire `useTimerZeroWatchdog` on the host side, mirroring PlayerView.tsx.
 * When `remainingTime` reaches 0 after a previously-started game and
 * `waitingForResults` is still false, the watchdog fires after a 2s grace window,
 * forces `waitingForResults=true`, and emits `requestResults` to pull the server's
 * cached scoring payload.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('HostView — timer-zero watchdog wiring', () => {
  const source = readFileSync(
    resolve(__dirname, '../HostView.tsx'),
    'utf8',
  );

  it('imports useTimerZeroWatchdog from the shared hook', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*useTimerZeroWatchdog[^}]*\}\s+from\s+['"](?:\.\.\/hooks\/useTimerZeroWatchdog|@\/hooks\/useTimerZeroWatchdog)['"]/,
    );
  });

  it('calls useTimerZeroWatchdog with remainingTime from runtime', () => {
    expect(source).toMatch(/useTimerZeroWatchdog\s*\(\s*\{[\s\S]*?remainingTime[\s\S]*?\}\s*\)/);
  });

  it('passes gameStarted as gameActive so wasActiveRef tracks host game lifecycle', () => {
    // wasActiveRef only fires the watchdog when the game was previously active;
    // using gameStarted mirrors the gameActive semantics on the player side.
    expect(source).toMatch(/gameActive:\s*(?:state\.runtime\.gameStarted|runtime\.gameStarted)/);
  });

  it('passes waitingForResults so watchdog suppresses after normal game-end', () => {
    expect(source).toMatch(/waitingForResults:\s*(?:state\.runtime\.waitingForResults|runtime\.waitingForResults)/);
  });

  it('onTrigger sets waitingForResults and emits requestResults', () => {
    // Both actions needed: state transition + server pull.
    // Without setWaitingForResults the game view stays rendered;
    // without requestResults the results screen shows a spinner forever.
    expect(source).toMatch(/setWaitingForResults\s*\(\s*true\s*\)/);
    expect(source).toMatch(/socket\?\.emit\s*\(\s*['"]requestResults['"]\s*\)/);
  });
});
