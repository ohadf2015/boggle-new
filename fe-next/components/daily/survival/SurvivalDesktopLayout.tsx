'use client';

import React, { memo } from 'react';
import { Keyboard } from 'lucide-react';
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
 * Desktop 3-column layout — Minimal Cyber-Hybrid design.
 * Rounded zone panels with thin neon glow borders (pink/cyan/lime).
 * Left: Live leaderboard, Center: Game area, Right: Loot/Score panel
 */
function SurvivalDesktopLayoutImpl({
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
  const sidebarWidth = isTv ? '320px' : '280px';

  return (
    <div className="relative flex h-full w-full bg-neo-navy">
      {/* 3-Column Grid */}
      <div
        data-testid="desktop-grid"
        className="flex w-full h-full max-h-full gap-6 p-5 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `${sidebarWidth} 1fr ${sidebarWidth}`,
          gridTemplateRows: '1fr',
        }}
      >
        {/* Left Sidebar — Live Ranks (pink accent) */}
        <div className="h-full overflow-hidden zone-panel-pink rounded-neo">
          <SurvivalLiveRanks
            puzzleDate={puzzleDate}
            language={language}
            currentPlayerId={currentPlayerId}
            currentGuestFingerprint={currentGuestFingerprint}
            t={t}
          />
        </div>

        {/* Center — Game Area (cyan accent + glow) */}
        <div className="flex flex-col items-center justify-center h-full min-w-0 min-h-0 gap-2 relative z-10 zone-panel-cyan rounded-neo px-4 py-3">
          {/* Header */}
          <SurvivalHeader
            liveScore={liveScore}
            lastScoreIncrement={lastScoreIncrement}
            isScoreAnimating={isScoreAnimating}
            onQuitClick={onQuitClick}
            t={t}
          />

          {/* Clue Boxes — fixed min-height prevents layout shift during feedback */}
          <div className="w-full min-h-[120px] flex items-center justify-center">
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
          </div>

          {/* Life Bar */}
          <SurvivalLifeBar
            lifePoints={lifePoints}
            isGameOver={isGameOver}
            isLifeGaining={isLifeGaining}
            lifeGainAmount={lifeGainAmount}
            skipAnimations={skipAnimations}
            onLifeGainComplete={onLifeGainComplete}
          />

          {/* Game Grid with HUD corner accents */}
          <div className="relative">
            {/* HUD Corner Accents */}
            <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-[3px] border-l-[3px] border-neo-cyan rounded-tl pointer-events-none opacity-40" />
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-[3px] border-r-[3px] border-neo-cyan rounded-tr pointer-events-none opacity-40" />
            <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-[3px] border-l-[3px] border-neo-cyan rounded-bl pointer-events-none opacity-40" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-[3px] border-r-[3px] border-neo-cyan rounded-br pointer-events-none opacity-40" />

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

          {/* Desktop Keyboard Tip */}
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mt-1">
            <Keyboard className="w-3.5 h-3.5" />
            <span>{t('wordHunt.survival.keyboardTip')}</span>
          </div>
        </div>

        {/* Right Sidebar — Loot Panel (lime accent) */}
        <div className="h-full overflow-hidden zone-panel-lime rounded-neo">
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

// Memoized: parent re-renders ~1× per second from life-drain timer.
// Without memo, every tick cascades through this 3-column layout and into
// GridComponent, defeating the cell-tree memo work. Stable-ref props are
// expected from the parent (callbacks via useCallback, derived data via useMemo).
// Both named + default exports resolve to the memoized version so consumers
// importing either path get the same memo guarantee.
export const SurvivalDesktopLayout = memo(SurvivalDesktopLayoutImpl);
SurvivalDesktopLayout.displayName = 'SurvivalDesktopLayout';
export default SurvivalDesktopLayout;
