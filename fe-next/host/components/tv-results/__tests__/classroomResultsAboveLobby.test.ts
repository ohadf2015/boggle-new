/**
 * The projector's results screen must PAINT above the projector's lobby.
 *
 * THE BUG THIS LOCKS DOWN — round 2's single disqualifying gap. The verdict
 * said the celebration "renders and unmounts in well under a second". It never
 * unmounted. The capture's own innerText dumps prove it: at t=0 AND at t=+4s
 * the projector DOM carried the lobby ("PLAYING NOW / CHANGE GAME") and the
 * results ("WE HAVE A WINNER! / TOP SCORERS") at the same time, and by +4s the
 * reveal had resolved to real names. Both surfaces are `fixed inset-0` and both
 * are opaque; `ProjectorLobby` sits at z-[65] and the results view sat at
 * z-[60], so the lobby painted straight over the celebration. `wait --text`
 * and `getBoundingClientRect` both passed — neither models paint occlusion,
 * which is exactly why four increasingly rigorous probes all missed it.
 *
 * That makes it recurring-pitfall Class 3 wearing a z-index: two surfaces that
 * both believe they own the viewport, where only one of them is ever looked at.
 *
 * A render test cannot catch it — jsdom has no paint. So this test reads the
 * two files and compares the numbers a browser would compare. It fails if
 * anyone raises the lobby, lowers the results, or drops the token entirely.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PROJECTOR_LOBBY_Z,
  PROJECTOR_RESULTS_Z,
  projectorResultsCoverLobby,
} from '@/lib/education/roundEndLayer';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/** Highest `z-[NN]` arbitrary value in a file — what actually wins the stack. */
function topZ(source: string): number {
  const found = [...source.matchAll(/z-\[(\d+)\]/g)].map((m) => Number(m[1]));
  return found.length ? Math.max(...found) : 0;
}

describe('projector results paint above the projector lobby', () => {
  it('states the lobby z-index the real lobby file uses', () => {
    // If the lobby moves, this fails here rather than silently on a wall in
    // front of thirty children.
    expect(topZ(read('components/education/projector/ProjectorLobby.tsx'))).toBe(
      PROJECTOR_LOBBY_Z
    );
  });

  it('puts the classroom results screen above it', () => {
    expect(PROJECTOR_RESULTS_Z).toBeGreaterThan(PROJECTOR_LOBBY_Z);
    expect(projectorResultsCoverLobby()).toBe(true);
  });

  it('ships that z-index in the screen the projector actually renders', () => {
    const screen = read('host/components/tv-results/ClassroomTvResultsScreen.tsx');
    expect(screen).toContain(`z-[${PROJECTOR_RESULTS_Z}]`);
    expect(topZ(screen)).toBeGreaterThan(PROJECTOR_LOBBY_Z);
  });

  it('paints its own opaque navy ground, so the lobby cannot show through', () => {
    const screen = read('host/components/tv-results/ClassroomTvResultsScreen.tsx');
    expect(screen).toContain('bg-neo-navy');
    // Class 5: the cream/dark pair flashes cream on a lazy mount. A dark-only
    // game surface hardcodes navy.
    expect(screen).not.toContain('bg-neo-cream');
    expect(screen).toContain('fixed inset-0');
  });

  it('hands the classroom branch off before the arcade results chrome', () => {
    // The arcade screen stacks a gradient ground, a DJ mascot, an install QR,
    // a ready indicator, a word selector and a controls bar around the recap —
    // nine things competing on a wall that should read one. The classroom
    // branch returns before any of it.
    const view = read('host/components/tv-results/TvResultsView.tsx');
    expect(view).toContain('ClassroomTvResultsScreen');
    expect(view).toMatch(/if\s*\(classroomSummary\)\s*\{?\s*\n?\s*return/);
  });
});
