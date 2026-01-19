'use client';

import React from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { Button } from '@/components/ui/button';
import GridComponent from '@/components/GridComponent';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { shouldShowKeyboardTrails } from '@/components/game/keyboardTrailsUtils';
import { GameOverlays } from './GameOverlays';
import { HintPromptButton } from './HintPromptButton';
import { DesktopStatsPanel, DesktopWordList } from '../../desktop';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { FoundWord, KeyboardInputState, TrainingState, DirectionGuidanceState } from '../types';

export interface DesktopGameLayoutProps {
  // Grid
  grid: LetterGrid;
  language: Language;
  // Game state
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  foundWords: FoundWord[];
  // Timer
  remainingTime: number;
  totalTime: number;
  // Mode
  mode: string;
  targetHighScore: number | null;
  // Combo
  comboLevel: number;
  maxCombo: number;
  comboCoinReward: number | null;
  onCoinAnimationComplete: () => void;
  // Words
  totalBoardWords: number | null;
  // Word forming
  formedWord: string;
  letterCount: number;
  currentFeedback: WordFeedback | null;
  // Keyboard input
  keyboardInput: KeyboardInputState;
  // Tutorial path
  tutorialPath: Array<{ row: number; col: number }> | null;
  // Reveal highlight
  highlightedPath: Array<{ row: number; col: number }>;
  lastWordFoundTimeRef: React.RefObject<number>;
  // Fire/Earthquake
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  earthquakeState: EarthquakeState;
  // Validation
  isValidatingWords: boolean;
  // Hint
  showHintPrompt: boolean;
  revealableWordCount: number;
  onReveal: () => Promise<unknown>;
  setShowHintPrompt: (show: boolean) => void;
  // Direction guidance
  directionGuidance: DirectionGuidanceState;
  // Training (practice mode)
  training: TrainingState | null;
  // TV mode
  isTv: boolean;
  // Handlers
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  onPauseToggle: () => void;
  onFinishPractice: () => void;
  onQuitRequest: () => void;
  onConfirmQuit: () => void;
  // Quit dialog
  showQuitConfirm: boolean;
  setShowQuitConfirm: (show: boolean) => void;
  // Translation
  t: (key: string) => string | undefined;
}

/**
 * Desktop layout for single player game (3-column design)
 * Used on desktop (1024px+) and TV (1920px+) displays
 */
