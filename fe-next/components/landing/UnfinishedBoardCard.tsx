'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { BookOpen, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LetterGrid } from '@/shared/types/game';

interface UnfinishedBoardCardProps {
  grid: LetterGrid;
  missedWords: string[];
  score: number;
  wordsFound: number;
  totalWords: number;
  onResume: () => void;
  className?: string;
}

/** Mini grid preview: colored squares representing the board */
function MiniGridPreview({ grid }: { grid: LetterGrid }) {
  const colors = [
    'bg-neo-cyan/60', 'bg-neo-lime/60', 'bg-neo-pink/60',
    'bg-neo-yellow/60', 'bg-neo-orange/60',
  ];

  return (
    <div
      data-testid="mini-grid-preview"
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${grid[0]?.length || 4}, 1fr)`,
      }}
    >
      {grid.flatMap((row, ri) =>
        row.map((letter, ci) => {
          const colorIndex = (ri + ci) % colors.length;
          return (
            <div
              key={`${ri}-${ci}`}
              data-testid={`grid-cell-${ri}-${ci}`}
              className={cn(
                'aspect-square rounded-sm border border-neo-black/30',
                'flex items-center justify-center',
                'text-[8px] font-black text-white',
                colors[colorIndex]
              )}
            >
              {letter}
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Landing page card: "Your board from yesterday is still waiting"
 * Shows mini grid preview and resume CTA.
 */
const UnfinishedBoardCard = memo<UnfinishedBoardCardProps>(({
  grid,
  missedWords,
  score: _score,
  wordsFound,
  totalWords,
  onResume,
  className,
}) => {
  const { t, dir } = useLanguage();

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={cn(
        'rounded-neo border-3 border-neo-yellow overflow-hidden shadow-hard',
        'bg-neo-navy',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-neo-yellow/10 border-b-3 border-neo-yellow/30">
        <div className={cn('flex items-center gap-2', dir === 'rtl' && 'flex-row-reverse')}>
          <BookOpen className="w-4 h-4 text-neo-yellow" />
          <span className="font-black text-sm text-neo-yellow">
            {t('unfinishedBoard.resumeTitle')}
          </span>
        </div>
        <span className="text-[10px] font-bold bg-neo-cyan px-2 py-0.5 border-2 border-neo-black shadow-hard-sm text-neo-black">
          {missedWords.length} {t('unfinishedBoard.wordsWaiting')}
        </span>
      </div>

      {/* Content */}
      <div className="p-3 flex gap-3">
        {/* Mini grid */}
        <div className="w-20 h-20 shrink-0">
          <MiniGridPreview grid={grid} />
        </div>

        {/* Info + CTA */}
        <div className="flex-1 flex flex-col justify-between">
          <p className="text-xs text-neo-white font-medium">
            {t('unfinishedBoard.resumeDesc', { found: wordsFound, total: totalWords })}
          </p>

          <m.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onResume}
            className={cn(
              'flex items-center justify-center gap-1.5 mt-2',
              'px-3 py-2 rounded-neo border-3 border-neo-black',
              'bg-neo-yellow text-neo-black font-black text-xs uppercase',
              'shadow-hard-sm hover:shadow-hard transition-shadow'
            )}
          >
            <Play className="w-3.5 h-3.5" />
            {t('unfinishedBoard.resumeCta')}
          </m.button>
        </div>
      </div>
    </m.div>
  );
});

UnfinishedBoardCard.displayName = 'UnfinishedBoardCard';

export default UnfinishedBoardCard;
