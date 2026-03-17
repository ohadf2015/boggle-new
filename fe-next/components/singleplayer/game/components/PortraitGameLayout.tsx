'use client';

import React from 'react';
import { ArrowLeft, Pause, Play, Crown, TrendingUp, Target, Zap, Coins } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { Button } from '@/components/ui/button';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { TrainingProgressBar } from '@/components/training';
import { shouldShowKeyboardTrails } from '@/components/game/keyboardTrailsUtils';
import { cn } from '@/lib/utils';
import { COIN_EARNING_OTHER } from '@/utils/coinManager';
import { GameOverlays } from './GameOverlays';
import { HintPromptButton } from './HintPromptButton';
import { DynamicEnergyBackground } from './DynamicEnergyBackground';
import { TutorialCallout } from '@/components/tutorial/TutorialCallout';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { FoundWord, KeyboardInputState, TrainingState, DirectionGuidanceState } from '../types';

export interface PortraitGameLayoutProps {
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
  // Direction guidance
  directionGuidance: DirectionGuidanceState;
  // Training (practice mode)
  training: TrainingState | null;
  progressBarExpanded: boolean;
  onToggleProgressBar: () => void;
  // Completion popup
  showCompletionPopup: boolean;
  setShowCompletionPopup: (show: boolean) => void;
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
  // Words
  totalBoardWords: number | null;
  // Ref for auto-scroll
  gameStatsRef: React.RefObject<HTMLDivElement | null>;
  // Translation
  t: (key: string) => string | undefined;
}

/**
 * Portrait layout for single player game (default mobile layout)
 * Vertical layout with timer, stats, and grid stacked
 */
