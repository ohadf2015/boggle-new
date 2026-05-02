/**
 * PlayerView — countdown selection-gate contract
 *
 * During the pre-game countdown (ModeRevealOverlay 2s → GoRipplesAnimation
 * 3-2-1-GO ~4s) players must NOT be able to tap tiles. The grid's
 * `interactive` prop is gated on `!showStartAnimation` in PortraitLayout, so
 * PlayerView must collapse both phases (showModeReveal || showStartAnimation)
 * into the `showStartAnimation` prop forwarded to PlayerInGameView.
 *
 * Additionally, ModeRevealOverlay must mount as an overlay sibling to
 * GoRipplesAnimation in the in-game-view branch — the early-return at the
 * pre-game-data branch becomes unreachable once setLetterGrid + gameTimer
 * batch with setShowModeReveal in the same commit.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PlayerView — countdown selection gate', () => {
  const source = readFileSync(
    resolve(__dirname, '../PlayerView.tsx'),
    'utf8',
  );

  it('forwards (showModeReveal || showStartAnimation) as showStartAnimation prop', () => {
    expect(source).toMatch(
      /showStartAnimation=\{(showModeReveal\s*\|\|\s*showStartAnimation|showStartAnimation\s*\|\|\s*showModeReveal)\}/,
    );
  });

  it('mounts ModeRevealOverlay as overlay sibling in the in-game-view branch', () => {
    const idx = source.indexOf('<PlayerInGameView');
    expect(idx).toBeGreaterThan(0);
    const before = source.slice(Math.max(0, idx - 1500), idx);
    expect(before).toMatch(/showModeReveal\s*&&\s*\(?\s*<ModeRevealOverlay/);
  });
});
