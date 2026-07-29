'use client';

import React from 'react';
import GridComponent, { type HighlightedCell } from '@/components/GridComponent';
import type { LetterGrid } from '@/types';

export interface SurvivalGridSectionProps {
  grid: LetterGrid;
  isGameOver: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: HighlightedCell[];
  t: (key: string) => string;
}

/**
 * Grid section component
 */
export const SurvivalGridSection: React.FC<SurvivalGridSectionProps> = ({
  grid,
  isGameOver,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  highlightedPath,
  t,
}) => {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center">
      <GridComponent
        grid={grid}
        interactive={!isGameOver}
        onWordSubmit={onWordSubmit}
        onWordChange={onWordChange}
        hideWordPreview
        hideComboIndicator
        comboLevel={0}
        eliminatedLetters={eliminatedLetters}
        highlightedPath={highlightedPath}
        disableLetterKeyInput={true}
      />
    </div>
  );
};
