'use client';

import React, { useRef, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { List, Star, Flame, Zap, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean | null;
  comboBonus?: number;
  fireRoundBonus?: number;
}

interface DesktopWordListProps {
  /** List of found words */
  foundWords: FoundWord[];
  /** Whether to show only valid words */
  showOnlyValid?: boolean;
  /** Maximum words to display (rest are collapsed) */
  maxVisible?: number;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * DesktopWordList - Right sidebar panel for desktop layout
 * Shows found words with scores, bonuses, and stats
 */
export const DesktopWordList: React.FC<DesktopWordListProps> = ({
  foundWords,
  showOnlyValid = true,
  maxVisible = 15,
  t,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize all derived data from foundWords in a single pass
  const { displayWords, sortedWords, longestWord, totalBonusPoints } = React.useMemo(() => {
    const filtered = showOnlyValid
      ? foundWords.filter(w => w.isValid === true)
      : foundWords;
    const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    const longest = filtered.reduce((max, w) => w.word.length > max.length ? w.word : max, '');
    const bonus = filtered.reduce((sum, w) => sum + (w.comboBonus || 0) + (w.fireRoundBonus || 0), 0);
    return { displayWords: filtered, sortedWords: sorted, longestWord: longest, totalBonusPoints: bonus };
  }, [foundWords, showOnlyValid]);

  // Capture render time once to determine "new" words (avoids impure Date.now() in render)
  // Updates when sortedWords changes, so new words get the "new" animation
  const [renderTime, setRenderTime] = useState(() => Date.now());
  useEffect(() => {
    setRenderTime(Date.now());
  }, [sortedWords.length]);

  // Determine which words to show
  const visibleWords = isExpanded ? sortedWords : sortedWords.slice(0, maxVisible);
  const hiddenCount = sortedWords.length - maxVisible;

  // Auto-scroll to top when new word is added
  useEffect(() => {
    if (listRef.current && sortedWords.length > 0) {
      listRef.current.scrollTop = 0;
    }
  }, [sortedWords.length]);

  return (
    <div className="h-full flex flex-col bg-neo-navy/50 rounded-neo border-2 border-neo-black/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neo-cream/15 bg-neo-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-neo-cyan" />
          <span className="font-bold text-neo-white text-sm uppercase tracking-wide">
            {t('singlePlayer.wordsFound')}
          </span>
        </div>
        <div className="bg-neo-cyan/20 border border-neo-cyan/30 px-2.5 py-0.5 rounded-neo">
          <span className="font-black text-neo-cyan text-lg tabular-nums">{displayWords.length}</span>
        </div>
      </div>

      {/* Word List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-neo-cream/20 scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {visibleWords.map((word, index) => (
            <WordItem
              key={`${word.word}-${word.timestamp}`}
              word={word}
              isNew={index === 0 && renderTime - word.timestamp < 2000}
              t={t}
            />
          ))}
        </AnimatePresence>

        {/* Show More/Less Button */}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-neo-white hover:text-neo-white transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                {t('common.showLess')}
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                {t('singlePlayer.showMore', { count: hiddenCount })}
              </>
            )}
          </button>
        )}

        {/* Empty State */}
        {displayWords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-neo-white">
            <List className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">{t('singlePlayer.noWordsYet')}</span>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {displayWords.length > 0 && (
        <div className="shrink-0 border-t border-neo-cream/10 bg-neo-black/20 p-3 space-y-2">
          {/* Best Word */}
          {longestWord && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-neo-white">
                <Trophy className="w-3 h-3 text-neo-lime" />
                <span>{t('singlePlayer.bestWord')}</span>
              </div>
              <span className="font-bold text-neo-lime uppercase tracking-wider">
                {longestWord}
              </span>
            </div>
          )}

          {/* Bonus Points */}
          {totalBonusPoints > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-neo-white">
                <Zap className="w-3 h-3 text-neo-pink" />
                <span>{t('singlePlayer.bonusPoints')}</span>
              </div>
              <span className="font-bold text-neo-pink">
                +{totalBonusPoints}
              </span>
            </div>
          )}

          {/* Word Length Distribution */}
          <WordLengthDistribution words={displayWords} />
        </div>
      )}
    </div>
  );
};

/**
 * Individual word item in the list
 */
interface WordItemProps {
  word: FoundWord;
  isNew: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const WordItem: React.FC<WordItemProps> = ({ word, isNew, t }) => {
  const hasComboBonus = (word.comboBonus ?? 0) > 0;
  const hasFireBonus = (word.fireRoundBonus ?? 0) > 0;
  // word.score already includes combo + fire bonuses from calculateWordScore
  const totalScore = word.score;

  // Word length color coding
  const lengthColor = word.word.length >= 7
    ? 'text-neo-pink'
    : word.word.length >= 5
      ? 'text-neo-cyan'
      : 'text-neo-white';

  return (
    <m.div
      initial={isNew ? { opacity: 0, y: -20, scale: 0.9 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center justify-between px-3 py-1.5 rounded-neo",
        "bg-neo-black/20 hover:bg-neo-black/30 transition-colors",
        isNew && "ring-2 ring-neo-lime/50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Word */}
        <span className={cn(
          "font-bold uppercase tracking-wider truncate",
          lengthColor
        )}>
          {word.word}
        </span>

        {/* Bonus Indicators */}
        <div className="flex items-center gap-1 shrink-0">
          {hasComboBonus && (
            <div className="flex items-center text-neo-lime" title={t('singlePlayer.comboBonus')}>
              <Zap className="w-3 h-3" />
            </div>
          )}
          {hasFireBonus && (
            <div className="flex items-center text-neo-orange" title={t('singlePlayer.fireBonus')}>
              <Flame className="w-3 h-3" />
            </div>
          )}
          {word.word.length >= 7 && (
            <Star className="w-3 h-3 text-neo-pink" />
          )}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1 shrink-0 tabular-nums">
        <span className="font-black text-neo-white tracking-normal">
          {totalScore}
        </span>
        {(hasComboBonus || hasFireBonus) && (
          <span className="text-xs text-neo-lime tracking-normal">
            (+{(word.comboBonus || 0) + (word.fireRoundBonus || 0)})
          </span>
        )}
      </div>
    </m.div>
  );
};

/**
 * Word length distribution bar chart
 */
interface WordLengthDistributionProps {
  words: FoundWord[];
}

const WordLengthDistribution: React.FC<WordLengthDistributionProps> = ({ words }) => {
  // Count words by length
  const lengthCounts: Record<string, number> = {};
  words.forEach(w => {
    const len = w.word.length >= 7 ? '7+' : String(w.word.length);
    lengthCounts[len] = (lengthCounts[len] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(lengthCounts), 1);
  const lengths = ['3', '4', '5', '6', '7+'];

  return (
    <div className="flex items-end gap-1 h-8">
      {lengths.map(len => {
        const count = lengthCounts[len] || 0;
        const height = count > 0 ? Math.max(15, (count / maxCount) * 100) : 0;

        return (
          <div key={len} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={cn(
                "w-full rounded-t transition-all duration-300",
                len === '7+' ? 'bg-neo-pink' : len === '6' ? 'bg-neo-cyan' : 'bg-neo-cream/40'
              )}
              style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
            />
            <span className="text-[8px] text-neo-white">{len}</span>
          </div>
        );
      })}
    </div>
  );
};

export default DesktopWordList;
