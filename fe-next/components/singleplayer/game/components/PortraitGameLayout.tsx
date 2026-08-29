'use client';

import React from 'react';
import { ArrowLeft, Pause, Play, Crown, TrendingUp, Target, Zap, Coins } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import ComboDisplay from '@/components/game/ComboDisplay';
import { Button } from '@/components/ui/button';
import GridComponent from '@/components/GridComponent';
import CircularTimer from '@/components/CircularTimer';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useQuitConfirmDescription } from '@/hooks/useQuitConfirmDescription';
import { useExperiment } from '@/hooks/useExperiment';
import { TrainingProgressBar } from '@/components/training';
import { shouldShowKeyboardTrails } from '@/components/game/keyboardTrailsUtils';
import { cn } from '@/lib/utils';
import { COIN_EARNING_OTHER } from '@/utils/coinManager';
import { formatScore } from '@/utils/scoreDisplay';
import { GameOverlays } from './GameOverlays';
import { CalmSessionBadge } from '@/components/cosy/CalmSessionBadge';
import { HintPromptButton } from './HintPromptButton';
import { DynamicEnergyBackground } from './DynamicEnergyBackground';
import TimeLowAdPrompt from '@/components/ads/TimeLowAdPrompt';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { EarthquakeState } from '@/shared/types/earthquake';
import type { FoundWord, KeyboardInputState, TrainingState } from '../types';

