'use client';

import { memo } from 'react';
import { SurvivalClueBoxes } from '@/components/daily/survival/SurvivalClueBoxes';
import { SurvivalLifeBar } from '@/components/daily/survival/SurvivalLifeBar';
import { SurvivalGridSection } from '@/components/daily/survival/SurvivalGridSection';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import { WordHuntMPHeader } from './WordHuntMPHeader';
import { WordHuntMPLeaderboard, type LeaderboardPlayer } from './WordHuntMPLeaderboard';
import { WordHuntGameOverOverlay } from './WordHuntGameOverOverlay';
import type { DeathRecapStats } from './WordHuntDeathRecap';
import type { LetterGrid } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from '@/components/daily/survival/types';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { HighlightedCell } from '@/components/GridComponent';

export interface WordHuntGameLayoutProps {
  // Header
  score: number;
  onQuit: () => void;
  onShowHelp?: () => void;

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
  /** Username of who found the target (null = not found yet). Used to show correct overlay. */
  targetFoundBy?: string | null;
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

  // Death recap
  deathRecapStats?: DeathRecapStats | null;

  // Common
  t: (key: string, params?: Record<string, string | number>) => string;
  gameDir: 'ltr' | 'rtl';
}

export const WordHuntGameLayout = memo<WordHuntGameLayoutProps>(({
  // Header
  score,
  onQuit,
  onShowHelp,

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
  targetFoundBy,
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

  // Death recap
  deathRecapStats,

  // Common
  t,
  gameDir,
}) => {
  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-x-hidden overflow-y-auto">
      {/* Main game area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Score + Quit — compact */}
        <WordHuntMPHeader
          score={score}
          onQuit={onQuit}
          onShowHelp={onShowHelp}
          t={t}
        />

        {/* Clue Boxes — tight vertical padding */}
        <div className={`px-2 py-0 flex-shrink-0${wrongGuessShake ? ' animate-neo-shake' : ''}`}>
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

        {/* Life Bar — compact wrapper */}
        <div className="px-2 py-0 flex-shrink-0">
          <SurvivalLifeBar
            lifePoints={lifePoints}
            isGameOver={isGameOver}
            isLifeGaining={isLifeGaining}
            lifeGainAmount={lifeGainAmount}
            skipAnimations={false}
            onLifeGainComplete={() => {}}
          />
        </div>

        {/* Grid — fills remaining space, auto-scales to fit */}
        <div className="flex-1 min-h-[40dvh] px-1 relative overflow-y-auto overflow-x-hidden">
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
            reason={isGameOver ? (targetFound ? (targetFoundBy != null && targetFoundBy !== currentUsername ? 'otherFound' : 'found') : 'eliminated') : null}
            t={t}
            deathRecapStats={deathRecapStats}
          />
        </div>

        {/* Word Forming Area */}
        <div className="px-2 flex-shrink-0">
          <WordFormingArea
            word={formedWord}
            letterCount={letterCount}
            feedback={wordFeedback}
            compact
          />
        </div>

        {/* MP Leaderboard — mobile: compact horizontal strip */}
        <div className="flex-shrink-0 max-h-[10vh] overflow-y-auto lg:hidden">
          <WordHuntMPLeaderboard
            playerLives={playerLives}
            eliminatedPlayers={eliminatedPlayers}
            leaderboard={leaderboard}
            currentUsername={currentUsername}
            t={t}
          />
        </div>
      </div>

      {/* MP Leaderboard — desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 lg:border-s-3 lg:border-neo-black lg:bg-neo-navy/50 lg:overflow-y-auto">
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
