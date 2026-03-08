'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccumulatedScoreDisplayProps {
  currentScore: number;
  lastIncrement: number | null;
  isAnimating: boolean;
  t: (key: string) => string;
}

/**
 * Score tier thresholds for subtle color coding
 * Thresholds based on typical word hunt scoring patterns
 * Colors are muted to avoid distraction during gameplay
 */
const SCORE_TIERS = {
  LOW: 75,       // 0-74: Needs improvement
  MEDIUM: 175,   // 75-174: Average
  GOOD: 300,     // 175-299: Good
  // 300+: Excellent
} as const;

/**
 * Get subtle color classes based on score
 * Uses muted tones to provide feedback without distraction
 */
function getScoreColorClasses(score: number): {
  gradient: string;
  iconColor: string;
  textColor: string;
} {
  if (score < SCORE_TIERS.LOW) {
    // Low score - muted warm tone (not alarming red)
    return {
      gradient: 'from-amber-400 to-orange-400',
      iconColor: 'text-neo-black/80',
      textColor: 'text-neo-black',
    };
  }
  if (score < SCORE_TIERS.MEDIUM) {
    // Medium score - standard yellow/orange (original style)
    return {
      gradient: 'from-neo-yellow to-neo-orange',
      iconColor: 'text-neo-black/80',
      textColor: 'text-neo-black',
    };
  }
  if (score < SCORE_TIERS.GOOD) {
    // Good score - subtle lime tint
    return {
      gradient: 'from-neo-lime-light to-neo-yellow',
      iconColor: 'text-neo-black/80',
      textColor: 'text-neo-black',
    };
  }
  // Excellent score - subtle cyan/lime
  return {
    gradient: 'from-neo-lime to-neo-cyan-light',
    iconColor: 'text-neo-black/80',
    textColor: 'text-neo-black',
  };
}

/**
 * Accumulated Score Display Component
 * Shows live-updating score with neo-brutalist styling and pop animations
 * Colors dynamically change based on score performance
 */
export const AccumulatedScoreDisplay: React.FC<AccumulatedScoreDisplayProps> = ({
  currentScore,
  lastIncrement,
  isAnimating,
  t,
}) => {
  // Memoize color classes to prevent recalculation on every render
  const scoreColors = useMemo(() => getScoreColorClasses(currentScore), [currentScore]);

  return (
    <div className="relative">
      {/* Score Container */}
      <motion.div
        className={cn(
          'relative flex flex-col items-center gap-0.5',
          'px-3 py-1.5',
          'bg-gradient-to-br',
          scoreColors.gradient,
          'border-neo-thick border-neo-black',
          'rounded-neo',
          'shadow-hard',
          '@container'
        )}
        animate={isAnimating ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{
          duration: 0.4,
          type: 'spring',
          damping: 15,
          stiffness: 300,
        }}
      >
        {/* Label */}
        <div className="flex items-center gap-1">
          <TrendingUp className={cn('w-3 h-3', scoreColors.iconColor)} />
          <span className={cn(
            'text-[8px] @[80px]:text-[9px] @[100px]:text-[10px] font-bold uppercase tracking-wide font-neo-body',
            scoreColors.textColor
          )}>
            {t('wordHunt.survival.accumulatedScore')}
          </span>
        </div>

        {/* Score Value */}
        <div className="relative">
          <motion.div
            key={currentScore}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'text-2xl @[80px]:text-3xl @[120px]:text-4xl font-black font-neo-display',
              scoreColors.textColor
            )}
          >
            {Math.max(0, Math.round(currentScore))}
          </motion.div>

          {/* Increment Badge */}
          <AnimatePresence>
            {lastIncrement !== null && lastIncrement !== 0 && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [0, -20, -25, -30],
                  scale: [0.5, 1.2, 1, 0.8],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={cn(
                  'absolute -top-4 -right-6',
                  'px-1.5 py-0.5',
                  'text-xs font-black font-neo-display',
                  'rounded-neo border-2 border-neo-black',
                  'shadow-hard-sm',
                  lastIncrement > 0
                    ? 'bg-neo-cyan text-neo-black'
                    : 'bg-neo-pink text-white'
                )}
              >
                {lastIncrement > 0 ? '+' : ''}
                {Math.round(lastIncrement)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tooltip Hint (on larger screens) */}
        <div className="hidden @[120px]:block text-[8px] text-neo-black/60 font-bold">
          {t('wordHunt.survival.scoreBreakdownTooltip')}
        </div>
      </motion.div>
    </div>
  );
};

export default AccumulatedScoreDisplay;
