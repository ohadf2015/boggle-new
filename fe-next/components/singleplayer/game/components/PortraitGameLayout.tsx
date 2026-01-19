'use client';

import React from 'react';
import { ArrowLeft, Pause, Play, Crown, TrendingUp, Target, Zap } from 'lucide-react';
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
import { GameOverlays } from './GameOverlays';
import { HintPromptButton } from './HintPromptButton';
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
  maxCombo,
  comboCoinReward,
  onCoinAnimationComplete,
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
    <div className="relative flex-1 flex flex-col overflow-hidden">
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
      <div className="flex items-center justify-between px-2 md:px-4 py-0.5 md:py-1 flex-shrink-0">
        <Button
          variant="destructive"
          size="sm"
          onClick={onQuitRequest}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold"
        >
          <ArrowLeft className="me-2 rtl:rotate-180" />
          {t('common.quit') || 'Quit'}
        </Button>
        {!isPracticeMode ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onPauseToggle}
          >
            {isPaused ? <Play /> : <Pause />}
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={onFinishPractice}
            className="min-h-[44px] min-w-[80px] text-sm sm:text-base font-bold"
          >
            {t('singlePlayer.finish') || 'Finish'}
          </Button>
        )}
      </div>

      {/* Training Progress Bar - shown in practice mode (portrait) */}
      {isPracticeMode && training && (
        <div className="px-2 md:px-4 py-1 flex-shrink-0">
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

      {/* Stats row - Combo | Timer | Score - matches multiplayer layout */}
      <div ref={gameStatsRef} className="flex w-full items-center justify-between px-1 md:px-2 gap-0" role="status" aria-label="Game status">
        {/* Left Side: Combo (Normal) or Placeholder (Practice) */}
        <div className="flex-1 flex justify-end pr-1 md:pr-3 pointer-events-none">
          <div className="pointer-events-auto">
            {!isPracticeMode ? (
              <ComboDisplay
                comboLevel={comboLevel}
                compact
                coinReward={comboCoinReward}
                onCoinAnimationComplete={onCoinAnimationComplete}
              />
            ) : (
              <div className="min-w-[50px] md:min-w-[90px]" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Center: Timer (Normal) or Score (Practice) */}
        <div className="flex items-center justify-center shrink-0">
          {!isPracticeMode ? (
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-20"
            >
              <div className="hidden lg:block">
                <CircularTimer
                  remainingTime={remainingTime}
                  totalTime={totalTime}
                  size="lg"
                />
              </div>
              <div className="hidden md:block lg:hidden">
                <CircularTimer
                  remainingTime={remainingTime}
                  totalTime={totalTime}
                  size="md"
                />
              </div>
              <div className="md:hidden">
                <CircularTimer
                  remainingTime={remainingTime}
                  totalTime={totalTime}
                  size="xs"
                />
              </div>
            </AdaptiveMotion.div>
          ) : (
            /* Score - Centered in practice mode */
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative border-2 md:border-3 border-neo-black rounded-neo shadow-hard md:shadow-hard-lg px-4 sm:px-6 md:px-10 py-1.5 sm:py-2 md:py-4 min-w-[80px] sm:min-w-[120px] md:min-w-[180px]"
              style={{
                background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
              }}
            >
              <div className="text-center">
                <AdaptiveMotion.div
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="font-black text-neo-black leading-tight text-2xl sm:text-3xl md:text-4xl"
                  style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
                >
                  {score}
                </AdaptiveMotion.div>
                <div className="font-bold uppercase tracking-wider text-neo-black/80 text-xs sm:text-sm md:text-base">
                  {t('common.score') || 'Score'}
                </div>
              </div>
            </AdaptiveMotion.div>
          )}
        </div>

        {/* Right Side: Score (Normal) or Combo (Practice) */}
        <div className="flex-1 flex justify-start pl-2 md:pl-6 pointer-events-none">
          <div className="pointer-events-auto">
            {!isPracticeMode ? (
              /* Score - Right side in normal mode */
              <AdaptiveMotion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative border-2 md:border-3 border-neo-black rounded-neo shadow-hard md:shadow-hard-lg px-1.5 md:px-4 py-0.5 md:py-1.5 min-w-[50px] md:min-w-[90px]"
                style={{
                  background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
                }}
              >
                <div className="text-center">
                  <AdaptiveMotion.div
                    key={score}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="font-black text-neo-black leading-tight text-lg md:text-2xl"
                    style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}
                  >
                    {score}
                  </AdaptiveMotion.div>
                  <div className="font-bold uppercase tracking-wider text-neo-black/80 text-[9px] md:text-xs">
                    {t('common.score') || 'Score'}
                  </div>
                </div>
              </AdaptiveMotion.div>
            ) : (
              <div className="min-w-[50px] md:min-w-[90px] flex justify-start">
                <ComboDisplay
                  comboLevel={comboLevel}
                  compact
                  coinReward={comboCoinReward}
                  onCoinAnimationComplete={onCoinAnimationComplete}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Word Forming Area */}
      <div className="flex items-center justify-center flex-shrink-0">
        <WordFormingArea
          word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord}
          letterCount={keyboardInput.isTypingMode ? keyboardInput.typedWord.length : letterCount}
          feedback={currentFeedback}
          compact
        />
      </div>

      {/* Challenge Mode Progress Tracker */}
      {isChallengeMode && (
        <ChallengeProgressTracker
          score={score}
          targetHighScore={targetHighScore}
          t={t}
        />
      )}

      {/* Game grid */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
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
                {t('training.completion.title') || 'Well done!'}
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 space-y-4">
              <p className="text-center text-neo-black dark:text-neo-white font-medium">
                {t('training.completion.message') || "You've mastered the game! You can continue practicing or finish and start a real match."}
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCompletionPopup(false)}
                className="flex-1 min-h-[48px] font-bold"
              >
                {t('training.completion.continuePractice') || 'Continue Practice'}
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  setShowCompletionPopup(false);
                  onFinishPractice();
                }}
                className="flex-1 min-h-[48px] font-bold"
              >
                {t('training.completion.finish') || 'Finish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle') || 'Quit Game?'}
        description={t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?'}
        confirmText={t('singlePlayer.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
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
                    {t('challenge.newRecord') || 'New Record!'}
                  </span>
                </>
              ) : score === targetHighScore ? (
                <>
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-neo-black" />
                  <span className="font-black text-xs md:text-sm text-neo-black uppercase">
                    {t('challenge.tied') || 'Tied!'}
                  </span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-neo-lime" />
                  <span className="font-bold text-xs md:text-sm text-neo-black/70 dark:text-neo-white/70">
                    {t('challenge.recordToBeat') || 'Record'}: <span className="font-black text-neo-black dark:text-neo-white">{targetHighScore}</span>
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
            {t('challenge.settingFirst') || 'Setting your first record!'}
          </span>
        </div>
      )}
    </AdaptiveMotion.div>
  );
}
