'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import ScoreBreakdownTooltip from '../../ScoreBreakdownTooltip';
import type { TranslationFn } from '../types';

interface ScoreDisplayProps {
  score: number;
  rank: number | null;
  leaderboardSize: number;
  minWordLength: number;
  t: TranslationFn;
  /** Size variant */
  variant?: 'mobile' | 'desktop' | 'landscape';
}

/**
 * ScoreDisplay - Shows player's score with rank badge
 */
export const ScoreDisplay = memo<ScoreDisplayProps>(function ScoreDisplay({
  score,
  rank,
  leaderboardSize,
  minWordLength,
  t,
  variant = 'mobile',
}) {
  const isDesktop = variant === 'desktop';
  const isLandscape = variant === 'landscape';

  // Landscape variant (simpler display)
  if (isLandscape) {
    return (
      <div className="flex flex-col items-center">
        <motion.div
          key={score}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="landscape-stat-primary text-neo-black"
        >
          {score}
        </motion.div>
        <div className="landscape-stat-label text-neo-black flex items-center gap-0.5">
          {t('common.score') || 'SCORE'}
          <ScoreBreakdownTooltip t={t} minWordLength={minWordLength} />
        </div>
      </div>
    );
  }

  // Desktop variant (larger, hover effect)
  if (isDesktop) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-4 py-1.5 min-w-[90px] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #BFFF00 0%, #9AFF00 50%, #FFE135 100%)' }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
        <div className="text-center">
          <motion.div
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-3xl font-black text-neo-black leading-tight"
            style={{ textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}
          >
            {score}
          </motion.div>
          <div className="text-sm font-bold uppercase tracking-wider text-neo-black flex items-center justify-center gap-0.5">
            {t('common.score') || 'Score'}
            <ScoreBreakdownTooltip t={t} minWordLength={minWordLength} />
          </div>
        </div>
        {rank && rank > 0 && (
          <div className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-6 h-6 bg-neo-pink text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-xs font-black shadow-hard-sm">
            #{rank}
          </div>
        )}
      </motion.div>
    );
  }

  // Mobile variant
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative border-2 md:border-3 border-neo-black rounded-neo shadow-hard md:shadow-hard-lg px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px] md:min-w-[90px] overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
      }}
    >
      <div className="text-center">
        <motion.div
          key={score}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="font-black text-neo-black leading-tight text-lg md:text-2xl"
          style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
        >
          {score}
        </motion.div>
        <div className="font-bold uppercase tracking-wider text-neo-black/80 text-[9px] md:text-xs">
          {t('common.score') || 'Score'}
        </div>
      </div>
      {/* Rank badge */}
      {rank && rank > 0 && leaderboardSize > 1 && (
        <div className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-4 h-4 md:w-6 md:h-6 bg-neo-pink text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-[8px] md:text-xs font-black shadow-hard-sm">
          #{rank}
        </div>
      )}
    </motion.div>
  );
});
