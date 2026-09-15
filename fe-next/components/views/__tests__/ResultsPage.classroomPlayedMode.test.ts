/**
 * ResultsPage — a mode-specific results scene names the mode that was PLAYED.
 *
 * THE BUG: a Classic classroom round ended and the student's results card was
 * headed "Blast Results" (`blast.results.sceneTitle`, rendered by
 * `BlastResultsScene`). Nothing about the round was Blast.
 *
 * WHY. `useGameMode()` is not "the mode of the round that just ended" — it is
 * also the NEXT round's intent, written optimistically. `setGameMode` sets the
 * mode and clears `gameModeConfirmed`; only the server's `startGame` sets that
 * flag back. The teacher's mode picker writes through exactly that path:
 * `useClassroomModeSwitch` handles `classroomGameModeChanged`, a ROOM
 * broadcast, so a teacher lining up next round's mode from the podium rewrote
 * `gameMode` on every student's phone while those phones were showing the
 * previous round's results.
 *
 * `HostInGameView` has refused to render a mode view without
 * `gameModeConfirmed` since the "prevents classic flash" fix, and the game-end
 * telemetry gates on it too. The results surface was the one sibling that read
 * the flag's value and not the flag — recurring pitfall class 3.
 *
 * Rendering ResultsPage needs a large web of contexts and dynamic chunks (see
 * the sibling `ResultsPage.classroomHeroSlot.test.ts` for the same reasoning),
 * so the decision is tested behaviourally in
 * `lib/education/__tests__/roundEndResultsRoute.test.ts` and this file pins
 * that BOTH layouts — desktop and mobile — consult it. Two layouts answering
 * this differently is how the gap comes back.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(__dirname, '../ResultsPage.tsx'), 'utf8');

describe('ResultsPage — mode scenes reflect the mode actually played', () => {
  it('imports the shared predicate rather than reading the raw store value', () => {
    expect(source).toMatch(/playedGameMode/);
    expect(source).toMatch(/roundEndResultsRoute/);
  });

  it('derives the played mode from the CONFIRMED flag, not the bare mode', () => {
    expect(source).toMatch(
      /playedGameMode\(\{[\s\S]{0,120}gameModeConfirmed[\s\S]{0,60}\}\)/
    );
  });

  // The mode gates keep their existing identifier on purpose — renaming it
  // would break a sibling test that pins those gates for a different rule, and
  // this piece does not own that. What matters is that the identifier is no
  // longer the store's raw value: the store hook must reach the gates only
  // THROUGH the predicate, which is the single point the flag is honoured at.
  it('does not bind the mode gates straight to the store hook', () => {
    expect(source).not.toMatch(/const\s+resolvedGameMode\s*=\s*useGameMode\(\)/);
  });

  it('feeds the store hook into the predicate instead', () => {
    expect(source).toMatch(/useGameMode\(\)/);
    expect(source).toMatch(/useGameModeConfirmed\(\)/);
    expect(source).toMatch(/playedGameMode\(\{/);
  });

  it('LATCHES the last confirmed mode, so a correct card is never lost to the fix', () => {
    // Gating alone would drop wheel-rush, word-hunt and blastMpResults from a
    // round that legitimately had them, the moment the mode went unconfirmed.
    expect(source).toMatch(/lastConfirmedMode/);
    expect(source).toMatch(/resolvedGameMode\s*=\s*lastConfirmedMode\.current/);
  });

  it('still gates every mode hero on the classroom recap flag', () => {
    // The sibling invariant must survive this change, not be traded for it.
    const heroGates = (source.match(/^.*(blastMpResults|wheel-rush).*$/gm) ?? []).filter(
      (l) => l.includes('&&') && l.includes('{') && l.includes('===')
    );
    expect(heroGates.length).toBeGreaterThan(0);
    for (const gate of heroGates) expect(gate).toMatch(/heroSlotOwnedByMode/);
  });
});
