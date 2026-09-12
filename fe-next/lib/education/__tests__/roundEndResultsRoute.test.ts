/**
 * roundEndResultsRoute — the classroom recap must survive EVERY next-round mode.
 *
 * THE BUG (r5 capture, room PCJYXT, 1184 samples with `[data-round-end-stage]`
 * absent): the results sticky bar lets the teacher set NEXT ROUND MODE to
 * `random`, which the server resolves from its own ALL_GAME_MODES pool.
 * When it resolved to `wheel-rush`, `useHostGameEvents` hit a mode-specific
 * bypass — `hostPlayingRef.current || isWheelRush` — that pushed the teacher
 * off HostView onto the arcade ResultsPage. `ClassroomTvResultsScreen`, the
 * ONLY thing that paints the recap on a projector, lives inside HostView, so
 * it never mounted; and the bypass payload omitted `classroomSummary`, so the
 * ResultsPage fallback could not render `ClassroomResultsCard` either. The
 * room went live play -> "WHEEL SETTLES" (WheelRushResultsScene, the mode's
 * own results hero — NOT a mode-picker roulette) -> next lobby, with no
 * podium, no coverage meter and no win moment.
 *
 * The bypass was itself a real fix (a broadcast-mode host in an ARCADE
 * wheel-rush room otherwise sat on the game screen forever, because arcade
 * wheel-rush has no TV results view). So the control case below matters as
 * much as the fix: an arcade wheel-rush room must STILL route the host away.
 * Routing and rendering now key on the same value — `classroomSummary` — so
 * they cannot disagree (recurring-pitfalls Class 3, asymmetric paths).
 */
import { describe, it, expect } from 'vitest';
import {
  hostLeavesProjectorRecap,
  modeSceneOwnsHeroSlot,
  NEXT_ROUND_MODES,
} from '../roundEndResultsRoute';

describe('hostLeavesProjectorRecap — classroom rounds keep their projector recap', () => {
  it('THE BUG: a classroom wheel-rush round keeps the teacher on the projector recap', () => {
    expect(
      hostLeavesProjectorRecap({
        hostPlaying: false,
        gameMode: 'wheel-rush',
        hasClassroomSummary: true,
      }),
    ).toBe(false);
  });

  it.each(NEXT_ROUND_MODES.filter((m) => m !== 'random'))(
    'a classroom round in %s mode keeps the teacher on the projector recap',
    (gameMode) => {
      expect(
        hostLeavesProjectorRecap({ hostPlaying: false, gameMode, hasClassroomSummary: true }),
      ).toBe(false);
    },
  );

  it('an unknown / future mode string still keeps the classroom recap', () => {
    expect(
      hostLeavesProjectorRecap({
        hostPlaying: false,
        gameMode: 'some-mode-shipped-next-sprint',
        hasClassroomSummary: true,
      }),
    ).toBe(false);
  });

  it('a missing gameMode keeps the classroom recap', () => {
    expect(
      hostLeavesProjectorRecap({ hostPlaying: false, hasClassroomSummary: true }),
    ).toBe(false);
  });

  it('CONTROL: an ARCADE wheel-rush room still routes a broadcast host away (the original fix)', () => {
    // If this ever returns false the teacher is fixed but every arcade
    // wheel-rush host is stuck on the game screen again — the exact bug the
    // bypass was written for. The fix cannot pass by hardcoding false.
    expect(
      hostLeavesProjectorRecap({
        hostPlaying: false,
        gameMode: 'wheel-rush',
        hasClassroomSummary: false,
      }),
    ).toBe(true);
  });

  it('CONTROL: an arcade CLASSIC room still stays on the TV results view', () => {
    expect(
      hostLeavesProjectorRecap({
        hostPlaying: false,
        gameMode: 'classic',
        hasClassroomSummary: false,
      }),
    ).toBe(false);
  });

  it('a host who is PLAYING always gets the standard results page, arcade or classroom', () => {
    expect(
      hostLeavesProjectorRecap({ hostPlaying: true, gameMode: 'classic', hasClassroomSummary: false }),
    ).toBe(true);
    expect(
      hostLeavesProjectorRecap({ hostPlaying: true, gameMode: 'wheel-rush', hasClassroomSummary: true }),
    ).toBe(true);
  });
});

describe('modeSceneOwnsHeroSlot — the lesson recap is the moment, not the mode scene', () => {
  it('a classroom round gives the top slot to the lesson recap, not the mode hero', () => {
    // The student half of the same defect: the recap was DISPLACED, not
    // absent — WheelRushResultsScene took the slot the lesson recap holds in
    // a classic round (compare r1_noa_recap.png with r2_noa_390x844_+0s.png).
    expect(modeSceneOwnsHeroSlot({ hasClassroomSummary: true })).toBe(false);
  });

  it('an arcade round keeps its mode hero scene untouched', () => {
    expect(modeSceneOwnsHeroSlot({ hasClassroomSummary: false })).toBe(true);
  });
});

describe('NEXT_ROUND_MODES', () => {
  it('covers the modes the selector offers, without pinning the set', () => {
    // Containment, not equality: `random` is resolved server-side from
    // ALL_GAME_MODES, a superset of this list, so an exact match here would
    // claim something false AND go red the next time a mode is added to the
    // selector. The routing does not enumerate modes at all — the
    // unknown-mode case above is what actually protects the recap.
    expect([...NEXT_ROUND_MODES]).toEqual(
      expect.arrayContaining(['classic', 'wheel-rush', 'blast', 'word-hunt', 'random']),
    );
  });
});
