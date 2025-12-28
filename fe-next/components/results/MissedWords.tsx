'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/utils/utils';

interface MissedWord {
  word: string;
  score: number;
  foundBy: string[];
}

interface MissedWordsProps {
  missedWords: MissedWord[];
  maxDisplay?: number;
  className?: string;
}

/**
 * Neo-Brutalist "Found by Opponents" Section
 * Shows high-value words that opponents discovered first
 * Educational and motivating - helps players learn new words
 */
const MissedWords: React.FC<MissedWordsProps> = ({
  missedWords,
  maxDisplay = 5,
  className,
}) => {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter to only show high-value words (3+ points)
  const highValueWords = missedWords.filter(w => w.score >= 3);

  if (highValueWords.length === 0) {
    return null;
  }

  const displayedWords = isExpanded ? highValueWords : highValueWords.slice(0, maxDisplay);
  const hasMore = highValueWords.length > maxDisplay;

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
        <div className="flex items-center gap-2 px-4 py-3 bg-neo-orange text-neo-black border-b-3 border-neo-black">
          <div className="w-8 h-8 rounded-neo bg-neo-cream text-neo-black border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
            <Users className="w-5 h-5 text-neo-orange" />
          </div>
          <div>
            <h3 className="font-black text-neo-black uppercase text-sm">
              {t('results.foundByOpponents') || 'Found by Opponents'}
            </h3>
            <p className="text-xs font-bold text-neo-black/70">
              {t('results.foundByOpponentsHint') || 'Words opponents discovered first'}
            </p>
          </div>
        </div>

        {/* Words List */}
        <div className="p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {displayedWords.map((wordData, index) => (
              <motion.div
                key={wordData.word}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center justify-between gap-3 p-2 rounded-neo',
                  'bg-white dark:bg-slate-800 border-2 border-neo-black/20',
                  'hover:border-neo-orange transition-colors'
                )}
              >
                {/* Word and score */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Score badge */}
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-neo flex items-center justify-center',
                    'font-black text-sm border-2 border-neo-black',
                    wordData.score >= 8 ? 'bg-neo-purple text-neo-cream' :
                    wordData.score >= 5 ? 'bg-neo-cyan text-neo-black' :
                    'bg-neo-lime text-neo-black'
                  )}>
                    {wordData.score}
                  </div>

                  {/* Word */}
                  <span className="font-black text-sm sm:text-base uppercase text-foreground truncate">
                    {language === 'he' ? applyHebrewFinalLetters(wordData.word) : wordData.word}
                  </span>
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
            ))}
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
