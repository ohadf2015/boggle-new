/**
 * PlayerView — timer dependency stability contract
 *
 * The activation effect and pendingGameStart effect both used `gameTimer`
 * (a plain object returned by useGameTimer) in their dependency arrays.
 * Since useGameTimer returns a new object literal on every render, this caused
 * both effects to re-run on every render, breaking the late-join path:
 * `onGameStartConsumed()` was called before `setTimeout(startGame, 1500)`,
 * triggering a dep change that caused cleanup to cancel the timeout before
 * `startGame()` could execute.
 *
 * Fix: destructure stable useCallback methods (timerReset, timerSetTime, timerResume)
 * and move `onGameStartConsumed()` inside `startGame` so it fires after the delay.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PlayerView — timer effect dependency stability', () => {
  const source = readFileSync(
    resolve(__dirname, '../PlayerView.tsx'),
    'utf8',
  );

  it('destructures stable timer methods from gameTimer', () => {
    expect(source).toMatch(/const\s*\{[^}]*timerResume[^}]*\}\s*=\s*gameTimer/);
  });

  it('activation effect uses timerResume() not gameTimer.resume()', () => {
    expect(source).toMatch(/timerResume\(\)/);
    // The raw gameTimer.resume() call should not appear (replaced by timerResume)
    expect(source).not.toMatch(/gameTimer\.resume\(\)/);
  });

  it('pendingGameStart effect uses timerReset() and timerSetTime() not gameTimer.*', () => {
    expect(source).toMatch(/timerReset\(\)/);
    expect(source).toMatch(/timerSetTime\(/);
    expect(source).not.toMatch(/gameTimer\.reset\(\)/);
    // gameTimer.setTime remains only for the reconnect branch which doesn't use delay
    // Check at least one timerSetTime usage exists
    const timerSetTimeCount = (source.match(/timerSetTime\(/g) || []).length;
    expect(timerSetTimeCount).toBeGreaterThanOrEqual(1);
  });

  it('pendingGameStart effect deps do not include gameTimer object', () => {
    // Find the deps array of the pendingGameStart effect (the one after startGame is defined)
    // It should include timerReset/timerSetTime but NOT gameTimer
    const effectDepsMatch = source.match(
      /\[pendingGameStart[^\]]*\]/g
    );
    expect(effectDepsMatch).not.toBeNull();
    const depsStr = effectDepsMatch!.join('');
    expect(depsStr).not.toMatch(/\bgameTimer\b/);
  });

  it('activation effect deps do not include gameTimer object', () => {
    // Find the deps array that contains timerResume — it's the activation effect
    // The old array had gameTimer; the new one has timerResume
    expect(source).toMatch(/\btimerResume\b[^[]*\[/); // timerResume referenced before a deps array
    // gameTimer should not appear in any effect deps array
    const depsArrayMatches = source.match(/\[[^\]]*gameTimer[^\]]*\]/g);
    expect(depsArrayMatches).toBeNull();
  });

  it('onGameStartConsumed called inside startGame function for delayed path', () => {
    // The startGame function body should call onGameStartConsumed
    // This ensures late-join path doesn't cancel the timeout prematurely
    const startGameIdx = source.indexOf('const startGame = ()');
    expect(startGameIdx).toBeGreaterThan(0);
    // Slice from `const startGame = ()` up to the matching arrow-function closer
    // (`\n    };\n` at the same indent). Fixed-byte windows have proven brittle —
    // the body grew past a 1200-char window when the dedup-guard block was added.
    const after = source.slice(startGameIdx);
    const closeIdx = after.indexOf('\n    };\n');
    expect(closeIdx).toBeGreaterThan(0);
    const startGameBody = after.slice(0, closeIdx);
    expect(startGameBody).toMatch(/onGameStartConsumed\(\)/);
  });
});
