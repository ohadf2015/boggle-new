'use client';

import React, { memo } from 'react';
import { Keyboard } from 'lucide-react';
import { SurvivalHeader } from './SurvivalHeader';
import { SurvivalClueBoxes } from './SurvivalClueBoxes';
import { SurvivalLifeBar } from './SurvivalLifeBar';
import { SurvivalLiveRanks } from './SurvivalLiveRanks';
import { SurvivalLootPanel } from './SurvivalLootPanel';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { WordDiscovery, TargetAttempt, AccumulatedClue } from './types';

export interface SurvivalDesktopLayoutProps {
  isTv: boolean;
  playfield: React.ReactNode;
  isGameOver: boolean;
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
  /** Quick Play mode: suppress daily-specific score tier badge */
  practice?: boolean;
  t: (key: string) => string;
}

/**
 * Desktop 3-column layout — Minimal Cyber-Hybrid design.
 * Rounded zone panels with thin neon glow borders (pink/cyan/lime).
 * Left: Live leaderboard, Center: Game area, Right: Loot/Score panel
 */
function SurvivalDesktopLayoutImpl({
  isTv,
  playfield,
  isGameOver,
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
  practice = false,
  t,
}: SurvivalDesktopLayoutProps): React.ReactElement {
  const sidebarWidth = isTv ? '320px' : '280px';
  const short = useMediaQuery('(max-height: 799px)');

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
            practice={practice}
            t={t}
          />

          {/* Clue Boxes — fixed min-height prevents layout shift during feedback */}
          <div className={cn('w-full flex items-center justify-center', !short && 'min-h-[120px]')}>
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
              compact={short}
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

          <div
            data-testid="desktop-playfield"
            data-short={short ? 'true' : 'false'}
            className="relative flex min-h-0 w-full flex-1 justify-center [container-type:size]"
          >
            <div className={cn('relative', short ? 'w-[min(100cqw,calc(100cqh-86px))]' : 'w-[min(100cqw,calc(100cqh-114px))]')}>
              {playfield}
            </div>
          </div>

          {/* Desktop Keyboard Tip */}
          <div className="flex items-center gap-1.5 text-neo-white/50 text-xs font-medium mt-1">
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

export const SurvivalDesktopLayout = memo(SurvivalDesktopLayoutImpl);
SurvivalDesktopLayout.displayName = 'SurvivalDesktopLayout';
export default SurvivalDesktopLayout;