export function PortraitGameLayout({
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
  formedWord,
  letterCount: _letterCount,
  currentFeedback,
  keyboardInput,
  tutorialPath,
  tutorialWord,
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
  progressBarExpanded,
  onToggleProgressBar,
  showCompletionPopup,
  setShowCompletionPopup,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onPauseToggle,
  onFinishPractice,
  onQuitRequest,
  onConfirmQuit,
  totalBoardWords,
  showQuitConfirm,
  setShowQuitConfirm,
  gameStatsRef,
  t,
}: PortraitGameLayoutProps): React.ReactElement {
  const validWordCount = foundWords.filter(fw => fw.isValid === true).length;
  const isPracticeMode = mode === 'practice';
  const isChallengeMode = mode === 'challenge';

  // Compute highlighted path for grid
  const gridHighlightedPath = shouldShowKeyboardTrails(keyboardInput.isTypingMode, lastWordFoundTimeRef.current, undefined)
    ? keyboardInput.highlightedCells
    : tutorialPath
      ? tutorialPath.map(p => ({ row: p.row, col: p.col }))
      : highlightedPath;

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden h-full bg-neo-navy">
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

      {/* Header with controls */}
      <header className="flex items-center justify-between px-4 shrink-0 relative z-30 pt-2 pb-1">
        <Button
          variant="destructive"
          size="sm"
          onClick={onQuitRequest}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold text-xs tracking-widest"
        >
          <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" />
          {t('common.quit')}
        </Button>

        {!isPracticeMode ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onPauseToggle}
            className="p-1.5 min-w-[36px] min-h-[36px]"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={onFinishPractice}
            className="min-h-[44px] min-w-[80px] text-sm sm:text-base font-bold"
          >
            {t('singlePlayer.finish')}
          </Button>
        )}
      </header>

      {/* Combo Display Row - Fixed height container to prevent layout shift */}
      {!isPracticeMode && (
        <div className="h-8 flex items-center justify-center shrink-0 relative z-30">
          <ComboDisplay
            comboLevel={comboLevel}
            compact
            timeRemaining={comboTimeRemaining}
            isDanger={comboDanger}
            coinReward={comboCoinReward}
            onCoinAnimationComplete={onCoinAnimationComplete}
          />
        </div>
      )}

      {/* Training Progress Bar - shown in practice mode (portrait) */}
      {isPracticeMode && training && (
        <div className="px-2 md:px-4 py-1 flex-shrink-0 relative z-40">
          <TrainingProgressBar
            completedSkills={training.completedSkills}
            score={score}
            wordsFound={validWordCount}
            compact
            expanded={progressBarExpanded}
            onToggleExpand={onToggleProgressBar}
            justUnlocked={training.justUnlocked}
            onUnlockAnimationComplete={training.clearJustUnlocked}
            isComplete={training.isComplete}
          />
        </div>
      )}

      {/* Stats section - Gemini Pro: Coins (left), Timer (center), Score (right) */}
      <div ref={gameStatsRef} className="px-4 flex items-center justify-between shrink-0 relative z-30 mb-1 max-w-md mx-auto w-full" role="status" aria-label="Game status">
        {/* Left: Coins badge */}
        <div className="flex-1 flex justify-start">
          <AdaptiveMotion.div
            data-coin-target
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 bg-yellow-400 border-3 border-neo-black rounded-lg px-2 py-1 shadow-hard-sm transform -rotate-1"
          >
            <div className="bg-black/10 rounded-full p-0.5">
              <Coins className="w-4 h-4 text-neo-black" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-neo-black text-sm">
                {score > 0 ? COIN_EARNING_OTHER.SINGLEPLAYER_BASE + Math.floor(score / COIN_EARNING_OTHER.SCORE_DIVISOR) : 0}
              </span>
              <span className="font-bold text-neo-black/60 text-[8px] uppercase">{t('common.coins')}</span>
            </div>
          </AdaptiveMotion.div>
        </div>

        {/* Center: Timer */}
        <div className="relative flex items-center justify-center mx-2">
          {!isPracticeMode ? (
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-20"
              style={{ filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,1))' }}
            >
              <CircularTimer
                remainingTime={remainingTime}
                totalTime={totalTime}
                size="sm"
              />
            </AdaptiveMotion.div>
          ) : (
            /* Score - Centered in practice mode */
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative border-3 border-neo-black rounded-lg shadow-hard px-4 py-1.5 min-w-[80px]"
              style={{
                background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
              }}
            >
              <div className="text-center relative z-10">
                <AdaptiveMotion.div
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="font-black text-neo-black leading-tight text-xl"
                >
                  {score.toLocaleString()}
                </AdaptiveMotion.div>
                <div className="font-bold uppercase tracking-wider text-neo-black/80 text-[9px]">
                  {t('common.score')}
                </div>
              </div>
            </AdaptiveMotion.div>
          )}
        </div>

        {/* Right: Score badge */}
        <div className="flex-1 flex justify-end">
          {!isPracticeMode ? (
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative border-3 border-neo-black rounded-lg shadow-hard px-2 py-1 min-w-[80px] transform rotate-1"
              style={{
                background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
              }}
            >
              <div className="text-end relative z-10">
                <div className="font-bold uppercase tracking-widest text-neo-black/60 text-[8px] mb-0.5">
                  {t('common.score')}
                </div>
                <AdaptiveMotion.div
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="font-black text-neo-black leading-none text-xl tracking-tighter"
                >
                  {score.toLocaleString()}
                </AdaptiveMotion.div>
              </div>
            </AdaptiveMotion.div>
          ) : (
            <div className="min-w-[50px] flex justify-end">
              <ComboDisplay
                comboLevel={comboLevel}
                compact
                timeRemaining={comboTimeRemaining}
                isDanger={comboDanger}
                coinReward={comboCoinReward}
                onCoinAnimationComplete={onCoinAnimationComplete}
              />
            </div>
          )}
        </div>
      </div>

      {/* Word Forming Area */}
      <div className="h-10 flex items-center justify-center flex-shrink-0 relative z-30 px-4 mb-1 max-w-[360px] mx-auto w-full overflow-visible">
        <WordFormingArea word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord} letterCount={(keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord).length} feedback={currentFeedback} compact />
      </div>

      {/* Words Progress - subtle indicator (hidden on very short screens) */}
      {totalBoardWords != null && totalBoardWords > 0 && (
        <div className="flex items-center justify-center gap-2 px-8 mb-1 shrink-0 relative z-30 hide-on-short-screen">
          <div className="h-[3px] flex-1 bg-white/10 rounded-full overflow-hidden max-w-[160px]">
            <AdaptiveMotion.div
              className="h-full bg-neo-cyan/50 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((validWordCount / totalBoardWords) * 100, 100)}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
          <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider tabular-nums">
            {validWordCount}/{totalBoardWords}
          </span>
        </div>
      )}

      {/* Challenge Mode Progress Tracker (hidden on very short screens) */}
      {isChallengeMode && (
        <div className="hide-on-short-screen">
        <ChallengeProgressTracker
          score={score}
          targetHighScore={targetHighScore}
          t={t}
        />
        </div>
      )}

      {/* Game grid - Takes remaining space */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-1 relative z-30 min-h-0">
        {/* Tutorial Callout - Absolute overlay above grid, doesn't consume flow height */}
        <AdaptiveAnimatePresence>
          {!!tutorialPath && !isPaused && !isGameOver && (
            <AdaptiveMotion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -top-1 start-4 end-4 z-50"
            >
              <TutorialCallout
                isVisible
                tutorialWord={tutorialWord}
                position="floating"
                compact
              />
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        {/* Instruction Banner - Absolute overlay, doesn't shift grid */}
        <AdaptiveAnimatePresence>
          {showHintPrompt && !isPaused && !isGameOver && remainingTime > 0 && (
            <AdaptiveMotion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 start-4 end-4 z-40"
            >
              <div className="relative bg-gradient-to-r from-neo-pink to-pink-400 text-white text-center py-2 px-4 rounded-lg border-3 border-neo-black shadow-hard-sm">
                <span className="font-bold text-xs uppercase tracking-wide">
                  {t('singlePlayer.dragInstruction')}
                </span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-neo-pink border-b-3 border-r-3 border-neo-black rotate-45" />
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        <div className="game-board-container relative w-full max-w-[min(90vw,360px)] max-h-full aspect-square">
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

      {/* Hint Prompt */}
      <AdaptiveAnimatePresence>
        {showHintPrompt && !isPaused && !isGameOver && remainingTime > 0 && revealableWordCount > 0 && (
          <HintPromptButton
            onReveal={onReveal}
            setShowHintPrompt={setShowHintPrompt}
            position="fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-1/2 -translate-x-1/2"
            t={t}
          />
        )}
      </AdaptiveAnimatePresence>

      {/* Practice Completion Popup */}
      {isPracticeMode && (
        <Dialog open={showCompletionPopup} onOpenChange={setShowCompletionPopup}>
          <DialogContent noDescription className="max-w-sm sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-center">
                {t('training.completion.title')}
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-4">
              <p className="text-center text-neo-black dark:text-neo-white font-medium">
                {t('training.completion.message')}
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCompletionPopup(false)}
                className="flex-1 min-h-[48px] font-bold"
              >
                {t('training.completion.continuePractice')}
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setShowCompletionPopup(false);
                  onFinishPractice();
                }}
                className="flex-1 min-h-[48px] font-bold"
              >
                {t('training.completion.finish')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle')}
        description={t('singlePlayer.quitConfirmMessage')}
        confirmText={t('singlePlayer.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmQuit}
        variant="danger"
      />
    </div>
  );
}

// Challenge Progress Tracker sub-component
interface ChallengeProgressTrackerProps {
  score: number;
  targetHighScore: number | null;
  t: (key: string) => string | undefined;
}

function ChallengeProgressTracker({ score, targetHighScore, t }: ChallengeProgressTrackerProps): React.ReactElement {
  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-1 md:mx-4 flex-shrink-0"
    >
      {targetHighScore !== null ? (
        <div className={cn(
          'relative rounded-neo border-2 md:border-3 px-1.5 md:px-4 py-0.5 md:py-2 shadow-hard-sm',
          score > targetHighScore
            ? 'bg-gradient-to-r from-neo-lime to-lime-300 border-neo-lime'
            : score === targetHighScore
              ? 'bg-gradient-to-r from-neo-lime to-yellow-300 border-neo-lime'
              : 'bg-neo-cream dark:bg-slate-700 border-neo-black dark:border-slate-500'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 md:gap-2">
              {score > targetHighScore ? (
                <>
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-neo-black" />
                  <span className="font-black text-xs md:text-sm text-neo-black uppercase">
                    {t('challenge.newRecord')}
                  </span>
                </>
              ) : score === targetHighScore ? (
                <>
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-neo-black" />
                  <span className="font-black text-xs md:text-sm text-neo-black uppercase">
                    {t('challenge.tied')}
                  </span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-neo-lime" />
                  <span className="font-bold text-xs md:text-sm text-neo-black/70 dark:text-neo-white/70">
                    {t('challenge.recordToBeat')}: <span className="font-black text-neo-black dark:text-neo-white">{targetHighScore}</span>
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {score > targetHighScore ? (
                <AdaptiveMotion.span
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="font-black text-xs md:text-sm text-neo-black"
                >
                  +{score - targetHighScore}
                </AdaptiveMotion.span>
              ) : score < targetHighScore ? (
                <span className="font-bold text-xs md:text-sm text-neo-black/75 dark:text-neo-white/75">
                  {targetHighScore - score} {t('challenge.toGo')}
                </span>
              ) : null}
            </div>
          </div>
          {/* Progress bar */}
          {score <= targetHighScore && (
            <div className="mt-1 md:mt-2 h-1.5 md:h-2 bg-neo-black/10 text-white dark:bg-white/10 rounded-full overflow-hidden">
              <AdaptiveMotion.div
                className="h-full bg-gradient-to-r from-neo-cyan to-neo-lime rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((score / targetHighScore) * 100, 100)}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-neo-cyan/20 text-neo-black dark:bg-neo-cyan/10 dark:text-white rounded-neo border-2 border-dashed border-neo-cyan">
          <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-neo-cyan" />
          <span className="font-bold text-xs md:text-sm text-neo-black/70 dark:text-neo-white/70">
            {t('challenge.settingFirst')}
          </span>
        </div>
      )}
    </AdaptiveMotion.div>
  );
}
