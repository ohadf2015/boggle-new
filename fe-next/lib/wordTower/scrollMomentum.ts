/**
 * Word Tower — inertial scroll model (pure, frame-rate independent).
 *
 * Founder: "make it fun and fast to scroll down the tower." A 1:1 drag on a
 * 300m tower is a slog. This adds a momentum FLING — release a drag with speed
 * and the camera keeps gliding, decaying under friction until it rests or hits a
 * bound. Wheel deltas are amplified so a mouse scroll covers ground quickly.
 *
 * Kept pure + framerate-independent (decay uses elapsed ms, not a per-frame
 * constant) so the feel is identical at 60 / 120 Hz, and unit-testable without a
 * canvas. The component owns the rAF loop and bounds; this owns the physics.
 */

/** Velocity decay constant (per ms). Higher = the fling stops sooner. */
export const FRICTION_PER_MS = 0.004;
/** Below this speed (px/ms) the glide has effectively stopped — snap to rest. */
export const MIN_FLICK_VELOCITY = 0.04;
/** Hard cap on launch speed (px/ms) so a frantic swipe can't rocket off-screen. */
export const MAX_FLICK_VELOCITY = 4;
/** Wheel deltas are multiplied by this so a tall tower scrolls fast, not 1:1. */
export const WHEEL_SCALE = 1.6;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Cap a launch velocity's magnitude (both directions) to {@link MAX_FLICK_VELOCITY}. */
export function clampFlickVelocity(v: number): number {
  return clamp(v, -MAX_FLICK_VELOCITY, MAX_FLICK_VELOCITY);
}

export interface MomentumStep {
  /** New pan offset, clamped to [lo, hi]. */
  y: number;
  /** Remaining velocity (px/ms); 0 once the glide has come to rest. */
  v: number;
  /** True when the loop should stop (velocity spent or a bound was hit). */
  done: boolean;
}

/**
 * Advance an inertial pan by `dtMs`. Velocity decays exponentially (so the feel
 * is the same at any refresh rate), the offset moves with it, and the glide ends
 * the moment it slows below {@link MIN_FLICK_VELOCITY} or runs into a bound — no
 * overscroll bounce (the tower base / build line are hard stops).
 */
export function stepMomentum(y: number, v: number, dtMs: number, lo: number, hi: number): MomentumStep {
  const decayed = v * Math.exp(-FRICTION_PER_MS * dtMs);
  if (Math.abs(decayed) < MIN_FLICK_VELOCITY) return { y, v: 0, done: true };
  const nextY = y + decayed * dtMs;
  const clamped = clamp(nextY, lo, hi);
  if (clamped !== nextY) return { y: clamped, v: 0, done: true }; // hit a bound → stop dead
  return { y: clamped, v: decayed, done: false };
}
