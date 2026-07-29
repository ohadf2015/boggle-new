import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PlayerView — single countdown mount contract
 *
 * GoRipplesAnimation was mounted at two tree positions: once in the
 * `!showGameView` early-return branch (whose onComplete only flipped local
 * state and never emitted `countdownComplete` — so the server timer would
 * never start if it fired) and once in the main in-game-view return. A render
 * passing through both branches would unmount/remount the countdown and
 * restart it from 3.
 *
 * Fix: mount GoRipplesAnimation from exactly one position. The start sequence
 * (showModeReveal / showStartAnimation) always routes through the main return,
 * so the early-return branch never renders the countdown.
 */
const source = readFileSync(resolve(__dirname, '../PlayerView.tsx'), 'utf8');

describe('PlayerView — single countdown mount', () => {
  it('mounts GoRipplesAnimation from exactly one position', () => {
    const mounts = source.match(/<GoRipplesAnimation/g) ?? [];
    expect(mounts).toHaveLength(1);
  });

  it('does not render the countdown inside the !showGameView early-return branch', () => {
    const branchStart = source.indexOf('if (!showGameView');
    const mainReturn = source.indexOf('  return (\n    <>');
    expect(branchStart).toBeGreaterThan(0);
    expect(mainReturn).toBeGreaterThan(branchStart);
    const earlyReturnBlock = source.slice(branchStart, mainReturn);
    expect(earlyReturnBlock).not.toMatch(/GoRipplesAnimation/);
  });

  it('the surviving countdown mount emits countdownComplete to the server', () => {
    const idx = source.indexOf('<GoRipplesAnimation');
    const mount = source.slice(idx, idx + 400);
    expect(mount).toMatch(/sendCountdownComplete/);
  });
});
