'use client';

import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAchievementQueue } from '@/components/achievements';
import { useIdleDetection } from '@/hooks/useIdleDetection';
import { trackDeadTime, trackGrowthEvent } from '@/utils/growthTracking';
import { createFirstMinuteSurvivalTimer, detectPlatform } from '@/utils/posthogEngagement';
import { useBoardReadyTelemetry } from './game/hooks/useBoardReadyTelemetry';

const DEAD_TIME_THRESHOLD_MS = 15000;
import {
  useSinglePlayerCore,
  SinglePlayerShell,
} from './game';

import type { SinglePlayerGameState, SinglePlayerResultsData } from './SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';
import PracticeContinuePrompt from './PracticeContinuePrompt';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';
import { useSoloLesson } from './useSoloLesson';
import { SearchInlineHint } from './SearchInlineHint';
import { coachStepFor } from './coachStep';
import { updateActiveGameExtras } from '@/utils/abandonOnPagehide';
import { useSelectionStore } from '@/hooks/useSelectionStore';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { evaluateSelectionAchievements } from '@/lib/achievements/hiddenAchievementBus';
import { useExperiment } from '@/hooks/useExperiment';

const PRACTICE_CONTINUE_THRESHOLD = 100;
const WORD_GOAL_TARGET = 10;
const WORD_GOAL_MOMENTUM_THRESHOLD = 5;

interface SinglePlayerGameProps {
  settings: SinglePlayerGameState;
  targetHighScore: number | null;
  onGameEnd: (results: SinglePlayerResultsData) => void;
  onQuit: () => void;
  /**
   * Suppress ModeCoach FTUE (and practice tip). Used by Quick Play arcade loop
   * so every round starts immediately without coach stacking.
   */
  hideModeCoach?: boolean;
  /** True when `onQuit` resets state and stays on this page (Quick Play). See useSinglePlayerCore. */
  quitStaysOnPage?: boolean;
}

/**
 * SinglePlayerGame - Core game component for single player mode
 * Composes layout components based on device orientation/type
 */