export function DesktopGameLayout({
  grid,
  language,
  isPaused,
  isGameOver,
  score,
  foundWords,
  remainingTime,
  totalTime,
  mode,
  targetHighScore,
  comboLevel,
  maxCombo,
  comboCoinReward,
  onCoinAnimationComplete,
  totalBoardWords,
  formedWord,
  letterCount,
  currentFeedback,
  keyboardInput,
  tutorialPath,
  highlightedPath,
  lastWordFoundTimeRef,
  fireRoundActive,
  fireRoundRemaining,
  earthquakeState,
  isValidatingWords,
  showHintPrompt,
  revealableWordCount,
  onReveal,
  setShowHintPrompt,
  directionGuidance,
  training,
  isTv,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onPauseToggle,
  onFinishPractice,
  onQuitRequest,
  onConfirmQuit,
  showQuitConfirm,
  setShowQuitConfirm,
  t,
}: DesktopGameLayoutProps): React.ReactElement {
  const validWordCount = foundWords.filter(fw => fw.isValid === true).length;
  const isPracticeMode = mode === 'practice';

  // Compute highlighted path for grid
  const gridHighlightedPath = shouldShowKeyboardTrails(keyboardInput.isTypingMode, lastWordFoundTimeRef.current, undefined)
    ? keyboardInput.highlightedCells
    : tutorialPath
      ? tutorialPath.map(p => ({ row: p.row, col: p.col }))
      : highlightedPath;

  return (
    <div className="game-view-container relative flex h-full w-full bg-neo-navy">
      <GameOverlays
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        isValidatingWords={isValidatingWords}
        validWordCount={validWordCount}
        comboLevel={comboLevel}
        maxCombo={maxCombo}
        wordLengths={foundWords.filter(fw => fw.isValid === true).map(fw => fw.word.length)}
        timeSinceStart={totalTime - remainingTime}
        gameDuration={totalTime}
        isGameOver={isGameOver}
        showDirectionGuidance={directionGuidance.showDirectionGuidance}
        onDismissDirectionGuidance={directionGuidance.dismissDirectionGuidance}
        showKeyboardHint={!isPaused && !isGameOver}
        isPracticeMode={isPracticeMode}
        trainingCurrentHint={training?.currentHint}
        onDismissTrainingHint={training?.dismissHint}
        trainingComplete={training?.hasPassed}
        trainingJustUnlocked={training?.justUnlocked}
        onClearTrainingUnlock={training?.clearJustUnlocked}
        t={(key) => t(key) || key}
      />

      {/* 3-Column Desktop Layout */}
      <div
        className="flex w-full h-full max-h-full gap-4 p-4 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: isTv ? '320px 1fr 320px' : '280px 1fr 280px',
          gridTemplateRows: '1fr',
        }}
      >
        {/* Left Sidebar - Stats Panel */}
        <div className="desktop-stats-panel h-full overflow-hidden">
          <DesktopStatsPanel
            score={score}
            remainingTime={remainingTime}
            totalTime={totalTime}
            comboLevel={comboLevel}
            maxCombo={maxCombo}
            wordsFound={validWordCount}
            totalBoardWords={totalBoardWords}
            targetHighScore={mode === 'challenge' ? targetHighScore : null}
            isPracticeMode={isPracticeMode}
            comboCoinReward={comboCoinReward}
            onCoinAnimationComplete={onCoinAnimationComplete}
            t={(key) => t(key) || key}
          />
        </div>

        {/* Center - Game Area */}
        <div className="flex flex-col items-center justify-center h-full min-w-0 min-h-0 gap-3">
          {/* Header with Quit Button */}
          <div className="flex items-center justify-between w-full px-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={onQuitRequest}
              className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold"
            >
              <ArrowLeft className="me-2 rtl:rotate-180" />
              {t('common.quit') || 'Quit'}
            </Button>

            {isPracticeMode ? (
              <Button
                variant="accent"
                onClick={onFinishPractice}
                className="min-h-[44px] min-w-[80px] text-sm font-bold"
              >
                {t('singlePlayer.finish') || 'Finish'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onPauseToggle}
              >
                {isPaused ? <Play /> : <Pause />}
              </Button>
            )}
          </div>

          {/* Word Forming Area */}
          <div className="flex items-center justify-center">
            <WordFormingArea
              word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord}
              letterCount={keyboardInput.isTypingMode ? keyboardInput.typedWord.length : letterCount}
              feedback={currentFeedback}
              compact={false}
            />
          </div>

          {/* Game Grid - centered with aspect ratio maintained */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0 max-h-full">
            <div className="desktop-grid-container aspect-square h-full max-w-full">
              <GridComponent
                grid={grid}
                interactive={!isPaused}
                onWordSubmit={onWordSubmit}
                onPathSubmit={onPathSubmit}
                onWordChange={onWordChange}
                hideWordPreview
                hideComboIndicator={true}
                comboLevel={comboLevel}
                largeText
                fireRoundActive={fireRoundActive}
                earthquakeShaking={earthquakeState === 'shaking'}
                highlightedPath={gridHighlightedPath}
                language={language}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Word List */}
        <div className="desktop-words-panel h-full overflow-hidden">
          <DesktopWordList
            foundWords={foundWords}
            showOnlyValid={true}
            maxVisible={isTv ? 20 : 15}
            t={(key) => t(key) || key}
          />
        </div>
      </div>

      {/* Hint Prompt */}
      {showHintPrompt && !isPaused && !isGameOver && remainingTime > 0 && revealableWordCount > 0 && (
        <HintPromptButton
          onReveal={onReveal}
          setShowHintPrompt={setShowHintPrompt}
          position="fixed bottom-8 left-1/2 -translate-x-1/2"
          t={t}
        />
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle') || 'Quit Game?'}
        description={t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?'}
        confirmText={t('common.quit') || 'Quit'}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={onConfirmQuit}
        variant="danger"
      />

      {/* Screen reader status */}
      <div className="sr-only" role="status" aria-live="polite">
        {isPaused && (t('singlePlayer.gamePaused') || 'Game paused')}
      </div>
    </div>
  );
}
