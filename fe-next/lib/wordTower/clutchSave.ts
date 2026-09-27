/**
 * Word Tower — Clutch Save (pure).
 *
 * The crane already toppled a floor when a MISS lands after enough bad drops in
 * a row. The clutch save turns that brink into the biggest beat in the game:
 * once you're "on the brink" (enough consecutive shaky drops that the next one
 * decides everything), the next drop is do-or-die. Land it cleanly (perfect/good)
 * and you pull off a CLUTCH SAVE — the tower snaps upright with a gold burst and
 * a bass-thud shake. Fumble it (sloppy/miss) and it topples — the usual grace of
 * "only a miss topples" does NOT apply while you're already on the brink.
 *
 * The brink is keyed off `consecutiveSloppy` (the real topple precondition), NOT
 * the visible lean angle: a pure-sloppy run caps the lean below any useful
 * threshold, so a lean-degree gate would almost never fire. Lean is still used
 * to SIZE the celebration (how wild it looked) and to warn the player.
 *
 * Renderer-agnostic so the Pixi scene (snap-back tween, bass-thud, shake) and the
 * HUD warning can both consume it.
 */

import { LEAN_MAX_DEG } from './towerLean';
import { TOPPLE_AFTER_SLOPPY, type PlacementQuality } from './cranePlacement';

/** What a drop did while the tower was on the brink. */
export type ClutchOutcome = 'save' | 'topple' | 'none';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * On the brink = enough bad drops have stacked that the next shaky drop falls.
 * Mirrors the crane's existing topple precondition, so the clutch window is
 * reachable by construction.
 */
export function isOnBrink(consecutiveSloppy: number): boolean {
  return consecutiveSloppy >= TOPPLE_AFTER_SLOPPY;
}

/**
 * Resolve a drop made while on the brink. A controlled drop (perfect/good) saves
 * the run; a shaky one (sloppy/miss) topples it. Off the brink this is a no-op so
 * the caller falls through to the normal placement rules.
 */
export function evaluateClutch(onBrink: boolean, quality: PlacementQuality): ClutchOutcome {
  if (!onBrink) return 'none';
  return quality === 'perfect' || quality === 'good' ? 'save' : 'topple';
}

/**
 * Celebration magnitude for a save, 0..1 — scales with how far the tower had
 * leaned (how wild the rescue looked). Direction-agnostic, clamped.
 */
export function clutchSaveIntensity(leanDeg: number): number {
  return clamp01(Math.abs(leanDeg) / LEAN_MAX_DEG);
}

/**
 * The lean window after a successful save — emptied so the tower reads as
 * upright again. The scene animates the snap; the model just resets the history.
 */
export function stabilizeAfterClutch(): number[] {
  return [];
}
