'use client';

import React from 'react';
import GridComponent, { type HighlightedCell } from '@/components/GridComponent';
import { cn } from '@/lib/utils';
import type { LetterGrid } from '@/types';

export interface SurvivalGridSectionProps {
  grid: LetterGrid;
  isGameOver: boolean;
  isProtected: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: HighlightedCell[];
  t: (key: string) => string;
}

/**
 * Grid section with screenshot protection overlay
 */
export const SurvivalGridSection: React.FC<SurvivalGridSectionProps> = ({
  grid,
  isGameOver,
  isProtected,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  highlightedPath,
  t,
}) => {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center relative">
      <div className={cn(
        "transition-all duration-200",
        isProtected && "blur-xl pointer-events-none select-none"
      )}>
        <GridComponent
          grid={grid}
          interactive={!isGameOver && !isProtected}
          onWordSubmit={onWordSubmit}
          onWordChange={onWordChange}
          hideWordPreview
          hideComboIndicator
          comboLevel={0}
          eliminatedLetters={eliminatedLetters}
          highlightedPath={highlightedPath}
        />
      </div>

      {/* Screenshot protection overlay */}
      {isProtected && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-neo-black/80 text-white px-6 py-4 rounded-neo border-3 border-neo-yellow shadow-hard text-center">
            <div className="text-2xl mb-2">👀</div>
            <div className="font-bold text-sm">
              {t('daily.screenshotProtection') || 'Click here to continue'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
