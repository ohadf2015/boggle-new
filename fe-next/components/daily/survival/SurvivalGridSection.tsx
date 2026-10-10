'use client';

import React from 'react';
import type { LetterGrid } from '@/types';
import { HuntBoard } from './HuntBoard';

export interface SurvivalGridSectionProps {
  grid: LetterGrid;
  isGameOver: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: Array<{ row: number; col: number }>;
  t: (key: string) => string;
}

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
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <HuntBoard
        grid={grid}
        isGameOver={isGameOver}
        eliminatedLetters={eliminatedLetters}
        onWordSubmit={onWordSubmit}
        onWordChange={onWordChange}
        highlightedPath={highlightedPath}
        t={t}
      />
    </div>
  );
};
