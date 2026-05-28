'use client';

import React, { memo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Ghost } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { AlmostFoundWord } from '@/shared/utils/nearMissCalculator';

interface AlmostFoundWordsProps {
  words: AlmostFoundWord[];
  className?: string;
  onWordSelect?: (word: string, path?: { row: number; col: number }[]) => void;
}

/**
 * "You Almost Found..." section for results screen.
 * Shows words the player nearly traced, triggering loss aversion.
 * Uses ghost-style dashed borders for a "what could have been" feel.
 */
const AlmostFoundWords = memo<AlmostFoundWordsProps>(({
  words,
  className,
  onWordSelect,
}) => {
  const { t } = useLanguage();

  const handleWordClick = useCallback((word: AlmostFoundWord) => {
    onWordSelect?.(word.word, word.wordPath);
  }, [onWordSelect]);

  if (words.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.4 }}
      className={cn('w-full', className)}
    >
      <div className="rounded-neo-lg border-2 border-dashed border-white/30 overflow-hidden bg-neo-navy-light/60">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-neo-navy-elevated/50 border-b border-dashed border-white/20">
          <Ghost className="w-4 h-4 text-white" />
          <span className="font-bold text-xs uppercase text-white">
            {t('almostFound.title')}
          </span>
        </div>

        {/* Word chips */}
        <div className="p-2 flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {words.map((word, index) => (
              <m.button
                key={word.word}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: index * 0.05 }}
                onClick={() => handleWordClick(word)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-neo text-sm',
                  'border-2 border-dashed border-white/30',
                  'bg-neo-navy-elevated/40 hover:bg-slate-600/50',
                  'cursor-pointer hover:scale-105 transition-all duration-150'
                )}
              >
                {/* Match percentage */}
                <span className="w-8 h-5 rounded-sm flex items-center justify-center text-[10px] font-black bg-neo-purple/60 text-white">
                  {Math.round(word.matchPercentage)}%
                </span>
                {/* Word */}
                <span className="font-bold uppercase text-white">
                  {word.word}
                </span>
                {/* Score */}
                <span className="text-[10px] font-black text-neo-lime/80">
                  +{word.score}
                </span>
              </m.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </m.div>
  );
});

AlmostFoundWords.displayName = 'AlmostFoundWords';

export default AlmostFoundWords;
