/**
 * VictoryCelebration Component
 *
 * Victory screen with confetti celebration and star animations.
 * Uses canvas-confetti for performant particle effects (max 20 particles).
 * Respects prefers-reduced-motion accessibility preference.
 */

'use client';

import React, { useEffect, useState, memo, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Star, Trophy, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { fireConfetti, VICTORY_COLORS, cleanupConfetti } from '@/utils/confettiUtils';
import RollingNumber from './RollingNumber';

// ==============================================
// TYPES
// ==============================================

interface VictoryCelebrationProps {
  stars: number;
  score: number;
  xpGained: number;
  goldGained: number;
  isPerfect: boolean;
  onComplete?: () => void;
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

/** Maximum particle count for victory celebration (accessibility/performance) */
const MAX_PARTICLE_COUNT = 20;

// ==============================================
// COMPONENT
// ==============================================

export const VictoryCelebration = memo(function VictoryCelebration({
  stars,
  score,
  xpGained,
  goldGained,
  isPerfect,
  onComplete,
  className,
}: VictoryCelebrationProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [showContent, setShowContent] = useState(false);

  // Fire confetti celebration using canvas-confetti library
  const fireVictoryBurst = useCallback(() => {
    if (prefersReducedMotion) return;

    // Single burst with max 20 particles for performance
    fireConfetti({
      particleCount: MAX_PARTICLE_COUNT,
      spread: 80,
      origin: { y: 0.6 },
      colors: VICTORY_COLORS,
      scalar: 1.3,
      startVelocity: 50,
      flat: true, // Neo-brutalist flat geometric style
    });
  }, [prefersReducedMotion]);

  // Trigger celebration on mount
  useEffect(() => {
    // Fire initial confetti burst
    fireVictoryBurst();

    // Show content after initial burst (or immediately for reduced motion)
    const delay = prefersReducedMotion ? 0 : 300;
    const timer = setTimeout(() => setShowContent(true), delay);

    return () => {
      clearTimeout(timer);
      // Clean up confetti canvas on unmount
      cleanupConfetti();
    };
  }, [fireVictoryBurst, prefersReducedMotion]);

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center pointer-events-none', className)}>
      {/* Dark overlay - no blur for performance */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="absolute inset-0 bg-neo-navy/80"
      />

      {/* Confetti is rendered by canvas-confetti library on its own canvas */}

      {/* Main content */}
      <AdaptiveAnimatePresence>
        {showContent && (
          <AdaptiveMotion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 200, damping: 20 }}
            className="relative z-10 text-center pointer-events-auto"
          >
            {/* Victory title */}
            <AdaptiveMotion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { y: -50, opacity: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.2 }}
              className="mb-8"
            >
              <h2 className={cn(
                'text-5xl sm:text-6xl font-black uppercase tracking-tight',
                isPerfect ? 'text-neo-pink' : 'text-neo-yellow'
              )}>
                {isPerfect ? t('adventure.perfect') : t('adventure.victory')}
              </h2>
              {isPerfect && (
                <AdaptiveMotion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1 }}
                  transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.5, type: 'spring' }}
                  className="flex items-center justify-center gap-2 mt-2"
                >
                  <Trophy className="w-6 h-6 text-neo-yellow" />
                  <span className="text-neo-yellow font-bold">{t('adventure.allStars')}</span>
                </AdaptiveMotion.div>
              )}
            </AdaptiveMotion.div>

            {/* Stars display */}
            <AdaptiveMotion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1 }}
              transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.3, type: 'spring', stiffness: 200 }}
              className="flex items-center justify-center gap-4 mb-8"
            >
              {[1, 2, 3].map((starNum) => (
                <AdaptiveMotion.div
                  key={starNum}
                  initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: -180 }}
                  animate={prefersReducedMotion
                    ? { opacity: starNum <= stars ? 1 : 0.3 }
                    : {
                        scale: starNum <= stars ? 1 : 0.5,
                        rotate: 0,
                        opacity: starNum <= stars ? 1 : 0.3,
                      }
                  }
                  transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.4 + starNum * 0.1, type: 'spring' }}
                >
                  <Star
                    className={cn(
                      'w-16 h-16 sm:w-20 sm:h-20',
                      starNum <= stars
                        ? 'text-neo-yellow fill-neo-yellow'
                        : 'text-neo-white'
                    )}
                  />
                </AdaptiveMotion.div>
              ))}
            </AdaptiveMotion.div>

            {/* Stats grid - no backdrop blur for performance */}
            <AdaptiveMotion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { y: 50, opacity: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.6 }}
              className="grid grid-cols-3 gap-4 max-w-md mx-auto"
            >
              {/* Score */}
              <div className="bg-neo-black/80 border-3 border-neo-white/20 rounded-neo p-4">
                <div className="text-neo-white text-sm font-bold mb-1">{t('adventure.score')}</div>
                <RollingNumber
                  value={score}
                  variant="white"
                  className="text-2xl"
                />
              </div>

              {/* XP */}
              <div className="bg-neo-purple/30 border-3 border-neo-purple rounded-neo p-4">
                <div className="text-neo-purple text-sm font-bold mb-1">+XP</div>
                <RollingNumber
                  value={xpGained}
                  variant="default"
                  className="text-2xl text-neo-purple"
                />
              </div>

              {/* Gold */}
              <div className="bg-neo-yellow/30 border-3 border-neo-yellow rounded-neo p-4">
                <div className="text-neo-yellow text-sm font-bold mb-1 flex items-center gap-1 justify-center">
                  <Coins className="w-3 h-3" />
                  Gold
                </div>
                <RollingNumber
                  value={goldGained}
                  variant="gold"
                  className="text-2xl"
                />
              </div>
            </AdaptiveMotion.div>

            {/* Continue button */}
            <AdaptiveMotion.button
              initial={prefersReducedMotion ? { opacity: 0 } : { y: 30, opacity: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0.1 } : { delay: 0.8 }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              onClick={onComplete}
              className={cn(
                'mt-8 px-8 py-4 rounded-neo-lg font-black text-xl uppercase',
                'bg-neo-lime text-neo-black border-4 border-neo-black',
                'shadow-hard-lg hover:shadow-hard transition-shadow',
                'pointer-events-auto'
              )}
            >
              {t('adventure.continue')}
            </AdaptiveMotion.button>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
});

VictoryCelebration.displayName = 'VictoryCelebration';

export default VictoryCelebration;
