'use client';

import { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence, useSpring } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ComboTier {
  threshold: number;
  translationKey: string;
  color: string;
  animation: string;
}

export interface ComboTierBadgeProps {
  /** Current combo count */
  comboCount: number;
  /** Position for fixed positioning */
  position?: { x: number; y: number };
  /** Additional className */
  className?: string;
  /** Callback when tier changes */
  onTierChange?: (tier: ComboTier) => void;
}

// Combo tier thresholds
export const COMBO_TIERS: ComboTier[] = [
  {
    threshold: 2,
    translationKey: 'adventure.combo.nice',
    color: 'bg-neo-lime',
    animation: 'animate-neo-pop',
  },
  {
    threshold: 4,
    translationKey: 'adventure.combo.great',
    color: 'bg-neo-cyan',
    animation: 'animate-neo-wobble',
  },
  {
    threshold: 7,
    translationKey: 'adventure.combo.amazing',
    color: 'bg-neo-orange',
    animation: 'animate-neo-shake',
  },
  {
    threshold: 10,
    translationKey: 'adventure.combo.legendary',
    color: 'bg-neo-pink',
    animation: 'animate-neo-press',
  },
  {
    threshold: 15,
    translationKey: 'adventure.combo.mythic',
    color: 'bg-linear-to-r from-purple-500 to-pink-500',
    animation: 'animate-neo-shake',
  },
  {
    threshold: 20,
    translationKey: 'adventure.combo.transcendent',
    color: 'bg-linear-to-r from-yellow-300 via-white to-yellow-300',
    animation: 'animate-pulse',
  },
];

/**
 * Get the combo tier configuration for a given combo count
 */
export function getComboTier(comboCount: number): ComboTier | null {
  // Find the highest tier that matches the combo count
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (comboCount >= COMBO_TIERS[i].threshold) {
      return COMBO_TIERS[i];
    }
  }
  return null;
}

/**
 * ComboTierBadge - Displays tiered combo feedback
 *
 * Shows encouraging text as combos build:
 * - Nice! (2-3 combo)
 * - Great! (4-6 combo)
 * - Amazing! (7-9 combo)
 * - LEGENDARY! (10+ combo)
 *
 * Features:
 * - Neo-Brutalist design (hard shadows, bold colors)
 * - Tier-specific animations
 * - RTL support via logical properties and shadow-hard classes
 * - Reduced motion support
 * - Device performance adaptation
 *
 * @example
 * ```tsx
 * <ComboTierBadge
 *   comboCount={currentCombo}
 *   position={{ x: 100, y: 200 }}
 *   onTierChange={(tier) => playSound(tier.translationKey)}
 * />
 * ```
 */
export function ComboTierBadge({
  comboCount,
  position,
  className,
  onTierChange,
}: ComboTierBadgeProps) {
  const { t } = useLanguage();
  const { prefersReducedMotion } = useDevicePerformance();
  const [prevTier, setPrevTier] = useState<ComboTier | null>(null);

  // Get current tier
  const currentTier = useMemo(() => getComboTier(comboCount), [comboCount]);

  // Spring animation for scale
  const springScale = useSpring(1, { stiffness: 300, damping: 20 });

  // Watch for tier changes
  useEffect(() => {
    if (currentTier && prevTier && currentTier.threshold !== prevTier.threshold) {
      onTierChange?.(currentTier);
      // Trigger scale animation on tier change
      springScale.set(1.3);
      setTimeout(() => springScale.set(1), 200);
    }
    setPrevTier(currentTier);
  }, [currentTier, prevTier, onTierChange, springScale]);

  // Don't render if no tier reached
  if (!currentTier) return null;

  const tierText = t(currentTier.translationKey);

  // Reduced motion variant - static badge
  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          'rounded-neo border-3 border-neo-black shadow-hard',
          'px-4 py-2 font-black text-neo-black text-center',
          currentTier.color,
          className
        )}
        style={position ? { position: 'fixed', left: position.x, top: position.y } : undefined}
      >
        {tierText}
      </div>
    );
  }

  // Animated variant
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={currentTier.threshold}
        className={cn(
          'rounded-neo border-3 border-neo-black shadow-hard',
          'px-4 py-2 font-black text-neo-black text-center',
          currentTier.color,
          currentTier.animation,
          className
        )}
        style={
          position
            ? {
                position: 'fixed',
                left: position.x,
                top: position.y,
                scale: springScale,
              }
            : { scale: springScale }
        }
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        {tierText}
      </m.div>
    </AnimatePresence>
  );
}

export default ComboTierBadge;
