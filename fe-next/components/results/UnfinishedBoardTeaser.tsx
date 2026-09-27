'use client';

import React, { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface UnfinishedBoardTeaserProps {
  missedWords: string[];
  className?: string;
}

/**
 * Masks a word: shows first and last letter, underscores for middle.
 * E.g. QUARTZ -> Q _ _ _ T Z
 */
function maskWord(word: string): string {
  if (word.length <= 2) return word;
  const first = word[0];
  const last = word[word.length - 1];
  const middle = Array(word.length - 2).fill('_').join(' ');
  return `${first} ${middle} ${last}`;
}

/**
 * Shows on results page: "3 words are waiting for you tomorrow"
 * Lists missed words with masked letters in neo-brutalist style.
 */
const UnfinishedBoardTeaser = memo<UnfinishedBoardTeaserProps>(({
  missedWords,
  className,
}) => {
  const { t, dir } = useLanguage();

  const maskedWords = useMemo(
    () => missedWords.map(w => maskWord(w.toUpperCase())),
    [missedWords]
  );

  if (missedWords.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.5 }}
      className={cn(
        'rounded-neo border-3 border-neo-cyan overflow-hidden shadow-hard',
        'bg-neo-navy',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-neo-cyan/10 border-b-3 border-neo-cyan/30">
        <div className={cn('flex items-center gap-2', dir === 'rtl' && 'flex-row-reverse')}>
          <BookOpen className="w-4 h-4 text-neo-cyan" />
          <span className="font-black text-xs uppercase text-neo-cyan tracking-wider">
            {t('unfinishedBoard.teaser')}
          </span>
        </div>
      </div>

      {/* Masked words list */}
      <div className="p-3 space-y-2">
        {maskedWords.map((masked, index) => (
          <div
            key={missedWords[index]}
            data-testid={`masked-word-${index}`}
            className={cn(
              'px-3 py-2 rounded-neo bg-neo-navy-light border-2 border-neo-black/30',
              'font-mono text-sm font-bold text-neo-white tracking-[0.25em]',
              'text-center'
            )}
          >
            {masked}
          </div>
        ))}
      </div>
    </m.div>
  );
});

UnfinishedBoardTeaser.displayName = 'UnfinishedBoardTeaser';

export default UnfinishedBoardTeaser;
