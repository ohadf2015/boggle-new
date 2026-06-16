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

/** Max sway angle (deg) at full instability. Tuned DOWN from 5° — at the old
 *  value a tall tower's top whipped side-to-side ("goes crazy"), because the
 *  top's travel is height × sin(angle): same angle throws a 30-floor tower far
 *  wider than a 3-floor one. A gentler base angle + the height dampen below keep
 *  the swing legible instead of frantic. */
export const SWAY_MAX_DEG = 3.4;
/** Below this instability the tower is steady — no sway at all. */
export const SWAY_START_INSTABILITY = 0.3;
/** Sway oscillation period (ms): calmer when barely unstable, frantic at the
 *  brink. Slowed a touch so the swing reads as a heavy lean, not a jitter. */
export const SWAY_PERIOD_CALM_MS = 1600;
export const SWAY_PERIOD_FRANTIC_MS = 1050;
/** How far (in crane [-1,1] error space) the top shifts at the max sway angle.
 *  Lowered with the angle so the landing target drifts calmly, not jumpily. */
export const SWAY_OFFSET_AT_MAX = 0.26;

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

/** Floor count at which the tower-top travel is so large that even a small angle
 *  whips it — beyond here the dampen is at its floor. */
const SWAY_DAMPEN_FULL_FLOORS = 28;
/** Smallest dampen factor (a tall tower still sways, just calmly). */
const SWAY_DAMPEN_MIN = 0.45;

/**
 * Height dampen (0..1) applied to instability BEFORE it reaches the amplitude
 * ramp. The taller the tower, the further its top travels at a given angle, so
 * we shrink the effective instability as floors stack — keeping a 30-floor tower
 * from flailing while a short one still wobbles honestly. Fed into the SAME
 * `instability` value the crane + scene both read, so WYSIWYG stays locked.
 */
export function swayHeightDampen(floorCount: number): number {
  const f = clamp01(Math.max(0, floorCount) / SWAY_DAMPEN_FULL_FLOORS);
  return lerp(1, SWAY_DAMPEN_MIN, f);
}

/** A run of perfect drops at which "steady hands" reaches full calm. */
export const STEADY_FULL_STREAK = 5;
/** Floor of the steady-hands dampen — skill calms the crane but never removes
 *  the wobble entirely, so a tall tower still demands timing. */
export const STEADY_DAMPEN_MIN = 0.5;

/**
 * Skill reward on the DYNAMICS side: a run of perfect drops steadies the tower,
 * scaling instability DOWN (calmer sway, easier next drop) — the positive mirror
 * of the bad-drop streak that destabilises it. A single perfect doesn't pay yet
 * (streak ≤ 1 → ×1); the calm ramps in to {@link STEADY_DAMPEN_MIN} by
 * {@link STEADY_FULL_STREAK}, then holds, so flow feels earned but never trivial.
 */
export function steadyHandsDampen(perfectStreak: number): number {
  if (perfectStreak <= 1) return 1;
  const k = clamp01((perfectStreak - 1) / (STEADY_FULL_STREAK - 1));
  return lerp(1, STEADY_DAMPEN_MIN, k);
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
