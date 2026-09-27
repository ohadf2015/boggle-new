/**
 * useHostGameEvents — where a host goes when the round ends (source contract).
 *
 * ORIGINAL BUG (kept, still covered): a desktop host who had toggled TV
 * broadcast mode persisted `hostPlayingEnabled=false`. Arcade wheel-rush has
 * no TV broadcast results view, so the `hostPlayingRef.current` gate left them
 * on a dead game screen forever. Fix: bypass the gate for that mode.
 *
 * THE BUG THIS FILE NOW ALSO PINS: the bypass was written as a bare
 * `hostPlayingRef.current || isWheelRush`, which also fired for CLASSROOM
 * wheel-rush rooms. A teacher who set NEXT ROUND MODE to `random` and drew
 * wheel-rush was pushed off HostView onto the arcade ResultsPage — and
 * `ClassroomTvResultsScreen`, the only thing that paints `[data-round-end-stage]`
 * on a projector, lives inside HostView. Worse, the bypass payload omitted
 * `classroomSummary`, so the ResultsPage fallback could not render the lesson
 * recap either. Both halves are asserted below; either one alone still loses
 * the recap on one of the two ways a teacher can reach ResultsPage.
 *
 * The decision now lives in `lib/education/roundEndResultsRoute`, tested
 * behaviourally there (including the arcade control case that stops the fix
 * passing by hardcoding false). This file only proves the handler calls it and
 * carries the field.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('useHostGameEvents — end-of-round host routing', () => {
  const source = readFileSync(
    resolve(__dirname, '../socket/useHostGameEvents.ts'),
    'utf8',
  );

  it('imports the shared routing decision instead of branching on gameMode inline', () => {
    expect(source).toMatch(/hostLeavesProjectorRecap/);
    expect(source).toMatch(/roundEndResultsRoute/);
  });

  it('no longer OR-combines hostPlayingRef with a bare wheel-rush flag', () => {
    // The exact expression that lost the classroom recap.
    expect(source).not.toMatch(/hostPlayingRef\.current\s*\|\|\s*isWheelRush/);
  });

  it('feeds the decision the classroom flag from the results payload', () => {
    expect(source).toMatch(/hasClassroomSummary:\s*!!data\.classroomSummary/);
    expect(source).toMatch(/gameMode:\s*data\.gameMode/);
    expect(source).toMatch(/hostPlaying:\s*hostPlayingRef\.current/);
  });

  it('validatedScores invocation uses the compound gate', () => {
    expect(source).toMatch(/shouldShowResults\s*&&\s*currentOnShowResults/);
    // wheelRushSummary still passed through — confirms we're at the right site.
    expect(source).toMatch(/wheelRushSummary:\s*data\.wheelRushSummary/);
  });

  it('the onShowResults payload carries classroomSummary', () => {
    // The second half of the fix. A host whose `hostPlaying` is true reaches
    // ResultsPage legitimately; without this field their lesson recap is gone
    // even though the routing change never fires for them.
    // Scope to the validatedScores invocation — there is a second, empty
    // fallback call elsewhere in the file that carries nothing on purpose.
    const call = source
      .match(/currentOnShowResults\(\{[\s\S]*?\}\);/g)
      ?.find((c) => c.includes('wheelRushSummary'));
    expect(call).toBeDefined();
    expect(call!).toMatch(/classroomSummary:\s*data\.classroomSummary/);
  });

  it('still sets finalScores with classroomSummary for the TV broadcast view', () => {
    expect(source).toMatch(/setFinalScores\(\{[\s\S]*?classroomSummary:\s*data\.classroomSummary/);
  });
});
