/**
 * Word Tower — momentum drop kinematics (pure).
 *
 * Tower Bloxx skill: the released block INHERITS the trolley's horizontal
 * velocity and drifts during the fall — you release slightly before centre
 * and watch it swing in. The projected landing offset (not the release
 * snapshot) feeds the verdict, and the live band preview uses the SAME
 * projection so the preview can never disagree with the verdict.
 */

import { FALL_MIN_MS } from './fallProfile';

/**
 * Fraction of the ballistic drift actually applied.
 *
 * Was 0.58, which combined with the old 0.38 cap to make the game unfair in a
 * way the UI hid: the trolley is a CONSTANT-VELOCITY triangle wave, so it is
 * never stationary and every release inherits momentum. Releasing with the beam
 * dead on the target projected 0.187–0.380 past it — against a `perfect` window
 * of 0.18. A dead-centre release therefore scored `good` in EVERY configuration;
 * the lead you had to apply was wider than the window you were leading into.
 *
 * Nobody noticed because the crane telegraphed the live band in lime, so players
 * released on the colour rather than on the mark. With the telegraph gone, the
 * numbers have to be honest on their own.
 */
export const CARRY_FACTOR = 0.25;
/**
 * Hard cap on momentum drift in normalized offset units.
 *
 * MUST stay a FRACTION of `PERFECT_MAX` (0.18) — not merely below it. Above the
 * window, some word-length/height combination is unwinnable by aiming however
 * well the release is timed (the bug this replaced). But at ~the window the cap
 * starts doing the player's work instead: every near-centre release lands
 * perfect and the timing stops mattering. `dropCalibration.test.ts` pins the
 * ratio at both ends rather than pinning this number.
 */
export const MAX_DRIFT = 0.10;
/**
 * Default fall duration (ms) — pinned to {@link FALL_MIN_MS} so this fallback can
 * never drift below the shortest real drop. It used to be a hardcoded 320 while
 * `fallDurationMs` returned 318–444, meaning a caller that omitted the argument
 * projected drift over a different window than the drop actually used.
 *
 * Callers should still pass the SAME depth-scaled `fallDurationMs` they animate
 * with; the live preview and the scored verdict must agree exactly or the
 * WYSIWYG invariant breaks (the shadow marks one spot, the verdict scores
 * another).
 */
export const FALL_MS = FALL_MIN_MS;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Projected landing offset: release position + clamped momentum drift. */
export function landingOffset(
  releaseOffset: number,
  velNormPerMs: number,
  fallMs: number = FALL_MS,
  carry: number = CARRY_FACTOR,
): number {
  const drift = clamp(velNormPerMs * fallMs * carry, -MAX_DRIFT, MAX_DRIFT);
  return releaseOffset + drift;
}

/**
 * Horizontal drift progress during the fall — ease-out so the block visibly
 * sheds sideways speed as gravity takes over (reads as air resistance), while
 * still landing exactly on the verdict offset at k=1.
 */
export function driftFracAt(k: number): number {
  const t = clamp(k, 0, 1);
  return 1 - (1 - t) * (1 - t);
}

/** EMA smoother for per-frame velocity samples (kills rAF jitter). */
export function smoothVelocity(prev: number, next: number): number {
  return prev + (next - prev) * 0.35;
}
