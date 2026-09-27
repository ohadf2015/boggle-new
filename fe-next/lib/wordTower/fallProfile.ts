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
export const FALL_MIN_MS = 360;
export const FALL_MAX_MS = 600;

/**
 * Fraction of the drop window spent FALLING; the remainder is the touchdown
 * settle (squash + rebound).
 *
 * The girder used to fall for the whole window and stop dead on the last frame,
 * because the crane unmounts the instant the placement commits — so any settle
 * appended AFTER the window was never rendered. Reserving the tail of the SAME
 * window instead buys a visible landing beat at zero added latency: the block
 * touches down early, squashes and rebounds, and the commit still fires exactly
 * when it always did.
 */
export const FALL_PHASE_FRAC = 0.76;

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
  return clamp(FALL_MIN_MS + d * 20, FALL_MIN_MS, FALL_MAX_MS);
}

/**
 * Settle-spring overshoot (fraction) after impact — the heavy tile dips past its
 * rest then springs back. Grows with depth, capped so a tall drop never flings.
 */
export function settleOvershoot(depthFloors: number): number {
  const d = Math.max(0, depthFloors);
  return clamp(0.06 + d * 0.02, 0.06, 0.4);
}

/** Shortest settle (ms) after touchdown — even a stubby drop gets a rebound. */
export const SETTLE_MIN_MS = 220;
/** Longest settle (ms) — a deep drop rings a little longer, but never lingers. */
export const SETTLE_MAX_MS = 420;

/**
 * How long the post-touchdown settle runs (ms) for a drop of `depthFloors`.
 * Deeper drop = more energy to shed = a slightly longer ring-out.
 */
export function settleDurationMs(depthFloors: number): number {
  const d = Math.max(0, depthFloors);
  return clamp(SETTLE_MIN_MS + d * 14, SETTLE_MIN_MS, SETTLE_MAX_MS);
}

/** Rebounds packed into the settle window. Deliberately just under 2 — one
 *  authoritative recovery plus a whisper. A whole-number count reads as a
 *  bouncing ball; concrete does not bounce twice at the same height. */
const SETTLE_REBOUNDS = 1.8;
/** Damping exponent on the rebound envelope. Higher = the second hop dies
 *  faster, i.e. heavier material. */
const SETTLE_DAMPING = 1.9;

/**
 * Upward rebound of a just-landed girder, as a fraction of its peak rebound
 * height, for settle progress `k` in 0..1.
 *
 * Always ≥ 0 — a block that has landed can only come back UP off its rest line,
 * never sink through the tower it just landed on. Starts and ends at rest, with
 * one clear rebound and a heavily-damped second. Multiply by
 * `fallPx * settleOvershoot(depthFloors)` for the pixel offset.
 */
export function settleBounceFrac(k: number): number {
  const t = clamp01(k);
  const envelope = Math.pow(1 - t, SETTLE_DAMPING);
  return Math.abs(Math.sin(Math.PI * SETTLE_REBOUNDS * t)) * envelope;
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
