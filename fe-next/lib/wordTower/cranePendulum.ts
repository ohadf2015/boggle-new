/**
 * Word Tower — carried-load pendulum (pure, COSMETIC ONLY).
 *
 * A real crane's hanging load lags the trolley: as the carriage slides, the load
 * swings back, overshoots, and settles — that lag is what sells "this block has
 * weight and gravity is acting on it". This module is a tiny spring-damper that
 * trails a target tilt derived from the trolley's velocity.
 *
 * HARD RULE — this NEVER feeds scoring. The drop verdict reads only the trolley
 * offset + the (separate) tower-sway offset via `effectiveDropError`; the
 * pendulum tilt is a render-time rotation of the cable + beam and must stay out
 * of the placement math, or a perfectly-aimed drop would *look* misaligned and
 * we'd reintroduce the WYSIWYG lie the colour/sway work is fixing.
 */

/** Max cosmetic tilt (deg) of the hanging load at full trolley speed. */
export const PENDULUM_MAX_DEG = 8;

/** Peak cable stretch (px) at full drop intensity. The cable visibly elongates
 *  as the freed load yanks it, then snaps back taut. */
export const CABLE_STRETCH_MAX_PX = 14;

/**
 * Cosmetic cable stretch (px, ≥0) over the release→land progress `k` (0..1),
 * scaled by drop `intensity` (0..1, e.g. {@link dropQualityIntensity}). The load
 * yanks the cable taut early in the fall (fast attack via the `k^0.6` warp),
 * then the stretch relaxes to 0 as it settles — a "snap-back" read of weight.
 * PURELY a render hint for the cable's drawn length; never touches scoring.
 */
export function cableStretchAt(k: number, intensity: number): number {
  const t = clamp(k, 0, 1);
  const i = clamp(intensity, 0, 1);
  const attack = Math.sin(Math.PI * Math.pow(t, 0.6)); // rises fast, returns to 0 at t=1
  return CABLE_STRETCH_MAX_PX * i * attack * (1 - t);
}

export interface PendulumState {
  angleDeg: number;
  velDegPerSec: number;
}

export const REST_PENDULUM: PendulumState = { angleDeg: 0, velDegPerSec: 0 };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Target tilt (deg) for the load given the trolley's normalised signed velocity
 * (~[-1,1]). The load LAGS the carriage, so positive (rightward) velocity tilts
 * the load to a negative angle (it trails to the left) and vice-versa.
 */
export function pendulumTargetDeg(trolleyVelNorm: number, maxDeg: number = PENDULUM_MAX_DEG): number {
  const a = -clamp(trolleyVelNorm, -1, 1) * maxDeg;
  return a === 0 ? 0 : a; // normalise -0 → 0
}

/**
 * One explicit spring-damper step toward `targetDeg`. `dtMs` is clamped so a
 * stalled frame can't blow the integrator up. Stiffness/damping are tuned to
 * trail-and-settle (slightly under-damped) rather than wobble.
 */
export function stepPendulum(
  state: PendulumState,
  targetDeg: number,
  dtMs: number,
  stiffness = 90,
  damping = 13,
): PendulumState {
  const dt = clamp(dtMs, 0, 40) / 1000;
  const accel = stiffness * (targetDeg - state.angleDeg) - damping * state.velDegPerSec;
  const velDegPerSec = state.velDegPerSec + accel * dt;
  const angleDeg = state.angleDeg + velDegPerSec * dt;
  return { angleDeg, velDegPerSec };
}
