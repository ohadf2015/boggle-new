/**
 * Celebration scaling for Cosy / Calm Mode.
 *
 * Three tiers:
 * - `full`   — default party strength.
 * - `gentle` — fewer particles, narrower spread, no screen-shake (a quieter
 *              party; kept for non-cosy "reduce effects" use).
 * - `calm`   — particles OFF entirely. Cosy mode uses this. The elder /
 *              effect-averse persona doesn't want a smaller explosion; they
 *              want a different acknowledgement. Particle effects are replaced
 *              by dignified quiet feedback (see `quietFeedback.ts`), so the
 *              feedback loop is never dead — just calm.
 *
 * Pure on purpose — call sites (confetti, win beats) read these multipliers and
 * apply them to their own particle configs.
 */

import type { EffectiveCosyPreferences } from './cosyPreferences';

export type CelebrationIntensity = EffectiveCosyPreferences['celebrationIntensity'];

export interface CelebrationScale {
  /** Multiply a base particle count by this. */
  particleMultiplier: number;
  /** Multiply a base spread/angle by this. */
  spreadMultiplier: number;
  /** Multiply a base duration by this. */
  durationMultiplier: number;
  /** Whether to allow screen-shake on this celebration. */
  enableScreenShake: boolean;
}

const GENTLE: CelebrationScale = {
  particleMultiplier: 0.4,
  spreadMultiplier: 0.7,
  durationMultiplier: 0.7,
  enableScreenShake: false,
};

const FULL: CelebrationScale = {
  particleMultiplier: 1,
  spreadMultiplier: 1,
  durationMultiplier: 1,
  enableScreenShake: true,
};

const CALM: CelebrationScale = {
  particleMultiplier: 0,
  spreadMultiplier: 0,
  durationMultiplier: 0,
  enableScreenShake: false,
};

export function celebrationScale(intensity: CelebrationIntensity): CelebrationScale {
  if (intensity === 'calm') return CALM;
  return intensity === 'gentle' ? GENTLE : FULL;
}

/**
 * True when particle effects should not fire at all (calm / cosy). Call sites
 * use this to skip the burst and instead emit dignified quiet feedback.
 */
export function isCelebrationSuppressed(intensity: CelebrationIntensity): boolean {
  return intensity === 'calm';
}

/**
 * Scale a base particle count, guaranteeing a celebration never drops to zero.
 * Full intensity returns the base unchanged; gentle reduces it but keeps at
 * least one particle so the payoff is always visible.
 */
export function scaleParticleCount(base: number, intensity: CelebrationIntensity): number {
  if (intensity === 'full') return base;
  if (intensity === 'calm') return 0; // particles off — quiet feedback takes over
  return Math.max(1, Math.round(base * GENTLE.particleMultiplier));
}

/**
 * Apply the celebration scale to a confetti-options-shaped object, returning a
 * new object (never mutates). Scales `particleCount` and `spread` when present.
 * Kept structurally typed so this module stays free of the canvas-confetti dep.
 * Full intensity is a pass-through, so wiring this into the confetti chokepoint
 * is behaviour-neutral until cosy mode flips the intensity to 'gentle'.
 */
export function applyCelebrationIntensity<
  T extends { particleCount?: number; spread?: number },
>(options: T, intensity: CelebrationIntensity): T {
  if (intensity === 'full') return options;
  const scale = celebrationScale(intensity);
  const next: T = { ...options };
  if (typeof next.particleCount === 'number') {
    next.particleCount = scaleParticleCount(next.particleCount, intensity);
  }
  if (typeof next.spread === 'number') {
    next.spread = Math.round(next.spread * scale.spreadMultiplier);
  }
  return next;
}
