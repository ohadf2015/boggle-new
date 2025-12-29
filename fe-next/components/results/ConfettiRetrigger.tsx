'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// Rank-specific confetti colors (matching Top3Leaderboard)
const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
};

// Default celebration colors
const DEFAULT_COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7'];

// Victory colors (green theme)
const VICTORY_COLORS = ['#10B981', '#FFE135', '#00D9FF', '#34D399'];

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

  // Determine confetti colors based on variant
  const getColors = useCallback(() => {
    if (customColors && customColors.length > 0) {
      return customColors;
    }

    switch (variant) {
      case 'rank':
        if (rank && rank >= 1 && rank <= 3) {
          return RANK_CONFETTI_COLORS[rank];
        }
        return DEFAULT_COLORS;
      case 'victory':
        return VICTORY_COLORS;
      case 'streak':
        return ['#FF6B35', '#FFE135', '#FF1493', '#FF8C00'];
      default:
        return DEFAULT_COLORS;
    }
  }, [variant, rank, customColors]);

  // Fire confetti celebration
  const triggerConfetti = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    const colors = getColors();

    // Main burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });

    // Secondary burst for more impact
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      });
    }, 150);

    // Reset animation state
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  }, [getColors, isAnimating]);

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
