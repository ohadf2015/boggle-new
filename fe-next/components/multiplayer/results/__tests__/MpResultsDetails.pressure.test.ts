/**
 * The DETAILS sheet (MpResultsDetails) is where the lesson recap lives — and
 * under a hidden leaderboard it must reach the recap with the placings turned
 * off before the final reveal. The sheet's ClassroomResultsCard arrives via
 * next/dynamic, which every screen suite stubs to null, so the wiring is
 * pinned at the source (the same pattern as
 * MpResultsDetails.classroomHeroSlot.test.ts); the card's behaviour under the
 * prop is covered by ClassroomResultsCard.hidden.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(__dirname, '../MpResultsDetails.tsx'), 'utf8');

describe('MpResultsDetails — calm dial reaches the lesson recap', () => {
  it('reads the teacher pressure off the classroom store', () => {
    expect(source).toContain('useClassroomPressure');
  });

  it('hides placings only under a hidden leaderboard AND before the final round', () => {
    expect(source).toContain('isLeaderboardHidden');
    expect(source).toMatch(/seriesRoundNumber.*seriesTotalGames|seriesTotalGames.*seriesRoundNumber/);
  });

  it('passes the gate to the recap card', () => {
    expect(source).toMatch(/<ClassroomResultsCard[\s\S]*?hideClassPlacings=/);
  });

  it('suppresses the revenge card with the same gate — it names the winner and the gap', () => {
    expect(source).toContain('suppressRevenge: hideClassPlacings');
  });
});
