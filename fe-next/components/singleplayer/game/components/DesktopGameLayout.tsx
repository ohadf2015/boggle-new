'use client';

import React from 'react';
import { ArrowLeft, Pause, Play, Coins } from 'lucide-react';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import GridComponent from '@/components/GridComponent';
import DesktopInputHint from '@/components/grid/DesktopInputHint';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useQuitConfirmDescription } from '@/hooks/useQuitConfirmDescription';
import { TrainingProgressBar } from '@/components/training';
import { shouldShowKeyboardTrails } from '@/components/game/keyboardTrailsUtils';
import { COIN_EARNING_OTHER } from '@/utils/coinManager';
import { GameOverlays } from './GameOverlays';
import { HintPromptButton } from './HintPromptButton';
import { DynamicEnergyBackground } from './DynamicEnergyBackground';
import { DesktopStatsPanel, DesktopWordList } from '../../desktop';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { FoundWord, KeyboardInputState, TrainingState } from '../types';

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
  comboTimeRemaining: number | null;
  comboDanger: boolean;
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
  /** Extend the game timer (rewarded-ad integration — desktop accepts but does not render). */
  onExtendTime?: (seconds: number) => void;
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
  comboTimeRemaining,
  comboDanger,
  maxCombo,
  comboCoinReward,
  onCoinAnimationComplete,
  totalBoardWords,
  formedWord,
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
  progressBarExpanded: _progressBarExpanded,
  onToggleProgressBar: _onToggleProgressBar,
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
  onExtendTime: _onExtendTime,
  t,
}: DesktopGameLayoutProps): React.ReactElement {
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
    <div className="game-view-container relative flex h-full w-full bg-neo-navy overflow-hidden">
      {/* Dynamic Energy Background */}
      <DynamicEnergyBackground />

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

      {/* 3-Column Desktop Layout — practice mode uses narrower sidebars for a calmer layout */}
      <div
        className={isPracticeMode ? "flex w-full h-full max-h-full gap-6 p-6 overflow-hidden" : "flex w-full h-full max-h-full gap-3 p-3 overflow-hidden"}
        style={{
          display: 'grid',
          gridTemplateColumns: isTv
            ? '300px 1fr 300px'
            : isPracticeMode
              ? '300px 1fr 240px'
              : '230px 1fr 230px',
          gridTemplateRows: '1fr',
        }}
      >
        {/* Left Sidebar - Stats Panel (+ Training details in practice mode)
            min-h-0 + [&>*]:shrink-0 ensures children render at intrinsic size and the
            container scrolls when content exceeds height (training panel was getting
            cropped by flex-shrink + the card's overflow-hidden). */}
        <div className="desktop-stats-panel h-full min-h-0 overflow-y-auto flex flex-col gap-3 [&>*]:shrink-0">
          <DesktopStatsPanel
            score={score}
            remainingTime={remainingTime}
            totalTime={totalTime}
            comboLevel={comboLevel}
            comboTimeRemaining={comboTimeRemaining}
            comboDanger={comboDanger}
            maxCombo={maxCombo}
            wordsFound={validWordCount}
            totalBoardWords={totalBoardWords}
            targetHighScore={mode === 'challenge' ? targetHighScore : null}
            isPracticeMode={isPracticeMode}
            comboCoinReward={comboCoinReward}
            onCoinAnimationComplete={onCoinAnimationComplete}
            t={tSafe}
          />
          {isPracticeMode && training && (
            <TrainingProgressBar
              completedSkills={training.completedSkills}
              score={score}
              wordsFound={validWordCount}
              compact
              expanded
              justUnlocked={training.justUnlocked}
              onUnlockAnimationComplete={training.clearJustUnlocked}
              isComplete={training.isComplete}
            />
          )}
        </div>

        {/* Center - Game Area */}
        <div className="flex flex-col items-center justify-between h-full min-w-0 min-h-0 gap-1 relative z-10 overflow-hidden">
          {/* Header: Quit + Coins + Pause */}
          <div className="flex items-center justify-between w-full px-2 shrink-0">
            {/* Quit - btn-neo red */}
            <button
              onClick={onQuitRequest}
              className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 text-sm font-bold uppercase tracking-wide border-3 border-neo-black shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all duration-100"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t('common.quit')}
            </button>

            {/* Coins display - hidden in practice mode (learning surface, no economy) */}
            {isPracticeMode ? (
              <div className="flex-1" aria-hidden="true" />
            ) : (
              <AdaptiveMotion.div
                data-coin-target
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 bg-yellow-400 border-3 border-neo-black rounded-lg px-2 py-1 shadow-hard-sm transform -rotate-1 hover:scale-105 transition-transform"
              >
                <div className="bg-black/10 rounded-full p-1">
                  <Coins className="w-4 h-4 text-neo-black" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-black text-base text-neo-black">
                    {score > 0 ? COIN_EARNING_OTHER.SINGLEPLAYER_BASE + Math.floor(score / COIN_EARNING_OTHER.SCORE_DIVISOR) : 0}
                  </span>
                  <span className="text-[8px] font-bold text-neo-black/60 uppercase">{t('common.coins')}</span>
                </div>
              </AdaptiveMotion.div>
            )}

            {/* Pause/Finish - btn-neo pink */}
            {isPracticeMode ? (
              <button
                onClick={onFinishPractice}
                className="flex items-center gap-2 bg-neo-lime text-neo-black px-4 py-2 text-sm font-bold uppercase tracking-wide border-3 border-neo-black shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all duration-100"
              >
                {t('singlePlayer.finish')}
              </button>
            ) : (
              <button
                onClick={onPauseToggle}
                className="flex items-center justify-center bg-pink-500 text-white p-2 border-3 border-neo-black shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all duration-100"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Word Forming Area */}
          <div className="flex items-center justify-center shrink-0">
            <WordFormingArea word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord} letterCount={(keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord).length} feedback={currentFeedback} compact />
          </div>

          {/* Instruction Banner - inline above grid (not absolute) so it never clips the top row.
              Hidden entirely in practice mode to keep the learning surface calm. */}
          {!isPracticeMode && (
            <div className="w-full flex justify-center shrink-0 min-h-[2.25rem]">
              <AdaptiveAnimatePresence>
                {showHintPrompt && !isPaused && !isGameOver && remainingTime > 0 && (
                  <AdaptiveMotion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <div className="bg-linear-to-r from-neo-pink to-pink-400 text-white text-center py-1.5 px-5 rounded-lg border-3 border-neo-black shadow-hard-sm">
                      <span className="font-bold text-sm uppercase tracking-wide">
                        {t('singlePlayer.dragInstruction')}
                      </span>
                    </div>
                  </AdaptiveMotion.div>
                )}
              </AdaptiveAnimatePresence>
            </div>
          )}

          {/* Game Grid - centered with aspect ratio maintained */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden relative" style={{ containerType: 'size' }}>
            <div className={`desktop-grid-container game-board-container${isPracticeMode ? '' : ' grid-fill'}`} style={{ width: 'min(96cqw, 90cqh)', height: 'min(96cqw, 90cqh)', maxWidth: isPracticeMode ? '560px' : '760px', maxHeight: isPracticeMode ? '560px' : '760px' }}>
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
              <DesktopInputHint wordSubmitted={foundWords.length > 0} />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Word List */}
        <div className="desktop-words-panel h-full overflow-hidden">
          <DesktopWordList
            foundWords={foundWords}
            showOnlyValid={true}
            maxVisible={isTv ? 20 : 15}
            t={tSafe}
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
        title={t('singlePlayer.quitConfirmTitle')}
        description={quitConfirmDescription}
        confirmText={t('common.quit')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmQuit}
        variant="danger"
        analyticsId="sp_quit_confirm"
        analyticsExtras={{ layout: 'desktop' }}
      />

      {/* Screen reader status */}
      <div className="sr-only" role="status" aria-live="polite">
        {isPaused && (t('singlePlayer.gamePaused'))}
      </div>
    </div>
  );
}
