/**
 * ResultsPage — in a classroom round the lesson recap owns the top slot.
 *
 * The student half of the Random-mode defect. When a rematch drew wheel-rush,
 * `WheelRushResultsScene` ("WHEEL SETTLES") took the slot that
 * `ClassroomResultsCard` holds in a Classic round, pushing the podium, the
 * "+N vs last round" chip and the coverage meter below the fold on a 390px
 * phone. Compare the r5 capture's `r1_noa_recap.png` (Lesson recap, first
 * card) with `r2_noa_390x844_+0s.png` (WHEEL SETTLES, first card). The recap
 * was DISPLACED, not absent — the BUGS row's "never mounts on either screen"
 * is true of the projector only.
 *
 * Rendering ResultsPage needs a large web of contexts and dynamic chunks (see
 * ResultsPage.blastMpResults.test.tsx, which tests its mapper for the same
 * reason), so the decision itself is tested behaviourally in
 * lib/education/__tests__/roundEndResultsRoute.test.ts and this file pins that
 * BOTH layouts — desktop and mobile — consult it. Two layouts answering this
 * differently is how the gap would come back (pitfalls Class 3).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(__dirname, '../ResultsPage.tsx'), 'utf8');

describe('ResultsPage — mode hero scenes yield to the classroom recap', () => {
  it('imports the shared hero-slot predicate', () => {
    expect(source).toMatch(/modeSceneOwnsHeroSlot/);
    expect(source).toMatch(/roundEndResultsRoute/);
  });

  // Deliberately not counting render sites or pinning the assignment's exact
  // spelling: a reformat or a third hero scene would then fail a test on a
  // file this piece does not own. The rule is "every hero-scene gate mentions
  // the flag", which is what actually protects the recap.
  it('every wheel-rush hero gate mentions the flag (desktop and mobile)', () => {
    const gates = (source.match(/^.*(isWheelRush|resolvedGameMode === 'wheel-rush').*$/gm) ?? [])
      .filter((l) => l.includes('&&') && l.includes('{'));
    expect(gates.length).toBeGreaterThan(0);
    for (const gate of gates) expect(gate).toMatch(/heroSlotOwnedByMode/);
  });

  it('every blast hero gate mentions it too, so the next Random draw cannot repeat this', () => {
    const gates = source.match(/^.*resolvedGameMode === 'blast' && .*blastMpResults.*$/gm) ?? [];
    expect(gates.length).toBeGreaterThan(0);
    for (const gate of gates) expect(gate).toMatch(/heroSlotOwnedByMode/);
  });

  it('derives the flag from classroomSummary, the same value the recap renders on', () => {
    expect(source).toMatch(/heroSlotOwnedByMode[\s\S]{0,80}hasClassroomSummary[\s\S]{0,40}classroomSummary/);
  });

  it('still renders the classroom recap from classroomSummary alone', () => {
    expect(source).toMatch(/const postGameWordReviewNode = classroomSummary \?/);
  });
});
