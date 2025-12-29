'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Hash, Sparkles, Target, Grid3X3 } from 'lucide-react';
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

type LengthFilter = 'all' | 3 | 4 | 5 | 6 | '7+';

const lengthFilters: LengthFilter[] = ['all', 3, 4, 5, 6, '7+'];

const getLengthLabel = (filter: LengthFilter, t: (key: string) => string): string => {
  if (filter === 'all') return t('common.all') || 'All';
  if (filter === '7+') return '7+';
  return `${filter}`;
};

const getWordLengthColor = (length: number): string => {
  if (length >= 7) return 'bg-neo-orange text-neo-black border-neo-orange';
  if (length === 6) return 'bg-neo-purple text-white border-neo-purple';
  if (length === 5) return 'bg-neo-cyan text-neo-black border-neo-cyan';
  if (length === 4) return 'bg-neo-lime text-neo-black border-neo-lime';
  return 'bg-neo-yellow text-neo-black border-neo-yellow';
};

/**
 * Neo-Brutalist "Found by Opponents" Section
 * Shows high-value words that opponents discovered first
 * Educational and motivating - helps players learn new words
 *
 * Enhanced with:
 * - Word length category filters
 * - Click-to-reveal path on grid
 * - Better visual grouping
 * - Stats summary
 */
