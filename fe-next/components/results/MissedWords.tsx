'use client';

import React, { useMemo, useCallback, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, ChevronDown, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const [showAll, setShowAll] = useState(false);

  // Filter to only show high-value words (3+ points)
  const allHighValueWords = useMemo(() =>
    missedWords
      .filter(w => w.score >= 3)
      .sort((a, b) => b.score - a.score),
    [missedWords]
  );

  // Show either top N or all words based on state
  const displayWords = useMemo(() =>
    showAll ? allHighValueWords : allHighValueWords.slice(0, maxDisplay),
    [allHighValueWords, showAll, maxDisplay]
  );

  const hasMoreWords = allHighValueWords.length > maxDisplay;

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
    return null;
  }

  // Calculate total potential points for displayed words
  const totalPoints = displayWords.reduce((sum, w) => sum + w.score, 0);
  const allTotalPoints = allHighValueWords.reduce((sum, w) => sum + w.score, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.3 }}
      className={cn('w-full', className)}
    >
      <div
        className={cn(
          'rounded-neo border-3 border-neo-black overflow-hidden shadow-hard',
          'bg-neo-navy'
        )}
      >
        {/* Header - clearer messaging about missed words */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neo-navy-light border-b-3 border-neo-black">
          <div className={cn("flex items-center gap-2", dir === 'rtl' && 'flex-row-reverse')}>
            <EyeOff className="w-4 h-4 text-neo-lime" />
            <span className="font-bold text-xs uppercase text-white">
              {t('results.missedOnBoard')}
            </span>
          </div>
          <span className="text-xs font-black bg-neo-lime px-2 py-0.5 rounded-full text-neo-black">
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
                <motion.button
                  key={wordData.word}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26, delay: index * 0.03 }}
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
                      isSelected ? 'text-neo-lime' : 'text-slate-400'
                    )} />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Show More/Less button */}
        {hasMoreWords && (
          <div className="px-2 pb-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-neo',
                'text-xs font-bold uppercase',
                'bg-neo-navy-light hover:bg-neo-navy text-neo-cream/80 hover:text-white',
                'border-2 border-neo-black/30 transition-colors'
              )}
            >
              <span>
                {showAll
                  ? (t('common.showLess'))
                  : (t('common.showMore') || `Show ${allHighValueWords.length - maxDisplay} More`)
                }
              </span>
              <motion.div
                animate={{ rotate: showAll ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

MissedWords.displayName = 'MissedWords';

export default MissedWords;
