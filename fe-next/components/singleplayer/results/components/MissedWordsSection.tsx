'use client';

import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/utils/utils';

export interface BoardMissedWord {
  word: string;
  score: number;
}

interface MissedWordsSectionProps {
  words: BoardMissedWord[];
  playerFoundCount: number;
  totalBoardWords?: number;
  initialDisplayCount?: number;
  className?: string;
}

const getWordLengthColor = (length: number): string => {
  if (length >= 7) return 'bg-neo-red text-neo-black';
  if (length === 6) return 'bg-neo-pink text-white';
  if (length === 5) return 'bg-neo-cyan text-neo-black';
  return 'bg-neo-lime text-neo-black';
};

/**
 * Shows ALL valid board words the player didn't find.
 * Sorted by length (longest first), collapsible with show more.
 */
const MissedWordsSection = memo<MissedWordsSectionProps>(({
  words,
  playerFoundCount,
  totalBoardWords,
  initialDisplayCount = 10,
  className,
}) => {
  const { t, language, dir } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const displayWords = useMemo(
    () => expanded ? words : words.slice(0, initialDisplayCount),
    [words, expanded, initialDisplayCount]
  );

  const hasMore = words.length > initialDisplayCount;
  const total = totalBoardWords ?? (playerFoundCount + words.length);

  if (words.length === 0) return null;

  const countText = t('singlePlayer.results.missedWords.count')
    .replace('{found}', String(playerFoundCount))
    .replace('{total}', String(total));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
      className={cn('w-full', className)}
      data-testid="missed-words-section"
    >
      <div className="border-3 border-neo-black rounded-neo shadow-hard overflow-hidden bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-700 border-b-3 border-neo-black">
          <div className={cn('flex items-center gap-2', dir === 'rtl' && 'flex-row-reverse')}>
            <Eye className="w-4 h-4 text-neo-cyan" />
            <span className="font-black text-xs uppercase text-white tracking-wider">
              {t('singlePlayer.results.missedWords.title')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-white/60">
            {countText}
          </span>
        </div>

        {/* Words grid */}
        <div className="p-2.5 flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {displayWords.map((w, i) => (
              <motion.div
                key={w.word}
                data-testid="missed-word"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.02 }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-neo text-sm',
                  'border-2 border-slate-600 bg-slate-700/80'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black',
                  getWordLengthColor(w.word.length)
                )}>
                  {w.score}
                </span>
                <span className="font-bold uppercase text-white/90">
                  {language === 'he' ? applyHebrewFinalLetters(w.word) : w.word}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Show more/less */}
        {hasMore && (
          <div className="px-2.5 pb-2.5">
            <button
              onClick={() => setExpanded(prev => !prev)}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-neo',
                'text-xs font-bold uppercase',
                'bg-slate-700 hover:bg-slate-600 text-white/80 hover:text-white',
                'border border-slate-600 transition-colors'
              )}
            >
              <span>
                {expanded ? t('common.showLess') : t('singlePlayer.results.missedWords.showMore')}
              </span>
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

MissedWordsSection.displayName = 'MissedWordsSection';

export default MissedWordsSection;
