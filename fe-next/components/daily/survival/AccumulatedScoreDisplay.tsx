'use client';

import React from 'react';
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
 * Accumulated Score Display Component
 * Shows live-updating score with neo-brutalist styling and pop animations
 */
export const AccumulatedScoreDisplay: React.FC<AccumulatedScoreDisplayProps> = ({
  currentScore,
  lastIncrement,
  isAnimating,
  t,
}) => {
  return (
    <div className="relative">
      {/* Score Container */}
      <motion.div
        className={cn(
          'relative flex flex-col items-center gap-0.5',
          'px-3 py-1.5',
          'bg-gradient-to-br from-neo-yellow to-neo-orange',
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
          <TrendingUp className="w-3 h-3 text-neo-black" />
          <span className="text-[8px] @[80px]:text-[9px] @[100px]:text-[10px] font-bold text-neo-black uppercase tracking-wide font-neo-body">
            {t('wordHunt.survival.accumulatedScore') || 'Score'}
          </span>
        </div>

        {/* Score Value */}
        <div className="relative">
          <motion.div
            key={currentScore}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl @[80px]:text-3xl @[120px]:text-4xl font-black text-neo-black font-neo-display"
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
          {t('wordHunt.survival.scoreBreakdownTooltip') || 'Tap for details'}
        </div>
      </motion.div>
    </div>
  );
};

export default AccumulatedScoreDisplay;
