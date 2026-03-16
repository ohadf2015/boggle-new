'use client';

import { memo, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { vibrateWordSubmit } from '@/components/grid/hapticFeedback';
import CircularTimer from '@/components/CircularTimer';
import GridComponent from '@/components/GridComponent';
import DesktopWordInput from '@/components/grid/DesktopWordInput';
import WordFormingArea, { type WordFeedback } from '../../WordFormingArea';
import ComboDisplay from '../../ComboDisplay';
import HintButton from '@/components/HintButton';
import CompactLeaderboard from '../../CompactLeaderboard';
import { useBlastComboSync } from '@/hooks/gameState/store';
import { shouldShowKeyboardTrails } from '../../keyboardTrailsUtils';
import { GameOverlays } from './GameOverlays';
import { GameHeader } from './GameHeader';
import { ScoreDisplay } from './ScoreDisplay';
import FloatingScoreAnimation from '../../FloatingScoreAnimation';
import type { LetterGrid, Language, GameModeSelection, BlastTileOverlay, LetterFeedback } from '@/shared/types/game';
import type { ExtendedLeaderboardPlayer as LeaderboardPlayer } from '@/shared/types/view';
import type { HintsState, EarthquakeState, TranslationFn, TappedCellPosition } from '../types';
import { LeadChangeBanner } from '../../LeadChangeBanner';
import type { LeadChangeEvent } from '@/hooks/useLeadChangeDetection';
import { BlastMultiplayerOverlay } from '../../BlastMultiplayerOverlay';
import { WordHuntTargetArea } from '../../WordHuntTargetArea';
import { WordHuntLifeBar } from '../../WordHuntLifeBar';
import { WordHuntPlayerLives } from '../../WordHuntPlayerLives';
import { DynamicEnergyBackground } from '@/components/singleplayer/game/components/DynamicEnergyBackground';
import { ComboMilestoneAnnouncement } from '../../ComboMilestoneAnnouncement';
import { ScreenFlashOverlay } from '../../ScreenFlashOverlay';

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
  onPathSubmit?: (cells: Array<{ row: number; col: number; letter: string }>) => void;
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
  gameMode?: GameModeSelection;
  blastTileOverlay?: BlastTileOverlay[];
  wordHuntTargetLength?: number;
  wordHuntAttempts?: Array<{ guess: string; feedback: LetterFeedback[] }>;
  wordHuntFound?: boolean;
  wordHuntLife?: number;
  wordHuntPlayerLives?: Record<string, number>;
  wordHuntEliminatedPlayers?: string[];
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
  onPathSubmit,
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
  wordHuntPlayerLives,
  wordHuntEliminatedPlayers,
  onWordHuntGuess,
}) {
  // Combo event for leaderboard badges (from Zustand blastComboSync)
  const blastComboSync = useBlastComboSync();

  // Track floating score animation
  const [floatingScore, setFloatingScore] = useState<number | null>(null);
  const [isFireRoundScore, setIsFireRoundScore] = useState(false);
  // Counter for screen flash trigger (increments on accepted words)
  const [acceptedCount, setAcceptedCount] = useState(0);

  // Trigger floating score animation when word is accepted
  useEffect(() => {
    if (currentFeedback?.type === 'accepted' && currentFeedback.score) {
      setFloatingScore(currentFeedback.score);
      setIsFireRoundScore(currentFeedback.fireRoundActive ?? false);
      setAcceptedCount(prev => prev + 1);
    }
  }, [currentFeedback]);

  // Clear floating score after animation completes
  // useCallback ensures stable reference to prevent infinite animation loop
  const handleScoreAnimationComplete = useCallback(() => {
    setFloatingScore(null);
    setIsFireRoundScore(false);
  }, []);

  // Combo glow class based on combo level
  const comboGlow = comboLevel >= 7
    ? 'shadow-[0_0_20px_rgba(255,0,255,0.4)]'
    : comboLevel >= 5
    ? 'shadow-[0_0_15px_rgba(255,225,53,0.4)]'
    : comboLevel >= 3
    ? 'shadow-[0_0_10px_rgba(0,255,255,0.3)]'
    : '';

  // Haptic feedback on word accept
  const prevFeedbackRef = useRef(currentFeedback);
  useEffect(() => {
    if (
      currentFeedback?.type === 'accepted' &&
      currentFeedback !== prevFeedbackRef.current
    ) {
      const wordLen = currentFeedback.word?.length ?? 0;
      vibrateWordSubmit(wordLen, comboLevel, fireRoundActive);
    }
    prevFeedbackRef.current = currentFeedback;
  }, [currentFeedback, comboLevel, fireRoundActive]);

  return (
    <>
      {/* Dynamic Energy Background - animated vortex, aurora, particles */}
      <DynamicEnergyBackground />

      {/* Combo milestone announcement + screen flash */}
      {isPlaying && (
        <>
          <ComboMilestoneAnnouncement comboLevel={comboLevel} />
          <ScreenFlashOverlay trigger={acceptedCount} />
        </>
      )}

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
                  <div className="landscape-stat-label text-white">{t('common.rank')}</div>
                </AdaptiveMotion.div>
              )}

              {isPlaying && (
                <div className="flex flex-col items-center">
                  <div className="landscape-stat-secondary text-white">{leaderboard.find(p => p.username === username)?.wordCount || 0}</div>
                  <div className="landscape-stat-label text-white">{t('common.words')}</div>
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
                {wordHuntPlayerLives && Object.keys(wordHuntPlayerLives).length > 0 && (
                  <WordHuntPlayerLives
                    playerLives={wordHuntPlayerLives}
                    eliminatedPlayers={wordHuntEliminatedPlayers ?? []}
                    currentPlayer={username}
                  />
                )}
                <WordHuntTargetArea
                  targetLength={wordHuntTargetLength}
                  attempts={wordHuntAttempts ?? []}
                  onSubmit={onWordHuntGuess}
                  found={wordHuntFound ?? false}
                />
              </div>
            )}

            <div
              data-testid="grid-wrapper-landscape"
              className={cn(
                'flex-1 flex items-center justify-center game-board-frame-landscape min-w-0 aspect-square',
                'transition-shadow duration-500',
                comboGlow
              )}
            >
              <div className="relative w-full h-full">
                <GridComponent
                  key={isPlaying ? 'playing-grid-landscape' : 'spectating-grid-landscape'}
                  grid={letterGrid}
                  interactive={isPlaying && !showStartAnimation}
                  animateOnMount={!hasAnimated}
                  onWordSubmit={onWordSubmit}
                  onPathSubmit={onPathSubmit}
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
                  isTypingMode={isTypingMode}
                />
                {/* Blast tile type badges */}
                {gameMode === 'blast' && blastTileOverlay && blastTileOverlay.length > 0 && (
                  <BlastMultiplayerOverlay
                    overlay={blastTileOverlay}
                    gridSize={{ rows: letterGrid.length, cols: letterGrid[0]?.length ?? 4 }}
                  />
                )}
                <DesktopWordInput
                  grid={letterGrid}
                  language={gameLanguage}
                  enabled={isPlaying && !showStartAnimation}
                  onWordSubmit={onWordSubmit}
                />
              </div>
            </div>

            {isPlaying && leaderboard.length > 1 && (
              <div className="absolute top-2 start-1/2 -translate-x-1/2 z-30 w-auto max-w-[280px]">
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
                    inputMethod: p.username === username && isTypingMode ? 'keyboard' as const : null,
                  }))}
                  currentUsername={username}
                  t={t}
                  className="text-xs"
                  comboEvent={blastComboSync}
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
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
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
                      className="text-[10px] text-neo-cream/50 text-start leading-tight"
                    >
                      <span className="text-neo-cyan">⚡</span>{' '}
                      {t('game.comboHint')}
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
