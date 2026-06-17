'use client';

import React from 'react';
import { ArrowLeft, Pause, Play, List } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { Button } from '@/components/ui/button';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useQuitConfirmDescription } from '@/hooks/useQuitConfirmDescription';
import { TrainingProgressBar } from '@/components/training';
import { shouldShowKeyboardTrails } from '@/components/game/keyboardTrailsUtils';
import { cn } from '@/lib/utils';
import { GameOverlays } from './GameOverlays';
import { CalmSessionBadge } from '@/components/cosy/CalmSessionBadge';
import { HintPromptButton } from './HintPromptButton';
import TimeLowAdPrompt from '@/components/ads/TimeLowAdPrompt';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { FoundWord, KeyboardInputState, TrainingState } from '../types';

export interface LandscapeGameLayoutProps {
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
  // Combo
  comboLevel: number;
  comboTimeRemaining: number | null;
  comboDanger: boolean;
  maxCombo: number;
  comboCoinReward: number | null;
  onCoinAnimationComplete: () => void;
  // Word forming
  formedWord: string;
  letterCount: number;
  currentFeedback: WordFeedback | null;
  // Keyboard input
  keyboardInput: KeyboardInputState;
  // Tutorial path
  tutorialPath: Array<{ row: number; col: number }> | null;
  /** The word being shown in the tutorial */
  tutorialWord?: string;
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
  // Training (practice mode)
  training: TrainingState | null;
  progressBarExpanded: boolean;
  onToggleProgressBar: () => void;
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
  // Tutorial
  showLandscapeTutorial: boolean;
  onDismissLandscapeTutorial: () => void;
  /** Extend the game timer (rewarded-ad integration). */
  onExtendTime?: (seconds: number) => void;
  // Translation
  t: (key: string) => string | undefined;
}

/**
 * Landscape layout for single player game (mobile landscape mode)
 * Maximized grid with minimal chrome, side panels for stats
 */
