'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fireConfetti,
  fireRankConfetti,
  fireVictoryConfetti,
  fireStreakConfetti,
  RANK_COLORS,
  DEFAULT_COLORS,
  VICTORY_COLORS,
  STREAK_COLORS,
} from '@/utils/confettiUtils';

export type ConfettiVariant = 'default' | 'rank' | 'victory' | 'streak';

interface ConfettiRetriggerProps {
  /** The variant determines the confetti colors */
  variant?: ConfettiVariant;
  /** For rank variant - the player's rank (1, 2, 3) */
  rank?: number;
  /** Custom colors to use instead of preset variants */
  customColors?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for tighter spaces */
  compact?: boolean;
  /** Show label text (default: false for icon-only) */
  showLabel?: boolean;
}

/**
 * ConfettiRetrigger - A button to replay celebration confetti
 *
 * Place this component near the results banner/score display to let users
 * replay their celebration moment.
 */
const ConfettiRetrigger: React.FC<ConfettiRetriggerProps> = ({
  variant = 'default',
  rank,
  customColors,
  className,
  compact = false,
  showLabel = false,
}) => {
  const { t } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  // Fire confetti celebration based on variant
  const triggerConfetti = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);

    // Use variant-specific confetti or custom colors
    switch (variant) {
      case 'rank':
        if (rank && rank >= 1 && rank <= 3) {
          fireRankConfetti(rank);
        } else {
          // Default burst for non-top-3 ranks
          fireConfetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: customColors || DEFAULT_COLORS,
          });
        }
        break;
      case 'victory':
        fireVictoryConfetti();
        break;
      case 'streak':
        fireStreakConfetti();
        break;
      default:
        // Main burst
        fireConfetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: customColors || DEFAULT_COLORS,
        });
        // Secondary burst for more impact
        setTimeout(() => {
          fireConfetti({
            particleCount: 40,
            spread: 100,
            origin: { y: 0.5 },
            colors: customColors || DEFAULT_COLORS,
          });
        }, 150);
    }

    // Reset animation state
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  }, [variant, rank, customColors, isAnimating]);

  return (
    <motion.button
      onClick={triggerConfetti}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isAnimating ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={cn(
        'inline-flex items-center gap-1.5',
        'bg-neo-pink hover:bg-neo-pink/90',
        'text-white font-bold',
        'border-2 border-neo-black rounded-neo',
        'shadow-hard-sm hover:shadow-hard',
        'transition-all duration-150',
        compact ? 'px-2 py-1' : 'px-3 py-1.5',
        className
      )}
      aria-label={t('results.celebrateAgain') || 'Celebrate again'}
      title={t('results.celebrateAgain') || 'Celebrate again'}
    >
      <PartyPopper className={cn('text-white', compact ? 'w-4 h-4' : 'w-5 h-5')} />
      {showLabel && (
        <span className={cn('uppercase', compact ? 'text-[10px]' : 'text-xs')}>
          {t('results.celebrate') || 'Celebrate'}
        </span>
      )}
    </motion.button>
  );
};

export default ConfettiRetrigger;
