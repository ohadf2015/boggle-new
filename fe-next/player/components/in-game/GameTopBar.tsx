'use client';

import React, { memo } from 'react';
import ExitRoomButton from '../../../components/ExitRoomButton';
import HintButton from '../../../components/HintButton';

interface HintsState {
  hint: string | null;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category' | null;
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
  isSinglePlayer: boolean;
  requestHint: () => void;
  clearHint: () => void;
}

interface GameTopBarProps {
  onExitRoom: () => void;
  exitLabel: string;
  hints?: HintsState;
  gameActive: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * GameTopBar - Top bar with exit button and optional hints
 * Contains the exit button and hint button for single-player mode
 */
export const GameTopBar = memo<GameTopBarProps>(({
  onExitRoom,
  exitLabel,
  hints,
  gameActive,
  t,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-1">
      <ExitRoomButton onClick={onExitRoom} label={exitLabel} className="relative z-50" />

      {/* Hint Button - Single Player Mode Only */}
      {hints && hints.isSinglePlayer && (
        <HintButton
          hint={hints.hint}
          hintType={hints.hintType}
          hintsRemaining={hints.hintsRemaining}
          wordLength={hints.wordLength}
          firstLetter={hints.firstLetter}
          isLoading={hints.isLoading}
          error={hints.error}
          isAvailable={hints.isAvailable}
          isSinglePlayer={hints.isSinglePlayer}
          gameActive={gameActive}
          onRequestHint={hints.requestHint}
          onClearHint={hints.clearHint}
          t={t}
        />
      )}
    </div>
  );
});

GameTopBar.displayName = 'GameTopBar';

export default GameTopBar;
