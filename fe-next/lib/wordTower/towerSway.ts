/**
 * Word Tower — unstable-tower sway (pure).
 *
 * When the tower gets shaky (bad-drop streak / steep lean) it should SWING,
 * and that swing should make the next placement genuinely harder — the
 * tower-top is now a moving target. Two hard rules keep it fair, not cruel:
 *
 *  1. **Zero in normal play.** Below {@link SWAY_START_INSTABILITY} the
 *     amplitude is exactly 0, so a steady tower never wobbles.
 *  2. **WYSIWYG / fair-hard.** The sway offset is added to the *effective* drop
 *     error via {@link effectiveDropError}; the UI feeds the SAME sway offset to
 *     the landing shadow + reticle, so the player always sees the true landing
 *     point. Tracking the moving top still lands perfect (see tests); only
 *     fighting it is punished.
 *
 * Reduced-motion: callers pass a sway offset of 0, so `effectiveDropError`
 * collapses to the raw crane error and nothing oscillates.
 */

import { TOPPLE_AFTER_SLOPPY } from './cranePlacement';
import { LEAN_MAX_DEG } from './towerLean';

/** Max sway angle (deg) at full instability. */
export const SWAY_MAX_DEG = 5;
/** Below this instability the tower is steady — no sway at all. */
export const SWAY_START_INSTABILITY = 0.3;
/** Sway oscillation period (ms): calmer when barely unstable, frantic at the brink. */
export const SWAY_PERIOD_CALM_MS = 1400;
export const SWAY_PERIOD_FRANTIC_MS = 900;
/** How far (in crane [-1,1] error space) the top shifts at the max sway angle. */
export const SWAY_OFFSET_AT_MAX = 0.35;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const clamp01 = (n: number) => clamp(n, 0, 1);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * How unstable the tower is, normalised 0..1, from the bad-drop streak and the
 * current visible lean. Either signal alone can drive it (whichever is worse).
 */
export function swayInstability(consecutiveSloppy: number, leanDegAbs: number): number {
  const fromSloppy = clamp01(Math.max(0, consecutiveSloppy) / (TOPPLE_AFTER_SLOPPY + 1));
  const fromLean = clamp01(Math.abs(leanDegAbs) / LEAN_MAX_DEG);
  return clamp01(Math.max(fromSloppy, fromLean));
}

/** Sway amplitude (deg) — gated below {@link SWAY_START_INSTABILITY}, then ramps to the max. */
export function swayAmplitudeDeg(instability: number): number {
  const i = clamp01(instability);
  if (i <= SWAY_START_INSTABILITY) return 0;
  const t = (i - SWAY_START_INSTABILITY) / (1 - SWAY_START_INSTABILITY);
  return t * SWAY_MAX_DEG;
}

/** Sway oscillation period (ms) — shorter (faster) the more unstable. */
export function swayPeriodMs(instability: number): number {
  return lerp(SWAY_PERIOD_CALM_MS, SWAY_PERIOD_FRANTIC_MS, clamp01(instability));
}

/**
 * Signed sway angle (deg) at `elapsedMs` for a given instability — a natural
 * sinusoidal pendulum within the amplitude envelope. Zero while stable.
 */
export function swayAngleAt(elapsedMs: number, instability: number): number {
  const amp = swayAmplitudeDeg(instability);
  if (amp === 0) return 0;
  const period = swayPeriodMs(instability);
  return amp * Math.sin((2 * Math.PI * elapsedMs) / period);
}

/**
 * Convert a sway angle (deg) to the horizontal shift of the tower-top in the
 * crane's signed [-1,1] error space. A lean to +x moves the landing target +x.
 */
export function swayNormalizedOffset(angleDeg: number): number {
  return (angleDeg / SWAY_MAX_DEG) * SWAY_OFFSET_AT_MAX;
}

/**
 * Effective drop error fed to `evaluatePlacement`: the gap between where the
 * beam was dropped (`signedCraneOffset`) and where the swaying top actually is
 * (`signedSwayOffset`), clamped to [0,1]. With no sway it's just the raw error.
 */
export function effectiveDropError(signedCraneOffset: number, signedSwayOffset: number): number {
  return clamp01(Math.abs(signedCraneOffset - signedSwayOffset));
}
