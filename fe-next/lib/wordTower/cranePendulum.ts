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