function SinglePlayerGame({
  settings,
  targetHighScore,
  onGameEnd,
  onQuit,
  hideModeCoach = false,
  quitStaysOnPage = false,
}: SinglePlayerGameProps): React.ReactElement {
  // The lesson reads the core, so its clock hold comes back through state.
  const [lessonHold, setLessonHold] = useState(false);
  const core = useSinglePlayerCore({
    settings,
    targetHighScore,
    onGameEnd,
    onQuit,
    quitStaysOnPage,
    clockHold: lessonHold,
  });

  // No game_started here: useSinglePlayerEffects (inside useSinglePlayerCore above)
  // is the single emitter. Emitting here too double-counted every SP game.
  useEffect(() => {
    // CrazyGames ranking signal — fires `first_minute_retained` if player
    // stays past 60s. Cancelled on unmount (early abandon).
    const survival = createFirstMinuteSurvivalTimer({
      mode: `sp:${settings.mode}`,
      platform: detectPlatform(),
    });
    survival.start();
    return () => survival.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevWordCountRef = useRef(0);

  // First-15-seconds instrumentation: proves the timer gate in
  // useSinglePlayerCore held the clock while the board was loading (see
  // useBoardReadyTelemetry — remainingTimeAtReady should always equal
  // timerSeconds now).
  useBoardReadyTelemetry(core.grid, core.timer.remainingTime, settings.mode, settings.timerSeconds);

  useEffect(() => {
    const wordCount = core.foundWords.length;
    if (wordCount === 1 && prevWordCountRef.current === 0) {
      trackGrowthEvent('first_word_found', { mode: settings.mode });
    }
    prevWordCountRef.current = wordCount;
  }, [core.foundWords.length, settings.mode]);

  // Show toast notifications for achievements (same as multiplayer)
  const { queueAchievement } = useAchievementQueue();
  const prevAchievementCountRef = useRef(0);

  useEffect(() => {
    const achievements = core.liveAchievements;
    // Only trigger for NEW achievements (not on initial render)
    if (achievements.length > prevAchievementCountRef.current) {
      // Queue the new achievements for toast notification
      const newAchievements = achievements.slice(prevAchievementCountRef.current);
      newAchievements.forEach((achievement) => {
        queueAchievement(achievement);
      });
    }
    prevAchievementCountRef.current = achievements.length;
  }, [core.liveAchievements, queueAchievement]);

  // Practice-mode all-words celebration — fires once when player clears the board.
  // Declared first so the score-threshold prompt can suppress itself when this fires.
  const allClearedRef = useRef(false);
  useEffect(() => {
    if (settings.mode !== 'practice') return;
    if (allClearedRef.current) return;
    const total = core.totalBoardWords ?? 0;
    if (total > 0 && core.foundWords.length >= total) {
      allClearedRef.current = true;
      fireVictoryConfetti();
      // End the run after confetti fires so player lands on the results page.
      // Clear on unmount so a mid-confetti navigation doesn't route post-unmount.
      const finishId = setTimeout(() => core.handleFinishPractice(), 1200);
      return () => clearTimeout(finishId);
    }
    return undefined;
  }, [core.foundWords.length, core.totalBoardWords, settings.mode, core]);

  // Practice-mode continue prompt — fires once when score crosses threshold.
  // Continue closes modal; Skip ends the game and routes to results.
  // Suppressed if the all-cleared celebration already fired (which ends the run).
  const [continuePromptOpen, setContinuePromptOpen] = React.useState(false);
  const continuePromptShownRef = useRef(false);
  useEffect(() => {
    if (settings.mode !== 'practice') return;
    if (continuePromptShownRef.current) return;
    if (core.isGameOver) return;
    if (allClearedRef.current) return;
    if (core.score >= PRACTICE_CONTINUE_THRESHOLD) {
      continuePromptShownRef.current = true;
      setContinuePromptOpen(true);
    }
  }, [core.score, core.isGameOver, settings.mode]);
  const handlePromptContinue = useCallback(() => setContinuePromptOpen(false), []);
  const handlePromptSkip = useCallback(() => {
    setContinuePromptOpen(false);
    core.handleFinishPractice();
  }, [core]);

  // Dead-time growth signal: fire once per round after N seconds of no letter selection
  const sessionKey = core.grid
    ? (core.grid as LetterGrid).map((row) => row.join('')).join('|')
    : 'nogrid';
  const idleEnabled = Boolean(core.grid) && !core.isPaused && !core.isGameOver;
  const handleIdle = useCallback(() => {
    trackDeadTime(settings.mode, DEAD_TIME_THRESHOLD_MS, {
      wordsFound: core.foundWords.length,
      score: core.score,
    });
  }, [settings.mode, core.foundWords.length, core.score]);
  const { reportActivity } = useIdleDetection({
    enabled: idleEnabled,
    thresholdMs: DEAD_TIME_THRESHOLD_MS,
    onIdle: handleIdle,
    sessionKey,
  });

  const coreWordChange = core.handleWordChange;
  const wrappedWordChange = useCallback(
    (word: string, count: number) => {
      reportActivity();
      coreWordChange(word, count);
    },
    [reportActivity, coreWordChange]
  );
  const wrappedWordSubmit = core.handleWordSubmit;

  const lessonEnabled = settings.mode !== 'practice' && !hideModeCoach && !settings.shortCoach && !core.awaitingStart && !core.isGameOver;
  const tracedWord = useSelectionStore((s) => (lessonEnabled ? s.formedWord : ''));
  const lesson = useSoloLesson({
    enabled: lessonEnabled,
    grid: core.grid as LetterGrid | null,
    language: settings.language,
    availableWords: core.availableWords,
    foundWords: core.foundWords,
    formedWord: tracedWord,
    feedback: core.currentFeedback,
    score: core.score,
    friendHref: `/${settings.language}/multiplayer`,
  });
  useEffect(() => setLessonHold(lesson.holdClock), [lesson.holdClock]);

  const [hintGone, setHintGone] = useState(false);
  const dismissHint = useCallback(() => setHintGone(true), []);
  const showSearchHint = !!settings.shortCoach && !hintGone;
  const coachStep = coachStepFor({
    spMode: settings.mode,
    shortCoach: !!settings.shortCoach,
    hintVisible: showSearchHint,
    lessonActive: lesson.active,
    stepId: lesson.stepId,
    lessonComplete: lesson.complete,
    lessonSkipped: lesson.skipped,
  });
  useEffect(() => {
    if (!coachStep) return;
    updateActiveGameExtras({ coach_step: coachStep });
  }, [coachStep]);

  // Wrap path submit to detect the "select every tile in one drag" hidden
  // achievement. Cosmetic + fire-and-forget; always delegates to the real handler.
  const corePathSubmit = core.handlePathSubmit;
  const coreGrid = core.grid;
  const wrappedPathSubmit = useCallback(
    (path: Parameters<typeof corePathSubmit>[0]) => {
      const grid = coreGrid as LetterGrid | null;
      if (grid && grid.length > 0) {
        evaluateSelectionAchievements({
          selectedTileCount: Array.isArray(path) ? path.length : 0,
          totalTiles: grid.length * (grid[0]?.length ?? 0),
        });
      }
      corePathSubmit(path);
    },
    [coreGrid, corePathSubmit]
  );

  // Common props for all layouts - memoized to prevent unnecessary re-renders
  // Must be called before any conditional returns to follow React hooks rules
  const commonProps = useMemo(() => {
    // Return null props when grid not yet loaded - this branch won't be used
    // since we return the loading state below, but hooks must be unconditional
    if (!core.grid) {
      return null;
    }
    return {
      grid: core.grid as LetterGrid,
      language: settings.language,
      isPaused: core.isPaused,
      isGameOver: core.isGameOver,
      score: core.score,
      foundWords: core.foundWords,
      remainingTime: core.timer.remainingTime,
      totalTime: settings.timerSeconds,
      mode: settings.mode,
      comboLevel: core.combo.comboLevel,
      comboTimeRemaining: core.combo.comboTimeRemaining,
      comboDanger: core.combo.isDangerState,
      maxCombo: core.combo.maxCombo,
      comboCoinReward: core.comboCoinReward,
      onCoinAnimationComplete: core.handleCoinAnimationComplete,
      currentFeedback: core.currentFeedback,
      keyboardInput: core.keyboardInput,
      showHandCoach: !hideModeCoach,
      highlightedPath: core.revealState.highlightedPath,
      lastWordFoundTimeRef: core.lastWordFoundTimeRef,
      fireRoundActive: core.fireRoundActive,
      fireRoundRemaining: core.fireRoundRemaining,
      earthquakeState: core.earthquakeState,
      isValidatingWords: core.isValidatingWords,
      showHintPrompt: core.showHintPrompt,
      revealableWordCount: core.revealableWordCount,
      onReveal: core.handleReveal,
      setShowHintPrompt: core.setShowHintPrompt,
      directionGuidance: core.directionGuidance,
      training: core.training,
      onWordSubmit: wrappedWordSubmit,
      onPathSubmit: wrappedPathSubmit,
      onWordChange: wrappedWordChange,
      onPauseToggle: core.handlePauseToggle,
      onFinishPractice: core.handleFinishPractice,
      onQuitRequest: core.handleQuitRequest,
      onConfirmQuit: core.confirmQuit,
      showQuitConfirm: core.showQuitConfirm,
      setShowQuitConfirm: core.setShowQuitConfirm,
      onExtendTime: (seconds: number) =>
        core.timer.setTime(core.timer.remainingTime + seconds),
      t: core.t,
    };
  }, [
    hideModeCoach,
    core.grid,
    settings.language,
    core.isPaused,
    core.isGameOver,
    core.score,
    core.foundWords,
    settings.timerSeconds,
    settings.mode,
    core.combo.comboLevel,
    core.combo.comboTimeRemaining,
    core.combo.isDangerState,
    core.combo.maxCombo,
    core.comboCoinReward,
    core.handleCoinAnimationComplete,
    core.currentFeedback,
    core.keyboardInput,
    core.revealState.highlightedPath,
    core.lastWordFoundTimeRef,
    core.fireRoundActive,
    core.fireRoundRemaining,
    core.earthquakeState,
    core.isValidatingWords,
    core.showHintPrompt,
    core.revealableWordCount,
    core.handleReveal,
    core.setShowHintPrompt,
    core.directionGuidance,
    core.training,
    wrappedWordSubmit,
    wrappedPathSubmit,
    wrappedWordChange,
    core.handlePauseToggle,
    core.handleFinishPractice,
    core.handleQuitRequest,
    core.confirmQuit,
    core.showQuitConfirm,
    core.setShowQuitConfirm,
    core.timer,
    core.t,
  ]);

  // Loading state - shown when grid is not yet initialized.
  // MUST be the same `fixed inset-0 z-[70]` box as the ready shell: the
  // previous `min-h-[60vh]` in-flow loader was a different size than the
  // overlay, so the timer/MASTERBOT/FIND-10 shell shifted 48px (CLS 0.0729
  // pinned across every PSI run). No mascot here — LCP img is in the layout.
  if (!commonProps) {
    return (
      <div
        className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-neo-navy"
        translate="no"
        aria-busy="true"
        aria-label={core.t('common.loading')}
      />
    );
  }


  const practicePromptElement = settings.mode === 'practice' ? (
    <PracticeContinuePrompt
      open={continuePromptOpen}
      score={core.score}
      onContinue={handlePromptContinue}
      onSkip={handlePromptSkip}
    />
  ) : null;

  // In-game coaching strip for practice mode — auto-hides after first word found.
  // hideModeCoach (Quick Play) suppresses both ModeCoach and practice tip.
  // Rendered in the layout's chrome slot (in flow) — floated at the top it
  // covered the HUD.
  const practiceCoachElement =
    settings.mode === 'practice' && !hideModeCoach ? (
      <PracticeCoachTip mode="classic" wordsFound={core.foundWords.length} />
    ) : null;

  // exp-singleplayer-word-goal-v1: timed SP has worst completion of all modes
  // (73 started / 12 completed). word-goal arm anchors players to a concrete
  // "X / 10 words" milestone instead of only a countdown timer.
  const wordGoalBadgeElement =
    settings.mode !== 'practice' && !hideModeCoach && !lesson.active ? (
      <WordGoalBadge wordsFound={core.foundWords.length} t={commonProps.t} />
    ) : null;

  // One shell for portrait, landscape, desktop and TV.
  //
  // `fixed inset-0`, not `h-[100dvh]`: the shell is `flex-1 min-h-0` over a
  // `container-type: size` board slot, so it needs a definite height (see
  // gameShellSizing.contract.test.ts) — but a 100dvh box that STARTS below the
  // app header is 100dvh tall and ends one header past the fold. Measured in
  // landscape: wrapper y=74, board bottom 425 in a 384 viewport, page scrollH
  // 554. Pinning to the viewport makes the height both definite and correctly
  // positioned. In-game is a fullscreen surface anyway — the bottom nav is
  // already hidden during play and the shell carries its own Exit button.
  //
  // z-70 clears the app header (fixed, z-60, 80px tall), which otherwise covered
  // the top of the shell's side rails on desktop and stole 80px from the board on
  // every surface. Modals stay above (AuthModal z-100, WinnerOnboarding z-110).
  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-neo-navy" translate="no">
      {practicePromptElement}
      {lesson.overlay}
      {wordGoalBadgeElement}
      <SinglePlayerShell
        grid={core.grid as LetterGrid}
        language={settings.language}
        score={core.score}
        remainingTime={settings.mode === 'practice' ? null : core.timer.remainingTime}
        totalSeconds={settings.timerSeconds}
        isPaused={core.isPaused}
        isGameOver={core.isGameOver}
        bots={core.liveBots}
        foundWords={core.foundWords}
        comboLevel={core.combo.comboLevel}
        fireRoundActive={core.fireRoundActive}
        fireRoundRemaining={core.fireRoundRemaining}
        earthquakeState={core.earthquakeState}
        currentFeedback={core.currentFeedback}
        highlightedPath={core.revealState.highlightedPath ?? []}
        isTypingMode={core.keyboardInput?.isTypingMode}
        typedWord={core.keyboardInput?.typedWord}
        keyboardHighlight={core.keyboardInput?.highlightedCells}
        lastWordFoundTime={core.lastWordFoundTimeRef.current ?? 0}
        isDesktop={core.isDesktop || core.isTv}
        awaitingStart={core.awaitingStart}
        onStart={core.handleStart}
        onWordSubmit={wrappedWordSubmit}
        onWordChange={wrappedWordChange}
        onPathSubmit={wrappedPathSubmit}
        onExit={core.handleQuitRequest}
        onPauseToggle={core.handlePauseToggle}
        gameStatsRef={core.gameStatsRef}
        t={commonProps.t}
        soloStreak={core.soloCombo?.streak ?? 0}
        soloMultiplier={core.soloCombo?.multiplier ?? 1}
        soloPraiseKey={core.soloCombo?.praiseKey ?? null}
        soloMissions={lesson.active ? undefined : core.soloMissions}
        soloChrome={lesson.hud ?? (showSearchHint ? <SearchInlineHint onDismiss={dismissHint} /> : practiceCoachElement)}
        soloLessonActive={lesson.active}
      />
    </div>
  );
}


function WordGoalBadge({
  wordsFound,
  t,
}: {
  wordsFound: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}): React.ReactElement | null {
  const { variant, trackExposure } = useExperiment('exp-singleplayer-word-goal-v1');
  useEffect(() => {
    if (variant === 'word-goal') trackExposure();
  }, [variant, trackExposure]);

  if (variant !== 'word-goal') return null;

  const momentum = wordsFound >= WORD_GOAL_MOMENTUM_THRESHOLD;
  return (
    <div
      className={`fixed bottom-4 end-4 z-[80] rounded-neo border-2 border-neo-cream/40 px-3 py-1.5 font-neo-body text-sm font-bold shadow-hard-sm ${
        momentum ? 'bg-neo-orange text-neo-navy' : 'bg-neo-navy-light text-neo-cream'
      }`}
    >
      {t('singlePlayer.wordGoal.progress', { count: Math.min(wordsFound, WORD_GOAL_TARGET), goal: WORD_GOAL_TARGET })}
    </div>
  );
}

export default SinglePlayerGame;
