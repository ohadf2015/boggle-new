'use client';

import React, { memo, useState, useEffect, useCallback, type ReactNode } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import CircularTimer from '@/components/CircularTimer';
import GridComponent from '@/components/GridComponent';
import { PhaserGame } from '@/components/phaser/PhaserGame';

const USE_PHASER_GRID = process.env.NEXT_PUBLIC_PHASER_GRID === 'true';
import WordFormingArea, { type WordFeedback } from '../../WordFormingArea';
import ComboDisplay from '../../ComboDisplay';
import HintButton from '@/components/HintButton';
import CompactLeaderboard from '../../CompactLeaderboard';
import { shouldShowKeyboardTrails } from '../../keyboardTrailsUtils';
import { GameOverlays } from './GameOverlays';
import { GameHeader } from './GameHeader';
import { ScoreDisplay } from './ScoreDisplay';
import FloatingScoreAnimation from '../../FloatingScoreAnimation';
import type { LetterGrid, Language, GameMode, BlastTileOverlay, LetterFeedback } from '@/shared/types/game';
import type { ExtendedLeaderboardPlayer as LeaderboardPlayer } from '@/shared/types/view';
import type { HintsState, EarthquakeState, TranslationFn, TappedCellPosition } from '../types';
import { LeadChangeBanner } from '../../LeadChangeBanner';
import type { LeadChangeEvent } from '@/hooks/useLeadChangeDetection';
import { BlastMultiplayerOverlay } from '../../BlastMultiplayerOverlay';
import { WordHuntTargetArea } from '../../WordHuntTargetArea';
import { WordHuntLifeBar } from '../../WordHuntLifeBar';

interface LandscapeLayoutProps {
  // Core props
  username: string;
  isPlaying: boolean;
  t: TranslationFn;
  dir: 'rtl' | 'ltr';

  // Game state
  letterGrid: LetterGrid;
  remainingTime: number | null;
  timerValue: number;
  gameActive: boolean;
  showStartAnimation: boolean;
  gameLanguage: Language;
  comboLevel: number;
  comboTimeRemaining: number | null;
  comboDanger: boolean;
  fireRoundActive: boolean;

  // Visual state
  isExtremelyShortLandscape: boolean;
  hasAnimated: boolean;
  earthquakeState: EarthquakeState;

  // Player data
  playerScore: number;
  playerRank: number | null;
  leaderboard: LeaderboardPlayer[];

  // Word forming
  formedWord: string;
  letterCount: number;
  currentFeedback: WordFeedback | null;

  // Keyboard input
  isTypingMode: boolean;
  typedWord: string;
  highlightedCells: Array<{ row: number; col: number }>;
  lastWordFoundTime: number;
  totalGamesPlayed?: number;

  // Callbacks
  onExitRoom?: () => void;
  onShowTutorial?: () => void;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  onSingleTapDetected: (cell: TappedCellPosition) => void;

  // Hints
  hints?: HintsState;

  // Fire round
  fireRoundRemaining: number;

  // Tap-to-drag guidance
  showDragTutorial: boolean;
  onDismissDragTutorial: () => void;

  // Keyboard help
  isDesktop: boolean;
  showQuickTip: boolean;
  onDismissQuickTip: () => void;
  isHelpOpen: boolean;
  onCloseHelp: () => void;

  // Achievement dock
  children?: ReactNode;

  // Min word length for score breakdown
  minWordLength: number;

  // Lead change notification
  leadChangeEvent?: LeadChangeEvent | null;

  // Game mode overlays
  gameMode?: GameMode;
  blastTileOverlay?: BlastTileOverlay[];
  wordHuntTargetLength?: number;
  wordHuntAttempts?: Array<{ guess: string; feedback: LetterFeedback[] }>;
  wordHuntFound?: boolean;
  wordHuntLife?: number;
  onWordHuntGuess?: (guess: string) => void;
}

/**
 * LandscapeLayout - Full landscape mode layout for the game
 */
