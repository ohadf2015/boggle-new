/**
 * SP results must not hold the overlay quiet zone forever (UR P0 t_28bae74e).
 * Guests who land on /singleplayer never leave that route, so the cookie bar
 * only appears if results suspends the in-game quiet-zone input after the
 * round-end grace window. Playing stays a live board.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const viewSrc = readFileSync(join(dir, '../SinglePlayerView.tsx'), 'utf8');
const resultsSrc = readFileSync(join(dir, '../SinglePlayerResults.tsx'), 'utf8');
const practiceSrc = readFileSync(join(dir, '../results/PracticeResults.tsx'), 'utf8');

describe('SP results consent quiet-zone wiring', () => {
  it('keeps results in isInGame so the bottom nav stays hidden', () => {
    expect(viewSrc).toMatch(
      /setIsInGame\(phase === 'pre-game' \|\| phase === 'playing' \|\| phase === 'results'\)/,
    );
  });

  it('suspends the in-game quiet-zone input while results is on screen', () => {
    expect(viewSrc).toMatch(
      /if \(phase !== 'results'\) return undefined;\s*return suspendInGameOverlayQuietZone\(\);/,
    );
  });

  it('lifts the sticky results CTA above the compact consent bar', () => {
    expect(resultsSrc).toContain('bottom-[var(--cookie-consent-height,0px)]');
    expect(practiceSrc).toContain('bottom-[var(--cookie-consent-height,0px)]');
  });
});
