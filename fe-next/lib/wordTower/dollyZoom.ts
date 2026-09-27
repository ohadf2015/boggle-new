/**
 * Word Tower — altitude dolly (pure).
 *
 * Vertigo cue: as the player climbs, the WORLD behind the tower should slowly
 * recede ("the ground falls away"). We get this by gently scaling the parallax
 * BACKDROP up with viewed altitude — NOT the tower container, whose transform is
 * load-bearing for the camera/pan/landing math (scaling it would need a camera
 * re-pivot). Backdrop-only keeps every gameplay coordinate byte-identical, so
 * the effect is purely perceptual and leaderboard-safe.
 *
 * Monotonic non-decreasing in altitude, eased so the early climb reads and the
 * top biomes plateau (a runaway zoom at 5000 m would tear the sky art).
 */

/** Backdrop scale at the top of the curve (deep space). 1.0 == no zoom. Kept
 *  subtle + ≥1 so the full-bleed backdrop never shrinks to expose its edges; the
 *  gentle push enlarges the near star-field as you climb (rising through space). */
export const DOLLY_MAX_SCALE = 1.06;
/** Altitude (m) at which the dolly reaches {@link DOLLY_MAX_SCALE}. */
export const DOLLY_FULL_ALT_M = 800;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Backdrop scale factor for a viewed altitude (m). 0 m → 1.0, easing up to the cap. */
export function dollyScaleFor(viewAltM: number): number {
  const t = clamp01((viewAltM ?? 0) / DOLLY_FULL_ALT_M);
  const eased = 1 - (1 - t) * (1 - t); // ease-out quad: fast start, gentle plateau
  return 1 + (DOLLY_MAX_SCALE - 1) * eased;
}
