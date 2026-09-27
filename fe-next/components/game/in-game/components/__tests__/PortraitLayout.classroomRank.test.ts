import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A classroom round runs through the SAME generic in-game screen as a public
 * multiplayer room — there is no classroom fork. So the two absolute-rank
 * surfaces a student's phone shows during play are both mounted here:
 *
 *   1. `MobileRankIndicator` — the "#N / total" pill plus the red
 *      "{name} passed you!" overtake alert.
 *   2. `GameLeaderboard` — the windowed class standings under the grid.
 *
 * Research (research.md §1) makes constant, visible, ABSOLUTE rank the harm —
 * points are not. So in a class session both are replaced by `StudentRankRail`
 * (own score + one neighbour), and in a public room nothing changes at all.
 *
 * Asserted against source because mounting PortraitLayout needs the whole game
 * chassis; what matters here is the branch existing, not its pixels.
 */
const SRC = readFileSync(
  join(process.cwd(), 'components/game/in-game/components/PortraitLayout.tsx'),
  'utf8',
);

describe('PortraitLayout — classroom students get the local-rank rail', () => {
  it('imports the education rail', () => {
    expect(SRC).toMatch(/import\s*\{\s*StudentRankRail\s*\}\s*from\s*'@\/components\/education\/StudentRankRail'/);
  });

  it('takes the classroom signal as a prop rather than re-reading the URL here', () => {
    // One reader of `?classroom=true` per tree; this layout is handed the answer.
    expect(SRC).toMatch(/isClassroomStudentPlay\??:\s*boolean/);
    expect(SRC).not.toMatch(/useSearchParams/);
  });

  it('renders StudentRankRail instead of MobileRankIndicator in a class session', () => {
    // Generous windows: the branch carries the explanatory comment with it.
    expect(SRC).toMatch(
      /isClassroomStudentPlay\s*\?[\s\S]{0,900}<StudentRankRail[\s\S]{0,900}<MobileRankIndicator/,
    );
  });

  it('still renders MobileRankIndicator for public multiplayer', () => {
    expect(SRC).toMatch(/<MobileRankIndicator/);
  });

  it('suppresses the full class standings board on a classroom student’s phone', () => {
    expect(SRC).toMatch(/!isClassroomStudentPlay[\s\S]{0,200}<GameLeaderboard/);
  });

  it('feeds the rail the same deferred leaderboard, not the raw socket burst', () => {
    expect(SRC).toMatch(/<StudentRankRail[\s\S]{0,300}leaderboard=\{deferredLeaderboard\}/);
  });

  it('feeds the rail the live word feedback so the mascot can react', () => {
    expect(SRC).toMatch(/<StudentRankRail[\s\S]{0,300}feedback=\{currentFeedback\}/);
  });
});
