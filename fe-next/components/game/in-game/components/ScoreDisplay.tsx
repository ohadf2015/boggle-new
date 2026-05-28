'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import ScoreBreakdownTooltip from '../../ScoreBreakdownTooltip';
import type { TranslationFn } from '../types';
import { displayScore } from '@/utils/scoreDisplay';

const SCORE_GLOW_STYLE = { textShadow: '0 0 12px rgba(191,255,0,0.4)' } as const;
const SCORE_GLOW_SM_STYLE = { textShadow: '0 0 10px rgba(191,255,0,0.4)' } as const;

interface ScoreDisplayProps {
  score: number;
  rank: number | null;
  leaderboardSize: number;
  minWordLength: number;
  t: TranslationFn;
  /** Size variant */
  variant?: 'mobile' | 'desktop';
}

/**
 * ScoreDisplay - Shows player's score with rank badge
 * Enhanced with pulse ring on score change and glowing number
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

  // Track score changes for pulse effect
  const prevScoreRef = useRef(score);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (score > prevScoreRef.current) {
      setPulseKey(k => k + 1);
    }
    prevScoreRef.current = score;
  }, [score]);

  const scoreLabel = `${t('common.score')}: ${displayScore(score)}${rank ? `, #${rank}` : ''}`;

  // Desktop variant (larger, hover effect)
  if (isDesktop) {
    return (
      <AdaptiveMotion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative border-2 border-neo-lime/30 rounded-neo shadow-none px-4 py-1.5 min-w-[90px] overflow-hidden bg-neo-lime/10"
        whileHover={{ scale: 1.05 }}
        role="status"
        aria-live="polite"
        aria-label={scoreLabel}
      >
        {/* Expanding pulse ring on score increase */}
        <AdaptiveAnimatePresence>
          {pulseKey > 0 && (
            <AdaptiveMotion.div
              key={`pulse-${pulseKey}`}
              className="absolute inset-0 rounded-neo border-2 border-neo-lime pointer-events-none"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
        </AdaptiveAnimatePresence>
        <div className="text-center relative z-10">
          <AdaptiveMotion.div
            key={score}
            initial={{ scale: 1.4, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="text-3xl font-black text-neo-lime leading-tight"
            style={SCORE_GLOW_STYLE}
          >
            {displayScore(score)}
          </AdaptiveMotion.div>
          <div className="text-sm font-bold uppercase tracking-wider text-neo-white flex items-center justify-center gap-0.5">
            {t('common.score')}
            <ScoreBreakdownTooltip t={t} minWordLength={minWordLength} />
          </div>
        </div>
        {rank && rank > 0 && (
          <AdaptiveMotion.div
            key={`rank-${rank}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-6 h-6 bg-neo-pink text-neo-white border-2 border-neo-pink/50 rounded-full flex items-center justify-center text-xs font-black shadow-none"
          >
            #{rank}
          </AdaptiveMotion.div>
        )}
      </AdaptiveMotion.div>
    );
  }

  // Mobile variant
  return (
    <AdaptiveMotion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative border-2 border-neo-lime/30 rounded-neo shadow-none px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px] md:min-w-[90px] overflow-visible bg-neo-lime/10"
      role="status"
      aria-live="polite"
      aria-label={scoreLabel}
    >
      {/* Expanding pulse ring on score increase */}
      <AdaptiveAnimatePresence>
        {pulseKey > 0 && (
          <AdaptiveMotion.div
            key={`pulse-${pulseKey}`}
            className="absolute inset-0 rounded-neo border-2 border-neo-lime pointer-events-none"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </AdaptiveAnimatePresence>
      <div className="text-center relative z-10">
        <AdaptiveMotion.div
          key={score}
          initial={{ scale: 1.4, y: -3 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="font-black text-neo-lime leading-tight text-lg md:text-2xl"
          style={SCORE_GLOW_SM_STYLE}
        >
          {displayScore(score)}
        </AdaptiveMotion.div>
        <div className="font-bold uppercase tracking-wider text-neo-white text-[9px] md:text-xs">
          {t('common.score')}
        </div>
      </div>
      {/* Rank badge with spring entrance */}
      {rank && rank > 0 && leaderboardSize > 1 && (
        <AdaptiveMotion.div
          key={`rank-${rank}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-4 h-4 md:w-6 md:h-6 bg-neo-pink text-neo-white border-2 border-neo-pink/50 rounded-full flex items-center justify-center text-[8px] md:text-xs font-black shadow-none"
        >
          #{rank}
        </AdaptiveMotion.div>
      )}
    </AdaptiveMotion.div>
  );
});
