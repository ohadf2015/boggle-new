/**
 * Word Tower — drop gravity + impact profile (pure).
 *
 * The original fall was a fixed-duration cubic-bezier with a flat squash. This
 * gives the drop real WEIGHT: an accelerating (gravity) fall curve, a duration
 * + impact that scale with how far the block fell, and a little settle-spring
 * overshoot so the tile lands like a heavy girder instead of a sticker.
 *
 * `depthFloors` is how many floors below the crane the block fell (bigger =
 * harder landing). Reduced-motion callers skip the animation and place instantly.
 */

/** Animation duration bounds (ms). Floor raised so a short hang still feels weighty. */
export const FALL_MIN_MS = 300;
export const FALL_MAX_MS = 520;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const clamp01 = (n: number) => clamp(n, 0, 1);

/**
 * Fall position 0..1 for a linear progress `k` 0..1, under constant gravity —
 * starts slow, accelerates into the impact (k²). Clamped at the ends.
 */
export function fallEase(k: number): number {
  const t = clamp01(k);
  return t * t;
}

/** Fall duration (ms) — deeper drops take a touch longer, within sane bounds. */
export function fallDurationMs(depthFloors: number): number {
  const d = Math.max(0, depthFloors);
  return clamp(FALL_MIN_MS + d * 18, FALL_MIN_MS, FALL_MAX_MS);
}

/**
 * Settle-spring overshoot (fraction) after impact — the heavy tile dips past its
 * rest then springs back. Grows with depth, capped so a tall drop never flings.
 */
export function settleOvershoot(depthFloors: number): number {
  const d = Math.max(0, depthFloors);
  return clamp(0.06 + d * 0.02, 0.06, 0.4);
}

export interface ImpactParams {
  /** Vertical squash fraction on landing (0..1). */
  squash: number;
  /** Screen-shake amplitude (px). */
  shakePx: number;
  /** Debris/dust particle count to spawn. */
  debris: number;
}

/** Depth-scaled landing impact — squash, screen-shake and debris, all clamped. */
export function impactParams(depthFloors: number): ImpactParams {
  const d = Math.max(0, depthFloors);
  return {
    squash: clamp(0.12 + d * 0.02, 0.12, 0.4),
    shakePx: clamp(d * 0.7, 0, 12),
    debris: Math.round(clamp(4 + d * 1.4, 4, 20)),
  };
}
