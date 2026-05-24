/**
 * Celebration scaling for Cosy / Calm Mode.
 *
 * Cosy does NOT remove celebrations — a dead feedback loop feels broken, not
 * cosy. It scales them down: fewer particles, narrower spread, no screen-shake,
 * shorter burst. The payoff still lands, just without the assault.
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

export function celebrationScale(intensity: CelebrationIntensity): CelebrationScale {
  return intensity === 'gentle' ? GENTLE : FULL;
}

/**
 * Scale a base particle count, guaranteeing a celebration never drops to zero.
 * Full intensity returns the base unchanged; gentle reduces it but keeps at
 * least one particle so the payoff is always visible.
 */
export function scaleParticleCount(base: number, intensity: CelebrationIntensity): number {
  if (intensity === 'full') return base;
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
