/**
 * useParticleBudget - Maps device performance to appropriate particle budgets
 *
 * This hook helps game juice effects adapt to device capabilities:
 * - High-end devices: Full particle effects (100 max particles)
 * - Mid-range devices: Reduced particle effects (60 max particles)
 * - Low-end devices: Minimal particle effects (30 max particles)
 * - Reduced motion: Zero particles (accessibility)
 *
 * Usage:
 * const { tier, combo, levelUp, word } = useParticleBudget();
 */

import { useMemo } from 'react';
import { useDevicePerformance } from './useDevicePerformance';

/**
 * Particle budget configuration per tier
 *
 * Each tier defines:
 * - max: Maximum particles across all effects
 * - combo: Particles for combo celebrations
 * - levelUp: Particles for level up effects
 * - word: Particles for word find effects
 */
export const PARTICLE_BUDGETS = {
  low: {
    max: 30,
    combo: 5,
    levelUp: 20,
    word: 3,
  },
  medium: {
    max: 60,
    combo: 10,
    levelUp: 40,
    word: 6,
  },
  high: {
    max: 100,
    combo: 15,
    levelUp: 60,
    word: 10,
  },
} as const;

export type ParticleTier = keyof typeof PARTICLE_BUDGETS;

export interface ParticleBudget {
  tier: ParticleTier;
  max: number;
  combo: number;
  levelUp: number;
  word: number;
}

/**
 * Hook to get device-appropriate particle budgets
 *
 * @returns ParticleBudget with tier and particle counts for different effects
 *
 * @example
 * ```tsx
 * const { tier, combo } = useParticleBudget();
 *
 * // Fire particles scaled to combo tier
 * fireConfetti({
 *   particleCount: combo * comboTier,
 *   ...otherOptions
 * });
 * ```
 */
export function useParticleBudget(): ParticleBudget {
  const { isLowEnd, reduceParticles, prefersReducedMotion } = useDevicePerformance();

  return useMemo(() => {
    // Priority 1: Reduced motion preference (zero particles)
    if (prefersReducedMotion) {
      return {
        tier: 'low',
        max: 0,
        combo: 0,
        levelUp: 0,
        word: 0,
      };
    }

    // Priority 2: Low-end devices (minimal particles)
    if (isLowEnd) {
      return {
        tier: 'low',
        ...PARTICLE_BUDGETS.low,
      };
    }

    // Priority 3: Reduce particles flag (mid-range)
    if (reduceParticles) {
      return {
        tier: 'medium',
        ...PARTICLE_BUDGETS.medium,
      };
    }

    // Default: High-end devices (full particles)
    return {
      tier: 'high',
      ...PARTICLE_BUDGETS.high,
    };
  }, [isLowEnd, reduceParticles, prefersReducedMotion]);
}