// Static style objects extracted to module level to avoid re-creation on every render
const TIMER_DROP_SHADOW_STYLE = { filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,1))' } as const;
const LIME_GRADIENT_STYLE = { background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)' } as const;

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
  /** Show the first-play hand coach on the board (BoardHandCoach). */
  showHandCoach?: boolean;
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
  /** Extend the game timer (rewarded-ad integration). */
  onExtendTime?: (seconds: number) => void;
  // Words
  totalBoardWords: number | null;
  // Ref for auto-scroll
  gameStatsRef: React.RefObject<HTMLDivElement | null>;
  // Refs for anchoring floating score popup
  scoreBadgeRef?: React.RefObject<HTMLDivElement | null>;
  wordAreaRef?: React.RefObject<HTMLDivElement | null>;
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
  tutorialWord: _tutorialWord,
  showHandCoach = false,
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
  totalBoardWords,
  showQuitConfirm,
  setShowQuitConfirm,
  onExtendTime,
  gameStatsRef,
  scoreBadgeRef: _scoreBadgeRef,
  wordAreaRef: _wordAreaRef,
  t,
}: PortraitGameLayoutProps): React.ReactElement {
  // Use forwarded refs if provided, otherwise local refs
  const localScoreBadgeRef = React.useRef<HTMLDivElement>(null);
  const localWordAreaRef = React.useRef<HTMLDivElement>(null);
  const scoreBadgeRef = _scoreBadgeRef ?? localScoreBadgeRef;
  const wordAreaRef = _wordAreaRef ?? localWordAreaRef;
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
  const isChallengeMode = mode === 'challenge';
  const { variant: wordGoalVariant } = useExperiment('exp-singleplayer-word-goal-v1');
  const showWordGoalBadge = wordGoalVariant === 'word-goal' && (mode === 'classic' || mode === 'survival');

  // Compute highlighted path for grid
  const gridHighlightedPath = shouldShowKeyboardTrails(keyboardInput.isTypingMode, lastWordFoundTimeRef.current, undefined)
    ? keyboardInput.highlightedCells
    : tutorialPath
      ? tutorialPath.map(p => ({ row: p.row, col: p.col }))
      : highlightedPath;

  return (
    // Definite height, not a minimum. The board slot below is a
    // `container-type: size` element, and cqh/cqb only resolve to a real number
    // when every ancestor has a definite height. Under a content-driven minimum
    // they computed 0px, `min(100cqw, 94cqh)` collapsed to 0, and the board
    // frame fell back to viewport math inside a zero-width box → tall clipped
    // grid with a dead gap above it.
    <div className="relative flex flex-col overflow-hidden h-[100dvh] bg-neo-navy">
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

      {/* Calm-session cue (cosy only; collapses to nothing otherwise). */}
      <div className="flex justify-center shrink-0 relative z-30 empty:hidden">
        <CalmSessionBadge />
      </div>

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
        <div className="px-2 md:px-4 py-1 shrink-0 relative z-40">
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
        {/* Left: Coins badge — hidden in practice (training has no coin economy noise) */}
        <div className="flex-1 flex justify-start">
          {!isPracticeMode && (
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
          )}
        </div>

        {/* Center: Score (practice only) — in non-practice the timer moves down to the word-forming row */}
        {isPracticeMode && (
          <div className="relative flex items-center justify-center mx-2">
            <AdaptiveMotion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative border-3 border-neo-black rounded-lg shadow-hard px-4 py-1.5 min-w-[80px]"
              style={LIME_GRADIENT_STYLE}
            >
              <div className="text-center relative z-10">
                <AdaptiveMotion.div
                  key={score}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="font-black text-neo-black leading-tight text-xl"
                >
                  {formatScore(score)}
                </AdaptiveMotion.div>
                <div className="font-bold uppercase tracking-wider text-neo-black/80 text-[9px]">
                  {t('common.score')}
                </div>
              </div>
            </AdaptiveMotion.div>
          </div>
        )}

        {/* Right: Score badge */}
        <div className="flex-1 flex justify-end">
          {!isPracticeMode ? (
            <AdaptiveMotion.div
              ref={scoreBadgeRef}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative border-3 border-neo-black rounded-lg shadow-hard px-2 py-1 min-w-[80px] transform rotate-1"
              style={LIME_GRADIENT_STYLE}
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
                  {formatScore(score)}
                </AdaptiveMotion.div>
              </div>
            </AdaptiveMotion.div>
          ) : (
            // Practice mode: no combo chrome — score chip lives in the centre slot.
            <div className="min-w-[50px]" />
          )}
        </div>
      </div>

      {/* Timer + Word Forming Area — same row so they're vertically aligned and share spacing */}
      <div ref={wordAreaRef} className="flex items-center justify-center gap-3 shrink-0 relative z-30 px-4 mb-1 mx-auto w-full overflow-visible max-w-[440px]">
        {!isPracticeMode && (
          <AdaptiveMotion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-20 shrink-0"
            style={TIMER_DROP_SHADOW_STYLE}
          >
            <CircularTimer
              remainingTime={remainingTime}
              totalTime={totalTime}
              size="sm"
            />
          </AdaptiveMotion.div>
        )}
        <div className="h-10 flex items-center justify-center min-w-0 overflow-visible">
          <WordFormingArea word={keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord} letterCount={(keyboardInput.isTypingMode ? keyboardInput.typedWord : formedWord).length} feedback={currentFeedback} compact />
        </div>
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
          <span className="text-[10px] font-bold text-white uppercase tracking-wider tabular-nums">
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
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-1 relative z-30 min-h-0 [container-type:size]">
        {/* Instruction Banner - Absolute overlay, doesn't shift grid */}
        <AdaptiveAnimatePresence>
          {showHintPrompt && !isPaused && !isGameOver && remainingTime > 0 && (
            <AdaptiveMotion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-2 inset-s-4 inset-e-4 z-40"
            >
              <div className="relative bg-linear-to-r from-neo-pink to-pink-400 text-white text-center py-2 px-4 rounded-lg border-3 border-neo-black shadow-hard-sm">
                <span className="font-bold text-xs uppercase tracking-wide">
                  {t('singlePlayer.dragInstruction')}
                </span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-neo-pink border-b-3 border-r-3 border-neo-black rotate-45" />
              </div>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        <div
          className="game-board-container grid-fill relative aspect-square mx-auto"
          style={{ width: 'min(100cqw, 94cqh)' }}
        >
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
            showHandCoach={showHandCoach}
            language={language}
            isTypingMode={keyboardInput.isTypingMode}
            submitFeedback={currentFeedback}
          />
          {showWordGoalBadge && (
            <div className="absolute bottom-1 end-1 z-20 bg-neo-navy border-2 border-neo-cyan text-neo-cyan text-xs font-bold px-2 py-1 rounded-md shadow-hard-sm select-none pointer-events-none">
              {validWordCount} / 10 {t('singlePlayer.wordGoalUnit')}
            </div>
          )}
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

      {/* Time-low rewarded-ad prompt — loss aversion at the most urgent moment */}
      {onExtendTime && !isPaused && !isGameOver && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <TimeLowAdPrompt timeRemaining={remainingTime} onExtend={onExtendTime} />
        </div>
      )}

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle')}
        description={quitConfirmDescription}
        confirmText={t('singlePlayer.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmQuit}
        variant="danger"
        analyticsId="sp_quit_confirm"
        analyticsExtras={{ layout: 'portrait' }}
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
      className="mx-1 md:mx-4 shrink-0"
    >
      {targetHighScore !== null ? (
        <div className={cn(
          'relative rounded-neo border-2 md:border-3 px-1.5 md:px-4 py-0.5 md:py-2 shadow-hard-sm',
          score > targetHighScore
            ? 'bg-linear-to-r from-neo-lime to-lime-300 border-neo-lime'
            : score === targetHighScore
              ? 'bg-linear-to-r from-neo-lime to-yellow-300 border-neo-lime'
              : 'bg-neo-cream dark:bg-neo-navy-elevated border-neo-black dark:border-slate-500'
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
                  <span className="font-bold text-xs md:text-sm text-neo-black/70 dark:text-neo-white">
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
                <span className="font-bold text-xs md:text-sm text-neo-black/75 dark:text-neo-white">
                  {targetHighScore - score} {t('challenge.toGo')}
                </span>
              ) : null}
            </div>
          </div>
          {/* Progress bar */}
          {score <= targetHighScore && (
            <div className="mt-1 md:mt-2 h-1.5 md:h-2 bg-neo-black/10 text-white dark:bg-white/10 rounded-full overflow-hidden">
              <AdaptiveMotion.div
                className="h-full bg-linear-to-r from-neo-cyan to-neo-lime rounded-full"
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
          <span className="font-bold text-xs md:text-sm text-neo-black/70 dark:text-neo-white">
            {t('challenge.settingFirst')}
          </span>
        </div>
      )}
    </AdaptiveMotion.div>
  );
}
