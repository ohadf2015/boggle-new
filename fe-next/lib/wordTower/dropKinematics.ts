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

/** Fraction of the ballistic drift actually applied. Bumped 0.5→0.58 so
 *  release-before-center (the Tower Bloxx skill) is legible without runaway. */
export const CARRY_FACTOR = 0.58;
/** Hard cap on momentum drift in normalized offset units. */
export const MAX_DRIFT = 0.38;
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