const MissedWords: React.FC<MissedWordsProps> = ({
  missedWords,
  maxDisplay = 8,
  className,
  onWordSelect,
  selectedWord,
}) => {
  const { t, language, dir } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<LengthFilter>('all');

  // Filter to only show high-value words (3+ points)
  const highValueWords = useMemo(() =>
    missedWords.filter(w => w.score >= 3).sort((a, b) => b.score - a.score),
    [missedWords]
  );

  // Group words by length for stats
  const wordsByLength = useMemo(() => {
    const groups: Record<number, MissedWord[]> = {};
    highValueWords.forEach(w => {
      const len = w.word.length;
      if (!groups[len]) groups[len] = [];
      groups[len].push(w);
    });
    return groups;
  }, [highValueWords]);

  // Apply length filter
  const filteredWords = useMemo(() => {
    if (lengthFilter === 'all') return highValueWords;
    if (lengthFilter === '7+') return highValueWords.filter(w => w.word.length >= 7);
    return highValueWords.filter(w => w.word.length === lengthFilter);
  }, [highValueWords, lengthFilter]);

  // Handle word click for path reveal
  const handleWordClick = useCallback((wordData: MissedWord) => {
    if (onWordSelect) {
      // Toggle selection if clicking the same word
      if (selectedWord === wordData.word) {
        onWordSelect('', undefined);
      } else {
        onWordSelect(wordData.word, wordData.path);
      }
    }
  }, [onWordSelect, selectedWord]);

  if (highValueWords.length === 0) {
    return null;
  }

  const displayedWords = isExpanded ? filteredWords : filteredWords.slice(0, maxDisplay);
  const hasMore = filteredWords.length > maxDisplay;

  // Calculate total potential score missed
  const totalMissedScore = highValueWords.reduce((sum, w) => sum + w.score, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn('w-full', className)}
    >
      <div
        className={cn(
          'rounded-neo-lg border-3 border-neo-black shadow-hard overflow-hidden',
          'bg-gradient-to-br from-amber-50 to-orange-50',
          'dark:from-amber-900/20 dark:to-orange-900/20'
        )}
        style={{ transform: 'rotate(0.5deg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-neo-orange text-neo-black border-b-3 border-neo-black">
          <div className={cn("flex items-center gap-2", dir === 'rtl' && 'flex-row-reverse')}>
            <div className="w-8 h-8 rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
              <Target className="w-5 h-5 text-neo-orange" />
            </div>
            <div>
              <h3 className="font-black text-neo-black uppercase text-sm">
                {t('results.foundByOpponents') || 'Found by Opponents'}
              </h3>
              <p className="text-xs font-bold text-neo-black/70">
                {t('results.foundByOpponentsHint') || 'Tap to reveal on grid'}
              </p>
            </div>
          </div>
          {/* Stats summary */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center px-2 py-1 bg-neo-cream/80 rounded-neo border-2 border-neo-black/50">
              <span className="text-xs font-bold text-neo-black/60">{t('results.words') || 'Words'}</span>
              <span className="font-black text-sm text-neo-black">{highValueWords.length}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-1 bg-neo-cream/80 rounded-neo border-2 border-neo-black/50">
              <span className="text-xs font-bold text-neo-black/60">{t('results.points') || 'Pts'}</span>
              <span className="font-black text-sm text-neo-black">{totalMissedScore}</span>
            </div>
          </div>
        </div>

        {/* Length Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 bg-neo-cream/50 border-b-2 border-neo-black/10 overflow-x-auto">
          {lengthFilters.map((filter) => {
            const count = filter === 'all'
              ? highValueWords.length
              : filter === '7+'
              ? Object.entries(wordsByLength)
                  .filter(([len]) => parseInt(len) >= 7)
                  .reduce((sum, [, words]) => sum + words.length, 0)
              : wordsByLength[filter as number]?.length ?? 0;

            if (count === 0 && filter !== 'all') return null;

            return (
              <button
                key={filter}
                onClick={() => setLengthFilter(filter)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-neo text-xs font-black uppercase whitespace-nowrap transition-all',
                  'border-2 shadow-hard-sm hover:-translate-y-0.5',
                  lengthFilter === filter
                    ? 'bg-neo-black text-neo-cream border-neo-black'
                    : 'bg-neo-cream text-neo-black border-neo-black/30 hover:border-neo-black'
                )}
              >
                {filter === 'all' ? (
                  <Sparkles className="w-3 h-3" />
                ) : (
                  <Hash className="w-3 h-3" />
                )}
                <span>{getLengthLabel(filter, t)}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Words List */}
        <div className="p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {displayedWords.map((wordData, index) => {
              const isSelected = selectedWord === wordData.word;
              const hasPath = !!wordData.path && wordData.path.length > 0;

              return (
                <motion.div
                  key={wordData.word}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => hasPath && handleWordClick(wordData)}
                  className={cn(
                    'flex items-center justify-between gap-3 p-2 rounded-neo',
                    'bg-white dark:bg-slate-800 border-2',
                    'transition-all duration-150',
                    hasPath && 'cursor-pointer hover:border-neo-orange hover:-translate-y-0.5 hover:shadow-hard-sm',
                    isSelected
                      ? 'border-neo-orange bg-neo-orange/10 shadow-hard-sm ring-2 ring-neo-orange/50'
                      : 'border-neo-black/20'
                  )}
                >
                  {/* Word and score */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Score badge with length-based color */}
                    <div className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-neo flex items-center justify-center',
                      'font-black text-sm border-2 border-neo-black',
                      getWordLengthColor(wordData.word.length)
                    )}>
                      {wordData.score}
                    </div>

                    {/* Word */}
                    <span className={cn(
                      'font-black text-sm sm:text-base uppercase truncate',
                      isSelected ? 'text-neo-orange' : 'text-foreground'
                    )}>
                      {language === 'he' ? applyHebrewFinalLetters(wordData.word) : wordData.word}
                    </span>

                    {/* Path indicator */}
                    {hasPath && (
                      <Grid3X3 className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isSelected ? 'text-neo-orange' : 'text-muted-foreground/50'
                      )} />
                    )}
                  </div>

                  {/* Found by */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Users className="w-3 h-3" />
                    <span className="font-bold max-w-[80px] truncate">
                      {wordData.foundBy.length === 1
                        ? wordData.foundBy[0]
                        : `${wordData.foundBy.length} ${t('results.players') || 'players'}`
                      }
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Show more/less button */}
          {hasMore && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 rounded-neo',
                'bg-neo-cream dark:bg-slate-700 border-2 border-neo-black/20',
                'font-bold text-sm text-neo-black dark:text-neo-cream uppercase',
                'hover:border-neo-orange transition-colors'
              )}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t('common.showLess') || 'Show Less'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('results.showMoreWords', { count: highValueWords.length - maxDisplay }) ||
                    `Show ${highValueWords.length - maxDisplay} More`}
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Motivational footer */}
        <div className="px-4 py-2 bg-neo-cream/50 text-neo-black dark:bg-slate-800/50 dark:text-white border-t-2 border-neo-black/10">
          <p className="text-xs text-center font-bold text-muted-foreground">
            {t('results.foundByOpponentsMotivation') || "Learn these for next time!"}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MissedWords;
