/**
 * "Rematch — same list, same code" has to mean it.
 *
 * Observed live on 2026-09-11 (room DQRV92): a Classic classroom round ended,
 * the teacher pressed the one button on the projector, and the class landed in
 * WORD HUNT. `handleStartNewGame` emits `gameMode: hostSelectedGameMode ||
 * 'random'`, and a classroom host never sets that store — the room's mode comes
 * from the lesson, so the falsy store resolved to `'random'` and the server
 * dealt a different game.
 *
 * That is deliberate for a general host who chose "Random" and wants a new
 * surprise each round, so the fix is not to change the default: the classroom
 * rematch PASSES the mode it just played, and the general path is untouched.
 *
 * Asserted against the sources because the wiring is what breaks — a unit test
 * of the hook would mock exactly the socket emit whose payload is the bug
 * (Pitfall Class 3: two paths to "start a game", one of them silently
 * different).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../../../..');
const actions = readFileSync(join(root, 'host/hooks/useHostGameActions.ts'), 'utf8');
const hostView = readFileSync(join(root, 'host/HostView.tsx'), 'utf8');

describe('the classroom rematch', () => {
  it('lets a caller pin the mode instead of always re-rolling it', () => {
    // The restart emit must be able to carry a caller-supplied mode.
    expect(actions).toMatch(/handleStartNewGame\s*=\s*useCallback\(\s*\(\s*options/);
    expect(actions).toMatch(/options\?\.gameMode\s*\|\|\s*hostSelectedGameMode\s*\|\|\s*'random'/);
  });

  it('keeps the general host\'s "Random" meaning a fresh mode every round', () => {
    // No caller mode ⇒ the old expression exactly. A general results screen
    // calls `handleStartNewGame()` with nothing and must not change behaviour.
    expect(actions).toMatch(/hostSelectedGameMode\s*\|\|\s*'random'/);
  });

  it('hands the projector rematch the mode the class just played', () => {
    // HostView's TV-results branch is the classroom teacher's only rematch.
    const branch = hostView.slice(hostView.indexOf('<TvResultsView'));
    expect(branch).toMatch(/handleStartNewGame\(\s*\{\s*gameMode:\s*currentGameMode/);
  });
});
