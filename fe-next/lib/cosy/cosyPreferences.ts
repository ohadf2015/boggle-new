/**
 * Cosy / Calm Mode preference resolver.
 *
 * Cosy Mode is a global "calm overlay" — it makes the existing neo-brutalist
 * game gentler (fewer effects, no time-pressure escalation, gentler payoffs)
 * without becoming a separate game. This module is the pure spine: given the
 * raw stored accessibility settings (+ the system reduced-motion preference),
 * it computes the EFFECTIVE preferences the rest of the app reads.
 *
 * Design rule — OR-mask: for every calming flag, `effective = base || cosy`.
 * Cosy can only *reduce* intensity, never increase it. Because cosy is a live
 * mask (not a one-time write into storage), toggling it off restores each
 * underlying flag to its own stored value with no bookkeeping.
 *
 * Haptics are intentionally NOT folded in here — vibration isn't visual noise
 * and has its own dedicated `disableHaptics` toggle.
 */

export interface RawCosyInputs {
  /** Master cosy/calm toggle. */
  cosyMode: boolean;
  /** Stored reduce-motion preference. */
  reduceMotion: boolean | 'system';
  /** Live system `prefers-reduced-motion` value (resolved by the caller). */
  systemPrefersReducedMotion: boolean;
  disableFireRoundLights: boolean;
  disableEarthquakeEffects: boolean;
  useLargeLetters: boolean;
}

export interface EffectiveCosyPreferences {
  cosyMode: boolean;
  /** Base reduce-motion logic OR cosy. */
  shouldReduceMotion: boolean;
  disableFireRoundLights: boolean;
  disableEarthquakeEffects: boolean;
  largeLettersEnabled: boolean;
  /** New under cosy: stop the timer from shouting (color/scale escalation). */
  suppressTimerUrgency: boolean;
  /**
   * Celebration tier:
   * - `full`   — default loud party (confetti + Pixi bursts at full strength).
   * - `gentle` — scaled-down particles (kept for non-cosy reduce-effects paths).
   * - `calm`   — particles OFF; replaced by dignified quiet feedback. Cosy mode
   *              uses this: the elder / effect-averse persona wants a different
   *              kind of acknowledgement, not a smaller explosion.
   */
  celebrationIntensity: 'full' | 'gentle' | 'calm';
}

/** Resolve the stored reduce-motion preference against the system setting. */
function resolveReduceMotionBase(
  reduceMotion: boolean | 'system',
  systemPrefersReducedMotion: boolean,
): boolean {
  return reduceMotion === 'system' ? systemPrefersReducedMotion : reduceMotion;
}

export function resolveCosyPreferences(inputs: RawCosyInputs): EffectiveCosyPreferences {
  const { cosyMode } = inputs;
  const reduceMotionBase = resolveReduceMotionBase(
    inputs.reduceMotion,
    inputs.systemPrefersReducedMotion,
  );

  return {
    cosyMode,
    shouldReduceMotion: reduceMotionBase || cosyMode,
    disableFireRoundLights: inputs.disableFireRoundLights || cosyMode,
    disableEarthquakeEffects: inputs.disableEarthquakeEffects || cosyMode,
    largeLettersEnabled: inputs.useLargeLetters || cosyMode,
    suppressTimerUrgency: cosyMode,
    celebrationIntensity: cosyMode ? 'calm' : 'full',
  };
}
