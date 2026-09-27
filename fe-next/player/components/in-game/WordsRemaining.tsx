'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';

interface WordsRemainingProps {
  /** Total words available on the board */
  totalWords: number | null;
  /** Number of valid words found by the player */
  foundWordsCount: number;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Optional: compact mode for mobile/landscape */
  compact?: boolean;
  /** Optional: minimum word length being tracked (for display purposes) */
  minLength?: number;
}

/**
 * WordsRemaining - Displays the count of words remaining to be found on the board
 * Shows above the found words list to indicate progress
 * When minLength is provided, displays "5+ letter words" label
 */
export const WordsRemaining = memo<WordsRemainingProps>(({
  totalWords,
  foundWordsCount,
  t,
  compact = false,
  minLength,
}) => {
  // Don't render if we don't have total words yet
  if (totalWords === null || totalWords === 0) {
    return null;
  }

  const remaining = Math.max(0, totalWords - foundWordsCount);
  const progress = totalWords > 0 ? (foundWordsCount / totalWords) * 100 : 0;

  // Generate label based on minLength
  const getLengthLabel = () => {
    if (!minLength) return '';
    return t('playerView.longWordsLabel', { min: minLength }) || `${minLength}+ letters`;
  };

  if (compact) {
    // Compact version for landscape/mobile
    return (
      <div className="bg-neo-navy/80 text-white text-neo-cream border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-center">
        <m.div
          key={remaining}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-sm font-black leading-tight"
        >
          {remaining}
        </m.div>
        <div className="text-[10px] font-bold uppercase text-neo-cream/90">
          {minLength ? getLengthLabel() : (t('playerView.remaining'))}
        </div>
      </div>
    );
  }

  // Full version for desktop sidebar
  const headerTitle = minLength
    ? (t('playerView.longWordsOnBoard', { min: minLength }) || `${minLength}+ Letter Words`)
    : (t('playerView.wordsOnBoard'));

  const remainingLabel = minLength
    ? (t('playerView.longWordsRemaining', { min: minLength }) || `${minLength}+ letter words left`)
    : (t('playerView.wordsRemaining'));

  return (
    <div
      className="bg-neo-navy text-white border-4 border-neo-black rounded-neo-lg shadow-hard-lg overflow-hidden mb-2"
      style={{ transform: 'rotate(-0.5deg)' }}
    >
      {/* Header */}
      <div className="py-2 px-4 border-b-3 border-neo-black bg-neo-orange text-neo-black">
        <h4 className="text-neo-black text-sm uppercase tracking-widest font-black text-center">
          {headerTitle}
        </h4>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Remaining count */}
        <div className="text-center mb-2">
          <m.div
            key={remaining}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-3xl font-black text-neo-cream leading-tight"
          >
            {remaining}
          </m.div>
          <div className="text-xs font-bold uppercase tracking-wide text-neo-cream/90">
            {remainingLabel}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-neo-black/30 text-white rounded-full overflow-hidden border-2 border-neo-black">
          <m.div
            className="h-full bg-linear-to-r from-neo-lime to-neo-cyan rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          />
        </div>

        {/* Stats */}
        <div className="flex justify-between mt-2 text-xs font-bold text-neo-cream/90">
          <span>{foundWordsCount} {t('playerView.found')}</span>
          <span>{totalWords} {t('playerView.total')}</span>
        </div>
      </div>
    </div>
  );
});

WordsRemaining.displayName = 'WordsRemaining';

export default WordsRemaining;
