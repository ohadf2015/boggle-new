import { readMpPageSource } from './mpPageSource';

/**
 * Bug: PageClient passed `onGameStartConsumed` to PlayerView as an inline arrow
 * (`onGameStartConsumed={() => setPendingGameStart(null)}`). That prop sits in the
 * dependency array of PlayerView's `pendingGameStart` effect, so a fresh reference
 * on every PageClient render (frequent in MP: leaderboard, socket status) tears
 * down and re-runs the effect — re-firing game-start side effects (board re-set,
 * mode-reveal re-trigger) while a game is starting.
 *
 * Fix: memoize the callback with useCallback so its reference is stable.
 */

const source = readMpPageSource();

describe('PageClient — onGameStartConsumed callback stability', () => {
  it('does not pass an inline arrow function for onGameStartConsumed', () => {
    expect(source).not.toMatch(/onGameStartConsumed=\{\s*\(\)\s*=>/);
  });

  it('defines a memoized handleGameStartConsumed via useCallback', () => {
    expect(source).toMatch(
      /const handleGameStartConsumed = useCallback\(\s*\(\)\s*=>\s*setPendingGameStart\(null\)/,
    );
  });

  it('passes the memoized reference to PlayerView', () => {
    expect(source).toMatch(/onGameStartConsumed=\{handleGameStartConsumed\}/);
  });
});