export const LandscapeLayout = memo<LandscapeLayoutProps>(function LandscapeLayout({
  username,
  isPlaying,
  t,
  dir,
  letterGrid,
  remainingTime,
  timerValue,
  gameActive,
  showStartAnimation,
  gameLanguage,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  fireRoundActive,
  isExtremelyShortLandscape,
  hasAnimated,
  earthquakeState,
  playerScore,
  playerRank,
  leaderboard,
  formedWord,
  letterCount,
  currentFeedback,
  isTypingMode,
  typedWord,
  highlightedCells,
  lastWordFoundTime,
  totalGamesPlayed,
  onExitRoom,
  onShowTutorial,
  onWordSubmit,
  onWordChange,
  onSingleTapDetected,
  hints,
  fireRoundRemaining,
  showDragTutorial,
  onDismissDragTutorial,
  isDesktop,
  showQuickTip,
  onDismissQuickTip,
  isHelpOpen,
  onCloseHelp,
  children,
  minWordLength,
  leadChangeEvent,
  gameMode,
  blastTileOverlay,
  wordHuntTargetLength,
  wordHuntAttempts,
  wordHuntFound,
  wordHuntLife,
  onWordHuntGuess,
}) {
  // Track floating score animation
  const [floatingScore, setFloatingScore] = useState<number | null>(null);
  const [isFireRoundScore, setIsFireRoundScore] = useState(false);

  // Trigger floating score animation when word is accepted
  useEffect(() => {
    if (currentFeedback?.type === 'accepted' && currentFeedback.score) {
      setFloatingScore(currentFeedback.score);
      setIsFireRoundScore(currentFeedback.fireRoundActive ?? false);
    }
  }, [currentFeedback]);

  // Clear floating score after animation completes
  // useCallback ensures stable reference to prevent infinite animation loop
  const handleScoreAnimationComplete = useCallback(() => {
    setFloatingScore(null);
    setIsFireRoundScore(false);
  }, []);

  return (
    <>
      {/* Floating Score Animation - renders above everything */}
      {isPlaying && (
        <FloatingScoreAnimation
          score={floatingScore}
          isFireRound={isFireRoundScore}
          onAnimationComplete={handleScoreAnimationComplete}
        />
      )}

      <GameOverlays
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        showDragTutorial={showDragTutorial}
        onDismissDragTutorial={onDismissDragTutorial}
        isPlaying={isPlaying}
        isDesktop={isDesktop}
        showQuickTip={showQuickTip}
        onDismissQuickTip={onDismissQuickTip}
        isTypingMode={isTypingMode}
        isHelpOpen={isHelpOpen}
        onCloseHelp={onCloseHelp}
        t={t}
        dir={dir}
        gameLanguage={gameLanguage}
      />

      {/* Full-screen landscape container - grid prevents side-panel overlap */}
      <div className="relative w-full h-dvh overflow-hidden bg-slate-900 text-white landscape-full-height">
        <div
          className="grid w-full h-full grid-rows-[1fr_auto] items-center"
          style={{
            gridTemplateColumns: 'clamp(70px, 14vw, 110px) minmax(0, 1fr) clamp(70px, 14vw, 110px)',
          }}
        >
          {/* Left Side Panel */}
          <div className="row-start-1 col-start-1 flex justify-start ps-1">
            <div className="landscape-panel flex flex-col items-center gap-2">
              {remainingTime !== null && (
                <CircularTimer
                  remainingTime={remainingTime}
                  totalTime={timerValue * 60}
                  size={isExtremelyShortLandscape ? 'md' : 'lg'}
                />
              )}

              {isPlaying && playerRank && playerRank > 0 && leaderboard.length > 1 && (
                <AdaptiveMotion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                  <div className="landscape-stat-secondary text-white">#{playerRank}</div>
                  <div className="landscape-stat-label text-white">{t('common.rank') || 'RANK'}</div>
                </AdaptiveMotion.div>
              )}

              {isPlaying && (
                <div className="flex flex-col items-center">
                  <div className="landscape-stat-secondary text-white">{leaderboard.find(p => p.username === username)?.wordCount || 0}</div>
                  <div className="landscape-stat-label text-white">{t('common.words') || 'WORDS'}</div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Word Forming Area + Grid */}
          <div
            className={cn(
              'row-start-1 col-start-2 flex flex-col items-center justify-center w-full h-full min-w-0',
              'gap-1.5 py-1'
            )}
          >
            {isPlaying && (
              <div className="relative mb-1 flex-shrink-0 z-50">
                <LeadChangeBanner event={leadChangeEvent ?? null} />
                <WordFormingArea
                  word={isTypingMode ? typedWord : formedWord}
                  letterCount={isTypingMode ? typedWord.length : letterCount}
                  feedback={currentFeedback}
                  compact
                />
              </div>
            )}
            {/* Word Hunt UI — above grid in landscape */}
            {gameMode === 'word-hunt' && wordHuntTargetLength && onWordHuntGuess && (
              <div className="flex-shrink-0 w-full max-w-xs mx-auto flex flex-col gap-1">
                <WordHuntLifeBar life={wordHuntLife ?? 100} maxLife={100} />
                <WordHuntTargetArea
                  targetLength={wordHuntTargetLength}
                  attempts={wordHuntAttempts ?? []}
                  onSubmit={onWordHuntGuess}
                  found={wordHuntFound ?? false}
                />
              </div>
            )}

            <div
              className="flex-1 flex items-center justify-center game-board-frame-landscape min-w-0 aspect-square"
            >
              {USE_PHASER_GRID ? (
                <div className="relative w-full h-full">
                  <PhaserGame
                    grid={letterGrid}
                    comboLevel={comboLevel}
                    fireRoundActive={fireRoundActive}
                    earthquakeState={earthquakeState}
                    wordFeedback={currentFeedback}
                    onWordSubmit={onWordSubmit}
                    onWordChange={onWordChange}
                  />
                  {/* Blast tile type badges */}
                  {gameMode === 'blast' && blastTileOverlay && blastTileOverlay.length > 0 && (
                    <BlastMultiplayerOverlay
                      overlay={blastTileOverlay}
                      gridSize={{ rows: letterGrid.length, cols: letterGrid[0]?.length ?? 4 }}
                    />
                  )}
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <GridComponent
                    key={isPlaying ? 'playing-grid-landscape' : 'spectating-grid-landscape'}
                    grid={letterGrid}
                    interactive={isPlaying && !showStartAnimation}
                    animateOnMount={!hasAnimated}
                    onWordSubmit={onWordSubmit}
                    onWordChange={onWordChange}
                    comboLevel={comboLevel}
                    hideComboIndicator={true}
                    hideWordPreview={true}
                    largeText
                    fireRoundActive={fireRoundActive}
                    earthquakeShaking={earthquakeState === 'shaking'}
                    highlightedPath={
                      shouldShowKeyboardTrails(isTypingMode, lastWordFoundTime, totalGamesPlayed)
                        ? highlightedCells
                        : []
                    }
                    onSingleTapDetected={onSingleTapDetected}
                    language={gameLanguage}
                  />
                  {/* Blast tile type badges */}
                  {gameMode === 'blast' && blastTileOverlay && blastTileOverlay.length > 0 && (
                    <BlastMultiplayerOverlay
                      overlay={blastTileOverlay}
                      gridSize={{ rows: letterGrid.length, cols: letterGrid[0]?.length ?? 4 }}
                    />
                  )}
                </div>
              )}
            </div>

            {isPlaying && leaderboard.length > 1 && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-auto max-w-[280px]">
                <CompactLeaderboard
                  players={leaderboard.map((p, index) => ({
                    username: p.username,
                    score: p.score,
                    rank: index + 1,
                    isCurrentUser: p.username === username,
                    profilePictureUrl: p.avatar?.profilePictureUrl,
                    avatarImage: p.avatar?.avatarImage,
                    avatarEmoji: p.avatar?.emoji,
                    avatarColor: p.avatar?.color,
                  }))}
                  currentUsername={username}
                  t={t}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* Right Side Panel */}
          <div className="row-start-1 col-start-3 flex justify-end pe-1">
            {isPlaying && (
              <div className="landscape-panel flex flex-col items-center gap-2">
                <ScoreDisplay
                  score={playerScore}
                  rank={playerRank}
                  leaderboardSize={leaderboard.length}
                  minWordLength={minWordLength}
                  t={t}
                  variant="landscape"
                />
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div
            className="row-start-2 col-span-3 z-30 flex justify-between items-end px-2 pb-2"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="flex flex-col items-start gap-1">
              <GameHeader
                onExitRoom={onExitRoom}
                onShowTutorial={onShowTutorial}
                gameActive={gameActive}
                t={t}
                variant="landscape"
              />

              {isPlaying && (
                <div className="w-[100px]">
                  {comboLevel > 0 ? (
                    <ComboDisplay
                      comboLevel={comboLevel}
                      highContrast
                      compact
                      timeRemaining={comboTimeRemaining}
                      isDanger={comboDanger}
                    />
                  ) : (
                    <AdaptiveMotion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      className="text-[10px] text-neo-cream/50 text-center leading-tight"
                    >
                      <span className="text-neo-cyan">⚡</span>{' '}
                      {t('game.comboHint') || 'Find words fast for combo!'}
                    </AdaptiveMotion.div>
                  )}
                </div>
              )}
            </div>

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
        </div>
      </div>

      {/* Achievement dock */}
      {children}
    </>
  );
});
