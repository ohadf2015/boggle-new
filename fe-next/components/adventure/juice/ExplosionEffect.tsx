/**
 * ExplosionEffect - Explosion visual effect for multi-tile word clearing
 *
 * Triggers a radial particle burst at a specific position on the board.
 * Uses existing particle budget system to adapt to device performance.
 *
 * Intensity scales particle count and velocity based on word length:
 * - Intensity 1 (3-4 letters): 4 particles, velocity 15
 * - Intensity 2 (5-6 letters): 8 particles, velocity 22
 * - Intensity 3 (7-9 letters): 12 particles, velocity 30
 * - Intensity 4 (10+ letters): 16 particles, velocity 38
 *
 * Reduced motion users: Zero particles, just fire onComplete callback
 */

import React, { useEffect } from 'react';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { fireConfetti, NEO_BRUTALIST_COLORS } from '@/utils/confettiUtils';

export interface ExplosionEffectProps {
  /** Position to render explosion (pixel coordinates) */
  position: { x: number; y: number };
  /** Intensity (1-4) based on word length */
  intensity: 1 | 2 | 3 | 4;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Optional custom color (defaults to neo-orange) */
  color?: string;
}

const NEO_ORANGE = '#FF6B35';

/**
 * Build a palette: primary color dominant + 2 accent colors from the neo palette.
 * This prevents monochrome confetti while keeping the primary color prominent.
 */
function buildPalette(primary: string): string[] {
  const accents = NEO_BRUTALIST_COLORS.filter(c => c !== primary).slice(0, 2);
  // Primary appears twice for ~50% dominance
  return [primary, primary, ...accents];
}

/**
 * Configuration for each intensity level:
 * - particleMultiplier: Base particles = 6, scales by this
 * - velocity: Initial burst velocity
 */
const INTENSITY_CONFIG = {
  1: { particleMultiplier: 1, velocity: 15 },   // 4 particles
  2: { particleMultiplier: 2, velocity: 22 },   // 8 particles
  3: { particleMultiplier: 3, velocity: 30 },   // 12 particles
  4: { particleMultiplier: 4, velocity: 38 },   // 16 particles
};

export function ExplosionEffect({
  position,
  intensity,
  onComplete,
  color = NEO_ORANGE,
}: ExplosionEffectProps) {
  const budget = useParticleBudget();

  useEffect(() => {
    // Reduced motion: skip particles, just fire onComplete
    if (budget.max === 0) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Get intensity config
    const config = INTENSITY_CONFIG[intensity];
    const baseParticleCount = 4;
    const particleCount = baseParticleCount * config.particleMultiplier;

    // Calculate normalized origin position (0-1 range)
    const originX = position.x / (typeof window !== 'undefined' ? window.innerWidth : 1000);
    const originY = position.y / (typeof window !== 'undefined' ? window.innerHeight : 1000);

    // Hit-stop: 40ms freeze-frame before particles fire.
    // Research: the brain has a ~100ms perception window — a brief pause before the
    // burst makes it feel more impactful (standard in AAA puzzle games).
    const hitStopMs = intensity >= 3 ? 50 : 40;

    const hitStopTimer = setTimeout(() => {
      fireConfetti({
        particleCount,
        startVelocity: config.velocity,
        spread: 360, // Full radial burst
        origin: { x: originX, y: originY },
        colors: buildPalette(color),
        gravity: 1.5,
        ticks: 60,
        scalar: 0.9,
      });
    }, hitStopMs);

    // Fire onComplete after hit-stop + particle animation
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, hitStopMs + 200);

    return () => {
      clearTimeout(hitStopTimer);
      clearTimeout(timer);
    };
  }, [position, intensity, color, budget.max, onComplete]);

  // Render glow effect at explosion origin
  return (
    <div
      className="explosion-ring"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: 0,
        height: 0,
      }}
    />
  );
}
