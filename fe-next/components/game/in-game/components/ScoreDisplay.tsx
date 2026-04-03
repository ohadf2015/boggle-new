'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import ScoreBreakdownTooltip from '../../ScoreBreakdownTooltip';
import type { TranslationFn } from '../types';
import { displayScore } from '@/utils/scoreDisplay';

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
        className="relative border-3 border-neo-black rounded-neo shadow-hard-lg px-4 py-1.5 min-w-[90px] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--neo-lime) 0%, var(--neo-lime-light) 50%, var(--neo-yellow) 100%)' }}
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
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
        <div className="text-center relative z-10">
          <AdaptiveMotion.div
            key={score}
            initial={{ scale: 1.4, y: -4 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="text-3xl font-black text-neo-black leading-tight"
            style={{ textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}
          >
            {displayScore(score)}
          </AdaptiveMotion.div>
          <div className="text-sm font-bold uppercase tracking-wider text-neo-black flex items-center justify-center gap-0.5">
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
            className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-6 h-6 bg-neo-pink text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-xs font-black shadow-hard-sm"
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
      className="relative border-2 md:border-3 border-neo-black rounded-neo shadow-hard md:shadow-hard-lg px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px] md:min-w-[90px] overflow-visible"
      style={{
        background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
      }}
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
          className="font-black text-neo-black leading-tight text-lg md:text-2xl"
          style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
        >
          {displayScore(score)}
        </AdaptiveMotion.div>
        <div className="font-bold uppercase tracking-wider text-neo-black/80 text-[9px] md:text-xs">
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
          className="absolute -top-1.5 -right-1.5 rtl:-right-auto rtl:-left-1.5 w-4 h-4 md:w-6 md:h-6 bg-neo-pink text-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center text-[8px] md:text-xs font-black shadow-hard-sm"
        >
          #{rank}
        </AdaptiveMotion.div>
      )}
    </AdaptiveMotion.div>
  );
});
