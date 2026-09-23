import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `EducationHeader`'s back button defaults to `/{locale}/education`. On the
 * classroom-game screen (the only place multiplayer/PageClient.tsx renders
 * `EducationHeader`) that is wrong mid-game: a teacher/student who taps back
 * should land in their own hub (teacher dashboard / student hub), the same
 * decision `multiplayerExitDestination` already makes for every other exit
 * path in this file (leave-room, room-gone, etc).
 *
 * Guard the call site rather than re-testing `multiplayerExitDestination`
 * itself (already covered in lib/multiplayer/__tests__/exitDestination.test.ts)
 * — this file is an app shell no unit test can render (see
 * exitStripCallSites.test.ts for the same reasoning).
 */
const PAGE = join(__dirname, '..', 'PageClient.tsx');

describe('multiplayer EducationHeader back button uses multiplayerExitDestination', () => {
  const source = readFileSync(PAGE, 'utf8');

  it('passes a backHref to EducationHeader, not just showBackButton', () => {
    const match = source.match(/<EducationHeader\s+showBackButton[\s\S]*?\/>/);
    expect(match, 'EducationHeader render call not found in PageClient.tsx').not.toBeNull();
    expect(match![0]).toMatch(/backHref=/);
  });

  it('derives that backHref from multiplayerExitDestination', () => {
    const headerBlockStart = source.indexOf('<EducationHeader');
    expect(headerBlockStart).toBeGreaterThan(-1);
    // The backHref value should reference multiplayerExitDestination somewhere
    // on the same JSX line/expression, not a hardcoded '/education' string.
    const nearby = source.slice(Math.max(0, headerBlockStart - 400), headerBlockStart + 700);
    expect(nearby).toMatch(/multiplayerExitDestination/);
  });
});
