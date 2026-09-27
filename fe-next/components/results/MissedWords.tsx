'use client';

import React, { useMemo, useCallback, memo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Grid3X3, ChevronDown, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRevealList } from '@/hooks/useRevealList';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/utils/utils';

export interface MissedWord {
  word: string;
  score: number;
  foundBy: string[];
  path?: { row: number; col: number }[];
}

interface MissedWordsProps {
  missedWords: MissedWord[];
  maxDisplay?: number;
  className?: string;
  /** Callback when a word is selected to show its path on the grid */
  onWordSelect?: (word: string, path?: { row: number; col: number }[]) => void;
  /** Currently selected word for highlighting */
  selectedWord?: string | null;
}

const getWordLengthColor = (length: number): string => {
  if (length >= 7) return 'bg-neo-red text-neo-black';
  if (length === 6) return 'bg-neo-pink text-white';
  if (length === 5) return 'bg-neo-cyan text-neo-black';
  if (length === 4) return 'bg-neo-lime text-neo-black';
  return 'bg-neo-lime text-neo-black';
};

/**
 * "Words You Missed on the Board" Section
 * Shows high-value words with "show more" functionality
 */
const MissedWords = memo<MissedWordsProps>(({
  missedWords,
  maxDisplay = 3,
  className,
  onWordSelect,
  selectedWord,
}) => {
  const { t, language, dir } = useLanguage();
  // Accessibility: honor OS "reduce motion" — card + chips appear instantly,
  // no hover/press transforms. Compositor-only props keep the animated path 60fps.
  const reduce = useReducedMotion();

  // Filter to only show high-value words (3+ points)
  const allHighValueWords = useMemo(() =>
    missedWords
      .filter(w => w.score >= 3)
      .sort((a, b) => b.score - a.score),
    [missedWords]
  );

  // Collapse to the top N highlights with a tap-to-reveal toggle (shared logic).
  const {
    visible: displayWords,
    hasMore: hasMoreWords,
    showAll,
    toggle,
    hiddenCount,
  } = useRevealList(allHighValueWords, maxDisplay);

  // Handle word click for path reveal
  const handleWordClick = useCallback((wordData: MissedWord) => {
    if (onWordSelect) {
      if (selectedWord === wordData.word) {
        onWordSelect('', undefined);
      } else {
        onWordSelect(wordData.word, wordData.path);
      }
    }
  }, [onWordSelect, selectedWord]);

  if (allHighValueWords.length === 0) {
    return (
      <div className={cn('py-6 text-center text-neo-white text-sm', className)}>
        {t('results.noMissedWords')}
      </div>
    );
  }

  // Calculate total potential points for displayed words
  const totalPoints = displayWords.reduce((sum, w) => sum + w.score, 0);
  const allTotalPoints = allHighValueWords.reduce((sum, w) => sum + w.score, 0);

  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 26, delay: 0.3 }}
      className={cn('w-full', className)}
    >
      <div
        className={cn(
          'rounded-neo border-3 border-neo-black overflow-hidden shadow-hard',
          'bg-neo-navy'
        )}
      >
        {/* Header - clearer messaging about missed words */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-neo-navy-light border-b-3 border-neo-black relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[6px_6px]" />
          <div className={cn("flex items-center gap-2 relative z-10", dir === 'rtl' && 'flex-row-reverse')}>
            <EyeOff className="w-4 h-4 text-neo-lime" />
            <span className="font-black text-xs uppercase text-white tracking-wider">
              {t('results.missedOnBoard')}
            </span>
          </div>
          <span className="text-[10px] font-black bg-neo-lime px-2.5 py-0.5 border-2 border-neo-black shadow-hard-sm text-neo-black relative z-10">
            +{showAll ? allTotalPoints : totalPoints} {t('results.points')}
          </span>
        </div>

        {/* Words List */}
        <div className="p-2 flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {displayWords.map((wordData, index) => {
              const isSelected = selectedWord === wordData.word;
              const hasPath = !!wordData.path && wordData.path.length > 0;

              return (
                <m.button
                  key={wordData.word}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.7, y: 8, rotate: index % 2 === 0 ? -6 : 6 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -4 }}
                  whileHover={reduce ? undefined : { scale: 1.08, y: -2, rotate: index % 2 === 0 ? 2 : -2 }}
                  whileTap={reduce ? undefined : { scale: 0.92 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 350, damping: 18, delay: Math.min(index, 6) * 0.04 }
                  }
                  onClick={() => hasPath && handleWordClick(wordData)}
                  disabled={!hasPath}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-neo text-sm',
                    'border-2 transition-all duration-150',
                    hasPath && 'cursor-pointer hover:scale-105',
                    isSelected
                      ? 'border-neo-lime bg-neo-lime/30 ring-2 ring-neo-lime/50'
                      : 'border-neo-black/40 bg-neo-navy-light hover:bg-neo-navy-light/80'
                  )}
                >
                  {/* Score badge */}
                  <span className={cn(
                    'w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black',
                    getWordLengthColor(wordData.word.length)
                  )}>
                    {wordData.score}
                  </span>
                  {/* Word - high contrast white text */}
                  <span className={cn(
                    'font-bold uppercase',
                    isSelected ? 'text-neo-lime' : 'text-white'
                  )}>
                    {language === 'he' ? applyHebrewFinalLetters(wordData.word) : wordData.word}
                  </span>
                  {/* Path indicator */}
                  {hasPath && (
                    <Grid3X3 className={cn(
                      'w-3 h-3',
                      isSelected ? 'text-neo-lime' : 'text-neo-white'
                    )} />
                  )}
                </m.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Show More/Less button */}
        {hasMoreWords && (
          <div className="px-2 pb-2">
            <m.button
              onClick={toggle}
              whileHover={reduce ? undefined : { scale: 1.02 }}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-neo',
                'text-xs font-bold uppercase',
                'bg-neo-navy-light hover:bg-neo-navy text-neo-white hover:text-white',
                'border-2 border-neo-black/30 transition-colors'
              )}
            >
              <span>
                {showAll
                  ? (t('common.showLess'))
                  : `${t('common.showMore')} (${hiddenCount})`
                }
              </span>
              <m.div
                animate={{ rotate: showAll ? 180 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <ChevronDown className="w-4 h-4" />
              </m.div>
            </m.button>
          </div>
        )}
      </div>
    </m.div>
  );
});

MissedWords.displayName = 'MissedWords';

export default MissedWords;
