'use client';

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Grid3X3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/utils/utils';

interface MissedWord {
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
  if (length >= 7) return 'bg-neo-orange text-neo-black';
  if (length === 6) return 'bg-neo-purple text-white';
  if (length === 5) return 'bg-neo-cyan text-neo-black';
  if (length === 4) return 'bg-neo-lime text-neo-black';
  return 'bg-neo-yellow text-neo-black';
};

/**
 * Compact "Top Words You Missed" Section
 * Shows only top 3 high-value words to keep it simple and motivating
 */
const MissedWords: React.FC<MissedWordsProps> = ({
  missedWords,
  maxDisplay = 3,
  className,
  onWordSelect,
  selectedWord,
}) => {
  const { t, language, dir } = useLanguage();

  // Filter to only show high-value words (3+ points), take top 3
  const topWords = useMemo(() =>
    missedWords
      .filter(w => w.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    [missedWords]
  );

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

  if (topWords.length === 0) {
    return null;
  }

  // Calculate total potential points
  const totalPoints = topWords.reduce((sum, w) => sum + w.score, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn('w-full', className)}
    >
      <div
        className={cn(
          'rounded-neo-lg border-2 border-neo-black/30 overflow-hidden',
          'bg-gradient-to-br from-amber-50/80 to-orange-50/80',
          'dark:from-amber-900/10 dark:to-orange-900/10'
        )}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neo-orange/80 text-neo-black border-b-2 border-neo-black/20">
          <div className={cn("flex items-center gap-2", dir === 'rtl' && 'flex-row-reverse')}>
            <Target className="w-4 h-4" />
            <span className="font-bold text-xs uppercase">
              {t('results.topMissed') || 'Top Words to Learn'}
            </span>
          </div>
          <span className="text-xs font-black bg-neo-yellow/80 px-2 py-0.5 rounded-full">
            +{totalPoints} pts
          </span>
        </div>

        {/* Words List - Just top 3 */}
        <div className="p-2 flex flex-wrap gap-1.5">
          {topWords.map((wordData, index) => {
            const isSelected = selectedWord === wordData.word;
            const hasPath = !!wordData.path && wordData.path.length > 0;

            return (
              <motion.button
                key={wordData.word}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => hasPath && handleWordClick(wordData)}
                disabled={!hasPath}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-neo text-xs',
                  'border transition-all duration-150',
                  hasPath && 'cursor-pointer hover:scale-105',
                  isSelected
                    ? 'border-neo-orange bg-neo-orange/20 ring-1 ring-neo-orange/50'
                    : 'border-neo-black/20 bg-white dark:bg-slate-800'
                )}
              >
                {/* Score badge */}
                <span className={cn(
                  'w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black',
                  getWordLengthColor(wordData.word.length)
                )}>
                  {wordData.score}
                </span>
                {/* Word */}
                <span className={cn(
                  'font-bold uppercase',
                  isSelected ? 'text-neo-orange' : 'text-foreground'
                )}>
                  {language === 'he' ? applyHebrewFinalLetters(wordData.word) : wordData.word}
                </span>
                {/* Path indicator */}
                {hasPath && (
                  <Grid3X3 className={cn(
                    'w-3 h-3',
                    isSelected ? 'text-neo-orange' : 'text-muted-foreground/40'
                  )} />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default MissedWords;
