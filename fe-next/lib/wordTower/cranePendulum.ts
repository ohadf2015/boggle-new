/**
 * Word Tower — carried-load pendulum (pure, MECHANICAL).
 *
 * A real crane's hanging load lags the trolley: as the carriage slides, the load
 * swings back, overshoots, and settles — that lag is what sells "this block has
 * weight and gravity is acting on it". This module is a tiny spring-damper that
 * trails a target tilt derived from the trolley's velocity.
 *
 * HARD RULE (2026-07-02 inversion) — the LOAD is the scored object. The player
 * watches the hanging girder, not the invisible trolley, so the drop verdict
 * reads {@link loadOffsetNorm} (trolley + the pendulum's horizontal
 * displacement). WYSIWYG now holds BECAUSE the swing counts: the live band
 * preview, landing shadow, and verdict must all derive from the same
 * `loadOffsetNorm` — never mix trolley-only and load-based reads.
 */

/** Max tilt (deg) of the hanging load at full trolley speed. Timing the swing
 *  is a real skill input now, so the arc is slightly bigger than the old
 *  cosmetic 8° to stay legible. */
export const PENDULUM_MAX_DEG = 10;

/**
 * Horizontal offset of the load's CENTRE in the crane's normalised [-1,1]
 * space: the trolley offset plus the pendulum tilt swung over the arm
 * (joint → girder centre). This is what the player actually aims with —
 * verdict + preview + shadow all read it.
 */
export function loadOffsetNorm(
  trolleyNorm: number,
  angleDeg: number,
  armPx: number,
  rangePx: number,
): number {
  if (!(rangePx > 0)) return trolleyNorm;
  const v = trolleyNorm + Math.sin((angleDeg * Math.PI) / 180) * (armPx / rangePx);
  return v === 0 ? 0 : v; // normalise -0 → 0
}

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

/**
 * Post-release cable whip: freed of its load, the cable springs UP (negative
 * px — it shortens) and settles with a damped wobble over the fall window.
 * `k` is fall progress in [0,1]. Render-only; never feeds the verdict.
 */
export function cableRecoilPx(k: number): number {
  const t = clamp(k, 0, 1);
  const v = -7 * Math.sin(Math.PI * 2.2 * t) * Math.exp(-3.5 * t) * (1 - t);
  return v === 0 ? 0 : v; // normalise -0 at the window edges
}
