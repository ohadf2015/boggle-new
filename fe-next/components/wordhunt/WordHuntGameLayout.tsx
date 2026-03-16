'use client';

import React, { memo } from 'react';
import { SurvivalClueBoxes } from '@/components/daily/survival/SurvivalClueBoxes';
import { SurvivalLifeBar } from '@/components/daily/survival/SurvivalLifeBar';
import { SurvivalGridSection } from '@/components/daily/survival/SurvivalGridSection';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { WordHuntMPHeader } from './WordHuntMPHeader';
import { WordHuntMPLeaderboard, type LeaderboardPlayer } from './WordHuntMPLeaderboard';
import { WordHuntGameOverOverlay } from './WordHuntGameOverOverlay';
import type { LetterGrid } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from '@/components/daily/survival/types';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { HighlightedCell } from '@/components/GridComponent';

export interface WordHuntGameLayoutProps {
  // Header
  score: number;
  onQuit: () => void;

  // Clue boxes
  targetLength: number;
  currentHint: HintLevel;
  attempts: TargetAttempt[];
  accumulatedClues: Map<number, AccumulatedClue>;
  knownLetters: Set<string>;
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;

  // Life bar
  lifePoints: number;
  isGameOver: boolean;
  targetFound: boolean;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;

  // Clue animation
  isClueGaining: boolean;

  // Grid
  grid: LetterGrid;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: HighlightedCell[];

  // Word forming
  formedWord: string;
  letterCount: number;
  wordFeedback: WordFeedback | null;

  // Leaderboard
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  leaderboard: LeaderboardPlayer[];
  currentUsername: string;
  wrongGuessShake?: boolean;

  // Common
  t: (key: string) => string;
  gameDir: 'ltr' | 'rtl';
}

export const WordHuntGameLayout = memo<WordHuntGameLayoutProps>(({
  // Header
  score,
  onQuit,

  // Clue boxes
  targetLength,
  currentHint,
  attempts,
  accumulatedClues,
  knownLetters,
  latestAttemptFeedback,
  showFeedbackOverlay,

  // Life bar
  lifePoints,
  isGameOver,
  targetFound,
  isLifeGaining,
  lifeGainAmount,

  // Clue animation
  isClueGaining,

  // Grid
  grid,
  onWordSubmit,
  onWordChange,
  highlightedPath,

  // Word forming
  formedWord,
  letterCount,
  wordFeedback,

  // Leaderboard
  playerLives,
  eliminatedPlayers,
  leaderboard,
  currentUsername,
  wrongGuessShake,

  // Common
  t,
  gameDir,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ ['--game-chrome-height' as string]: '300px' } as React.CSSProperties}>
      {/* Score + Quit */}
      <WordHuntMPHeader
        score={score}
        onQuit={onQuit}
        t={t}
      />

      {/* Clue Boxes (target word blanks with accumulated feedback) */}
      <div className={`px-3 py-1${wrongGuessShake ? ' animate-neo-shake' : ''}`}>
        <SurvivalClueBoxes
          currentHint={currentHint}
          targetWord={'?'.repeat(targetLength)}
          attempts={attempts}
          accumulatedClues={accumulatedClues}
          revealedLetters={new Set<number>()}
          knownLetters={knownLetters}
          latestAttemptFeedback={latestAttemptFeedback}
          showFeedbackOverlay={showFeedbackOverlay}
          isClueGaining={isClueGaining}
          skipAnimations={false}
          gameDir={gameDir}
          t={t}
        />
      </div>

      {/* Life Bar */}
      <div className="px-3 py-1">
        <SurvivalLifeBar
          lifePoints={lifePoints}
          isGameOver={isGameOver}
          isLifeGaining={isLifeGaining}
          lifeGainAmount={lifeGainAmount}
          skipAnimations={false}
          onLifeGainComplete={() => {}}
        />
      </div>

      {/* Grid — fills remaining space */}
      <div className="flex-1 min-h-0 px-2 relative">
        <SurvivalGridSection
          grid={grid}
          isGameOver={isGameOver}
          eliminatedLetters={new Set<string>()}
          onWordSubmit={onWordSubmit}
          onWordChange={onWordChange}
          highlightedPath={highlightedPath}
          t={t}
        />

        {/* Floating invalid word notification over grid */}
        {wordFeedback && (wordFeedback.type === 'rejected' || wordFeedback.type === 'duplicate') && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className={`px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-bold text-sm animate-neo-shake ${
              wordFeedback.type === 'rejected' ? 'bg-neo-red text-neo-cream' : 'bg-neo-pink text-neo-black'
            }`}>
              {wordFeedback.type === 'rejected' && '✗ '}
              {wordFeedback.type === 'duplicate' && '⟳ '}
              {wordFeedback.message || (wordFeedback.type === 'duplicate' ? t('playerView.wordAlreadyFound') : t('playerView.invalidWord'))}
            </div>
          </div>
        )}

        {/* Game over overlay — death or victory, then spectator mode */}
        <WordHuntGameOverOverlay
          reason={isGameOver ? (targetFound ? 'found' : 'eliminated') : null}
          t={t}
        />
      </div>

      {/* Word Forming Area */}
      <div className="px-3 flex-shrink-0">
        <WordFormingArea
          word={formedWord}
          letterCount={letterCount}
          feedback={wordFeedback}
          compact
        />
      </div>

      {/* MP Leaderboard */}
      <div className="flex-shrink-0 max-h-[30vh] overflow-y-auto">
        <WordHuntMPLeaderboard
          playerLives={playerLives}
          eliminatedPlayers={eliminatedPlayers}
          leaderboard={leaderboard}
          currentUsername={currentUsername}
          t={t}
        />
      </div>
    </div>
  );
});

WordHuntGameLayout.displayName = 'WordHuntGameLayout';
