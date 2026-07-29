/**
 * PowerUpActivationEffect Component
 *
 * Burst effect on power-up activation (0.25s shake + particles).
 * Respects prefers-reduced-motion for accessibility.
 */

'use client';

import { useEffect } from 'react';
import { useScreenShake } from '@/hooks/useScreenShake';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { AdaptiveParticles } from '@/components/adventure/juice/AdaptiveParticles';
import type { PowerUpType } from '@/types/adventure';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PowerUpActivationEffectProps {
  /** Type of power-up being activated */
  type: PowerUpType;
  /** Origin position (x, y in 0-1 range) */
  origin: { x: number; y: number };
  /** Callback when animation completes */
  onComplete?: () => void;
}

// ============================================
// COLOR SCHEMES
// ============================================

const POWER_UP_COLORS: Record<PowerUpType, string[]> = {
  freezeTime: ['#00FFFF', '#0080FF'], // cyan, blue
  hint: ['#FFE135', '#FFD700'], // yellow, gold
  scoreMultiplier: ['#9B59B6', '#FF1493'], // purple, pink
};

// ============================================
// COMPONENT
// ============================================

/**
 * PowerUpActivationEffect component
 *
 * Fires 0.25s burst effect when power-up is activated:
 * - Screen shake (intensity 4, duration 250ms)
 * - Adaptive particles (combo type, intensity 2)
 * - Color scheme based on power-up type
 * - Skips animation for reduced motion users
 */
export function PowerUpActivationEffect({
  type,
  origin,
  onComplete,
}: PowerUpActivationEffectProps) {
  const { shake } = useScreenShake();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Skip animation entirely for reduced motion users
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    // Trigger screen shake (intensity 4, duration 250ms)
    shake(4, 250);

    // Schedule onComplete callback after animation duration
    const timer = setTimeout(() => {
      onComplete?.();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [type, prefersReducedMotion, shake, onComplete]);

  // Skip rendering particles for reduced motion users
  if (prefersReducedMotion) {
    return null;
  }

  // Render particles with type-specific colors
  return (
    <AdaptiveParticles
      type="combo"
      intensity={2}
      origin={origin}
      colors={POWER_UP_COLORS[type]}
    />
  );
}