export function LandscapeGameLayout({
  grid,
  language,
  isPaused,
  isGameOver,
  score,
  foundWords,
  remainingTime,
  totalTime,
  mode,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  maxCombo,
  comboCoinReward,
  onCoinAnimationComplete,
  formedWord,
  letterCount,
  currentFeedback,
  keyboardInput,
  tutorialPath,
  tutorialWord: _tutorialWord,
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
  training,
  progressBarExpanded,
  onToggleProgressBar,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onPauseToggle,
  onFinishPractice,
  onQuitRequest,
  onConfirmQuit,
  showQuitConfirm,
  setShowQuitConfirm,
  showLandscapeTutorial: _showLandscapeTutorial,
  onDismissLandscapeTutorial: _onDismissLandscapeTutorial,
  onExtendTime,
  t,
}: LandscapeGameLayoutProps): React.ReactElement {
  const validWords = React.useMemo(() => foundWords.filter(fw => fw.isValid === true), [foundWords]);
  const validWordCount = validWords.length;
  // exp-game-abandon-confirm-v1: stats-shown variant surfaces score+words in the quit dialog (dark until flag on).
  const quitConfirmDescription = useQuitConfirmDescription({
    open: showQuitConfirm,
    baseMessage: t('singlePlayer.quitConfirmMessage'),
    statsTemplate: t('singlePlayer.quitConfirmMessageWithStats'),
    score,
    wordCount: validWordCount,
  });
  const validWordLengths = React.useMemo(() => validWords.map(fw => fw.word.length), [validWords]);
  const tSafe = React.useCallback((key: string) => t(key) || key, [t]);
  const isPracticeMode = mode === 'practice';

  // Compute highlighted path for grid — keyboard trails take priority over tutorial/reveal
  const gridHighlightedPath = shouldShowKeyboardTrails(keyboardInput.isTypingMode, lastWordFoundTimeRef.current, undefined)
    ? keyboardInput.highlightedCells
    : tutorialPath
      ? tutorialPath.map(p => ({ row: p.row, col: p.col }))
      : highlightedPath;

  return (
    <div className="relative flex items-center justify-center w-full h-full flex-1 overflow-hidden bg-neo-navy text-white">
      <GameOverlays
        earthquakeState={earthquakeState}
        fireRoundActive={fireRoundActive}
        fireRoundRemaining={fireRoundRemaining}
        isValidatingWords={isValidatingWords}
        validWordCount={validWordCount}
        comboLevel={comboLevel}
        maxCombo={maxCombo}
        wordLengths={validWordLengths}
        timeSinceStart={totalTime - remainingTime}
        gameDuration={totalTime}
        isGameOver={isGameOver}
        isPracticeMode={isPracticeMode}
        trainingCurrentHint={training?.currentHint}
        onDismissTrainingHint={training?.dismissHint}
        trainingComplete={training?.hasPassed}
        trainingJustUnlocked={training?.justUnlocked}
        onClearTrainingUnlock={training?.clearJustUnlocked}
        showKeyboardHint={true}
        t={tSafe}
      />

      {/* Training Progress Bar - compact chip in landscape practice mode */}
      {isPracticeMode && training && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
          <TrainingProgressBar
            completedSkills={training.completedSkills}
            score={score}
            wordsFound={validWordCount}
            compact={!progressBarExpanded}
            expanded={progressBarExpanded}
            onToggleExpand={onToggleProgressBar}
            justUnlocked={training.justUnlocked}
            onUnlockAnimationComplete={training.clearJustUnlocked}
            isComplete={training.isComplete}
          />
        </div>
      )}

      <div
        className="grid w-full h-full grid-rows-[1fr_auto] items-center"
        style={{
          gridTemplateColumns: 'clamp(70px, 14vw, 110px) minmax(0, 1fr) clamp(70px, 14vw, 110px)',
        }}
      >
        {/* Left Side Panel - Timer & Score */}
        <div className="row-start-1 col-start-1 flex justify-start ps-1">
          <div className="landscape-panel flex flex-col items-center gap-3">
            {!isPracticeMode && (
              <CircularTimer
                remainingTime={remainingTime}
                totalTime={totalTime}
                size="lg"
              />
            )}

            <CalmSessionBadge />

            <div className="flex flex-col items-center">
              <AdaptiveMotion.div
                key={score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-neo-black font-black",
                  isPracticeMode
                    ? "text-3xl sm:text-4xl leading-none"
                    : "landscape-stat-primary"
                )}
              >
                {score}
              </AdaptiveMotion.div>
              <div className={cn(
                "text-neo-black font-bold uppercase tracking-wider",
                isPracticeMode
                  ? "text-xs sm:text-sm mt-0.5"
                  : "landscape-stat-label"
              )}>
                {t('common.score')}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Word Forming Area + Grid */}
        <div className="row-start-1 col-start-2 flex flex-col items-center justify-center w-full h-full py-1 gap-1.5 landscape-grid-container min-w-0">
          <div className="flex items-center justify-center mb-0.5">
            <WordFormingArea
              word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord}
              letterCount={keyboardInput.isTypingMode ? keyboardInput.typedWord.length : letterCount}
              feedback={currentFeedback}
              compact
            />
          </div>
          <div className="flex-1 flex items-center justify-center game-board-frame-landscape min-w-0" style={{ aspectRatio: '1/1' }}>
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
              isTypingMode={keyboardInput.isTypingMode}
            />
          </div>
        </div>

        {/* Right Side Panel - Words & Combo */}
        <div className="row-start-1 col-start-3 flex justify-end pe-1">
          <div className="landscape-panel flex flex-col items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="landscape-stat-secondary text-neo-black">
                {validWordCount}
              </div>
              <div className="landscape-stat-label text-neo-black">
                {t('common.words')}
              </div>
            </div>

            {!isPracticeMode && (
              <ComboDisplay
                comboLevel={comboLevel}
                timeRemaining={comboTimeRemaining}
                isDanger={comboDanger}
                coinReward={comboCoinReward}
                onCoinAnimationComplete={onCoinAnimationComplete}
                highContrast
                compact
              />
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div
          className="row-start-2 col-span-3 z-30 flex justify-between items-center px-2 pb-2"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)'
          }}
        >
          {!isPracticeMode ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPauseToggle}
              aria-label={isPaused ? (t('common.resume')) : (t('common.pause'))}
              aria-pressed={isPaused}
              className="w-12 h-12 p-0 bg-neo-cream hover:brightness-110 border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
            >
              {isPaused ? <Play className="text-lg text-neo-black" /> : <Pause className="text-lg text-neo-black" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFinishPractice}
              aria-label={t('singlePlayer.finish')}
              className="px-3 sm:px-4 h-10 sm:h-12 min-h-[44px] bg-neo-lime hover:brightness-110 border-2 border-neo-black rounded-neo text-xs sm:text-sm font-bold text-neo-black shadow-hard-sm"
            >
              {t('singlePlayer.finish')}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onQuitRequest}
            aria-label={t('common.quit')}
            className="w-12 h-12 p-0 bg-neo-red hover:brightness-110 border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
          >
            <ArrowLeft className="text-lg text-neo-white rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {/* Collapsible Found Words Panel - Top center */}
      {foundWords.length > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neo-cream/95 border-2 border-neo-black rounded-full shadow-hard-sm"
          >
            <List className="w-4 h-4 text-neo-black/70" />
            {foundWords.slice(-3).reverse().map((fw, i) => (
              <span
                key={`${fw.word}-${fw.timestamp}`}
                className={cn(
                  "px-3 py-1 text-sm font-bold uppercase rounded-full border border-neo-black/30",
                  i === 0 ? "bg-neo-lime text-neo-black" : "bg-neo-cream text-neo-black/80",
                  fw.isValid === false && "line-through opacity-60 bg-neo-red/20"
                )}
              >
                {fw.word}
              </span>
            ))}
            {foundWords.length > 3 && (
              <span className="text-sm font-bold text-neo-black/60">
                +{foundWords.length - 3}
              </span>
            )}
          </AdaptiveMotion.div>
        </div>
      )}

      {/* Hint Prompt */}
      <AdaptiveAnimatePresence>
        {showHintPrompt && !isPaused && !isGameOver && remainingTime > 0 && revealableWordCount > 0 && (
          <HintPromptButton
            onReveal={onReveal}
            setShowHintPrompt={setShowHintPrompt}
            position="bottom-14 left-1/2 -translate-x-1/2"
            t={t}
          />
        )}
      </AdaptiveAnimatePresence>

      {/* Time-low rewarded-ad prompt — loss aversion at the most urgent moment */}
      {onExtendTime && !isPaused && !isGameOver && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <TimeLowAdPrompt timeRemaining={remainingTime} onExtend={onExtendTime} />
        </div>
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle')}
        description={quitConfirmDescription}
        confirmText={t('common.quit')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmQuit}
        variant="danger"
        analyticsId="sp_quit_confirm"
        analyticsExtras={{ layout: 'landscape' }}
      />

      {/* Screen reader status announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {isPaused && (t('singlePlayer.gamePaused'))}
      </div>
    </div>
  );
}
