/**
 * AdaptiveParticles - Device-aware particle system
 *
 * Wraps canvas-confetti with automatic budget enforcement based on device performance.
 * Particle counts adapt from 0 (reduced motion) to 100 (high-end devices).
 *
 * IMPORTANT: This component is PURELY VISUAL - it only fires particle bursts.
 * Text rendering (Nice!/Great!/Amazing!/LEGENDARY!) is handled by ComboTierBadge.
 *
 * Features:
 * - Budget-enforced particle counts (30-100 based on device)
 * - Zero particles for reduced motion users
 * - Intensity scaling for combo tiers (1-4x multiplier)
 * - Type-specific configurations (combo/levelUp/word/victory)
 * - Custom colors and origin positions
 *
 * Usage:
 * <AdaptiveParticles
 *   type="combo"
 *   intensity={comboTier} // 1-4 for combo tiers
 *   origin={{ x: 0.5, y: 0.6 }}
 *   onComplete={() => console.log('Particles done')}
 * />
 */

'use client';

import { useEffect } from 'react';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { fireConfetti, NEO_BRUTALIST_COLORS, VICTORY_COLORS } from '@/utils/confettiUtils';

export interface AdaptiveParticlesProps {
  /** Type of particle effect */
  type: 'combo' | 'levelUp' | 'word' | 'victory';
  /** Origin position (x, y in 0-1 range) */
  origin?: { x: number; y: number };
  /** Custom colors (defaults to neo-brutalist palette) */
  colors?: string[];
  /** Intensity multiplier (1-4, scales particle count for combo tiers) */
  intensity?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Particle configuration presets per event type
 */
const PARTICLE_CONFIGS = {
  combo: {
    spread: 70,
    startVelocity: 45,
    gravity: 1.0,
    scalar: 1.3,
    origin: { x: 0.5, y: 0.6 },
  },
  levelUp: {
    spread: 90,
    startVelocity: 50,
    gravity: 1.2,
    scalar: 1.6,
    origin: { x: 0.5, y: 0.5 },
  },
  word: {
    spread: 50,
    startVelocity: 40,
    gravity: 1.0,
    scalar: 1.1,
    origin: { x: 0.5, y: 0.7 },
  },
  victory: {
    spread: 100,
    startVelocity: 55,
    gravity: 1.2,
    scalar: 1.4,
    origin: { x: 0.5, y: 0.6 },
  },
} as const;

/**
 * AdaptiveParticles component
 *
 * Fires particle bursts with device-appropriate counts.
 * Purely visual - no text rendering (see ComboTierBadge for tier text).
 */
export function AdaptiveParticles({
  type,
  origin,
  colors,
  intensity = 1,
  onComplete,
}: AdaptiveParticlesProps) {
  const budget = useParticleBudget();

  useEffect(() => {
    // Skip particles entirely if budget is 0 (reduced motion)
    if (budget.max === 0) {
      onComplete?.();
      return;
    }

    // Get particle count for this event type
    const baseCount = budget[type === 'victory' ? 'levelUp' : type];
    const particleCount = Math.floor(baseCount * intensity);

    // Get configuration for this type
    const config = PARTICLE_CONFIGS[type];

    // Determine colors
    const effectColors = colors || (type === 'victory' ? VICTORY_COLORS : NEO_BRUTALIST_COLORS);

    // Fire particles
    const promise = fireConfetti({
      particleCount,
      spread: config.spread,
      startVelocity: config.startVelocity,
      gravity: config.gravity,
      scalar: config.scalar,
      origin: origin || config.origin,
      colors: effectColors,
      flat: true, // Neo-brutalist flat geometric style
    });

    // Call onComplete when animation finishes
    if (promise) {
      promise.then(() => {
        onComplete?.();
      });
    } else {
      // If fireConfetti returns null (error), still call onComplete
      onComplete?.();
    }
  }, [type, origin, colors, intensity, budget, onComplete]);

  // This component has no visual output - particles are rendered by confetti canvas
  return null;
}
