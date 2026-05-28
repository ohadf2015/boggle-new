'use client';

import { memo, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Grid3X3, ChevronDown, ChevronUp } from 'lucide-react';
import type { LetterGrid } from '@/types';

export interface WordHuntBoardReviewProps {
  grid: LetterGrid | null;
  targetWord: string;
  t: (key: string) => string;
}

/**
 * Collapsible board review for Word Hunt results.
 * Shows the game grid with target word letters highlighted.
 */
export const WordHuntBoardReview = memo<WordHuntBoardReviewProps>(({
  grid,
  targetWord,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Compute which grid positions contain letters from the target word
  const highlightedPositions = useMemo(() => {
    if (!grid || !targetWord) return new Set<string>();

    const targetLetters = targetWord.toUpperCase().split('');
    const remaining = [...targetLetters];
    const positions = new Set<string>();

    // First pass: exact matches (greedy, first occurrence)
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const letter = (grid[row][col] || '').toUpperCase();
        const idx = remaining.indexOf(letter);
        if (idx !== -1) {
          positions.add(`${row}-${col}`);
          remaining.splice(idx, 1);
        }
      }
    }

    return positions;
  }, [grid, targetWord]);

  if (!grid) return null;

  return (
    <div className="space-y-1">
      <m.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-neo-navy/50 border-3 border-neo-black rounded-neo shadow-hard-sm text-neo-white hover:text-neo-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-neo-cyan" />
          <span className="text-sm font-bold">{t('wordHunt.mp.viewBoard')}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </m.button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            data-testid="board-review-grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-neo-navy/30 border-3 border-neo-black rounded-neo">
              <div
                className="grid gap-1 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${grid[0]?.length || 4}, 1fr)`,
                  maxWidth: `${(grid[0]?.length || 4) * 48}px`,
                }}
              >
                {grid.map((row, rowIdx) =>
                  row.map((letter, colIdx) => {
                    const key = `${rowIdx}-${colIdx}`;
                    const isHighlighted = highlightedPositions.has(key);
                    return (
                      <div
                        key={key}
                        data-highlighted={isHighlighted ? 'true' : 'false'}
                        className={`aspect-square flex items-center justify-center rounded-neo border-2 text-sm font-black uppercase ${
                          isHighlighted
                            ? 'bg-neo-yellow/30 border-neo-yellow text-neo-yellow'
                            : 'bg-neo-white/5 border-neo-white/10 text-neo-white'
                        }`}
                      >
                        {(letter || '').toUpperCase()}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 mt-2 justify-center">
                <div className="w-3 h-3 rounded-sm bg-neo-yellow/30 border border-neo-yellow" />
                <span className="text-xs text-neo-white">
                  {t('wordHunt.mp.boardReview')}
                </span>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

WordHuntBoardReview.displayName = 'WordHuntBoardReview';
