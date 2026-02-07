'use client';

import React from 'react';
import { SurvivalHeader } from './SurvivalHeader';
import { SurvivalClueBoxes } from './SurvivalClueBoxes';
import { SurvivalLifeBar } from './SurvivalLifeBar';
import { SurvivalGridSection } from './SurvivalGridSection';
import { SurvivalLiveRanks } from './SurvivalLiveRanks';
import { SurvivalLootPanel } from './SurvivalLootPanel';
import type { LetterGrid, Language } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { WordDiscovery, TargetAttempt, AccumulatedClue } from './types';

export interface SurvivalDesktopLayoutProps {
  isTv: boolean;
  // Grid
  grid: LetterGrid;
  isGameOver: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath: Array<{ row: number; col: number }>;
  // Life
  lifePoints: number;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;
  skipAnimations: boolean;
  onLifeGainComplete: () => void;
  // Score
  liveScore: number;
  lastScoreIncrement: number | null;
  isScoreAnimating: boolean;
  // Clues
  currentHint: HintLevel | null;
  targetWord: string;
  attempts: TargetAttempt[];
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  knownLetters: Set<string>;
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;
  isClueGaining: boolean;
  clueContainerRef: React.RefObject<HTMLDivElement | null>;
  gameDir: 'ltr' | 'rtl';
  // Loot panel
  discoveredWords: WordDiscovery[];
  hintStage: number;
  // Leaderboard
  puzzleDate: string;
  language: Language | string;
  currentPlayerId: string | null;
  currentGuestFingerprint: string | null;
  // Quit
  onQuitClick: () => void;
  t: (key: string) => string;
}

/**
 * Desktop 3-column layout for Word Hunt survival mode.
 * Left: Live leaderboard, Center: Game area, Right: Loot/Score panel
 */
export function SurvivalDesktopLayout({
  isTv,
  grid,
  isGameOver,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  highlightedPath,
  lifePoints,
  isLifeGaining,
  lifeGainAmount,
  skipAnimations,
  onLifeGainComplete,
  liveScore,
  lastScoreIncrement,
  isScoreAnimating,
  currentHint,
  targetWord,
  attempts,
  accumulatedClues,
  revealedLetters,
  knownLetters,
  latestAttemptFeedback,
  showFeedbackOverlay,
  isClueGaining,
  clueContainerRef,
  gameDir,
  discoveredWords,
  hintStage,
  puzzleDate,
  language,
  currentPlayerId,
  currentGuestFingerprint,
  onQuitClick,
  t,
}: SurvivalDesktopLayoutProps): React.ReactElement {
  return (
    <div className="relative flex h-full w-full bg-neo-navy">
      {/* 3-Column Grid */}
      <div
        data-testid="desktop-grid"
        className="flex w-full h-full max-h-full gap-4 p-4 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: isTv ? '320px 1fr 320px' : '280px 1fr 280px',
          gridTemplateRows: '1fr',
        }}
      >
        {/* Left Sidebar - Live Ranks */}
        <div className="h-full overflow-hidden">
          <SurvivalLiveRanks
            puzzleDate={puzzleDate}
            language={language}
            currentPlayerId={currentPlayerId}
            currentGuestFingerprint={currentGuestFingerprint}
            t={t}
          />
        </div>

        {/* Center - Game Area */}
        <div className="flex flex-col items-center justify-center h-full min-w-0 min-h-0 gap-2 relative z-10">
          {/* Header */}
          <SurvivalHeader
            liveScore={liveScore}
            lastScoreIncrement={lastScoreIncrement}
            isScoreAnimating={isScoreAnimating}
            onQuitClick={onQuitClick}
            t={t}
          />

          {/* Clue Boxes */}
          <SurvivalClueBoxes
            ref={clueContainerRef}
            currentHint={currentHint}
            targetWord={targetWord}
            attempts={attempts}
            accumulatedClues={accumulatedClues}
            revealedLetters={revealedLetters}
            knownLetters={knownLetters}
            latestAttemptFeedback={latestAttemptFeedback}
            showFeedbackOverlay={showFeedbackOverlay}
            isClueGaining={isClueGaining}
            skipAnimations={skipAnimations}
            gameDir={gameDir}
            t={t}
          />

          {/* Life Bar */}
          <SurvivalLifeBar
            lifePoints={lifePoints}
            isGameOver={isGameOver}
            isLifeGaining={isLifeGaining}
            lifeGainAmount={lifeGainAmount}
            skipAnimations={skipAnimations}
            onLifeGainComplete={onLifeGainComplete}
          />

          {/* Game Grid */}
          <SurvivalGridSection
            grid={grid}
            isGameOver={isGameOver}
            eliminatedLetters={eliminatedLetters}
            onWordSubmit={onWordSubmit}
            onWordChange={onWordChange}
            highlightedPath={highlightedPath}
            t={t}
          />
        </div>

        {/* Right Sidebar - Loot Panel */}
        <div className="h-full overflow-hidden">
          <SurvivalLootPanel
            discoveredWords={discoveredWords}
            hintStage={hintStage}
            attempts={attempts}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

export default SurvivalDesktopLayout;
