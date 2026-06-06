'use client';

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAchievementQueue } from '@/components/achievements';
import FirstTimeEncouragement from '@/components/game/FirstTimeEncouragement';
import { useFirstTimeEncouragement } from '@/hooks/useFirstTimeEncouragement';
import { useIdleDetection } from '@/hooks/useIdleDetection';
import { trackDeadTime, trackGameStart } from '@/utils/growthTracking';
import { createFirstMinuteSurvivalTimer, detectPlatform } from '@/utils/posthogEngagement';

const DEAD_TIME_THRESHOLD_MS = 15000;
import {
  useSinglePlayerCore,
  LandscapeGameLayout,
  DesktopGameLayout,
  PortraitGameLayout,
} from './game';
import type { SinglePlayerGameState, SinglePlayerResultsData } from './SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';
import { ScorePopupFly } from '@/components/animations/ScorePopupFly';
import PracticeContinuePrompt from './PracticeContinuePrompt';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';
import { fireVictoryConfetti } from '@/utils/confettiUtils';

const PRACTICE_CONTINUE_THRESHOLD = 100;

interface SinglePlayerGameProps {
  settings: SinglePlayerGameState;
  targetHighScore: number | null;
  onGameEnd: (results: SinglePlayerResultsData) => void;
  onQuit: () => void;
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
}: SinglePlayerGameProps): React.ReactElement {
  const core = useSinglePlayerCore({
    settings,
    targetHighScore,
    onGameEnd,
    onQuit,
  });

  // Funnel parity: emit game_started once on mount to pair with emitSinglePlayerGameEnd('singleplayer', settings.mode, ...)
  useEffect(() => {
    trackGameStart('singleplayer', {
      subMode: settings.mode,
      difficulty: settings.difficulty,
      language: settings.language,
    });
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

  // First-time player encouragement system
  const encouragement = useFirstTimeEncouragement();
  const hasTriggeredStartRef = useRef(false);
  const prevWordCountRef = useRef(0);

  // Trigger 'game-start' once when grid loads
  useEffect(() => {
    if (core.grid && !hasTriggeredStartRef.current) {
      hasTriggeredStartRef.current = true;
      encouragement.triggerEncouragement('game-start');
    }
  }, [core.grid, encouragement]);

  // Trigger 'first-word' when first word is found
  useEffect(() => {
    const wordCount = core.foundWords.length;
    if (wordCount === 1 && prevWordCountRef.current === 0) {
      encouragement.triggerEncouragement('first-word');
    }
    prevWordCountRef.current = wordCount;
  }, [core.foundWords.length, encouragement]);

  // Show toast notifications for achievements (same as multiplayer)
  const { queueAchievement } = useAchievementQueue();
  const prevAchievementCountRef = useRef(0);

  // Score popup — shows "+30" when score increases
  const [scorePopup, setScorePopup] = React.useState<{ id: number; value: number; x: number; y: number; word?: string; bonus?: string } | null>(null);
  const prevScoreRef = useRef(0);

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

  // Score popup effect — detect score delta and show flying number
  // Long words (6+) get a bonus label for extra celebration
  useEffect(() => {
    const delta = core.score - prevScoreRef.current;
    if (delta > 0 && prevScoreRef.current > 0) {
      const lastWord = core.foundWords[core.foundWords.length - 1];
      const wordLen = lastWord?.word?.length ?? 0;
      const bonus = wordLen >= 8 ? 'LEGENDARY!' : wordLen >= 7 ? 'INCREDIBLE!' : wordLen >= 6 ? 'AMAZING!' : undefined;
      setScorePopup({
        id: Date.now(),
        value: delta,
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 200,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
        word: lastWord?.word,
        bonus,
      });
    }
    prevScoreRef.current = core.score;
  }, [core.score, core.foundWords]);

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
      formedWord: core.formedWord,
      letterCount: core.letterCount,
      currentFeedback: core.currentFeedback,
      keyboardInput: core.keyboardInput,
      tutorialPath: core.tutorialPath,
      tutorialWord: core.tutorialWord,
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
      onWordSubmit: core.handleWordSubmit,
      onPathSubmit: core.handlePathSubmit,
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
    core.formedWord,
    core.letterCount,
    core.currentFeedback,
    core.keyboardInput,
    core.tutorialPath,
    core.tutorialWord,
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
    core.handleWordSubmit,
    core.handlePathSubmit,
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

  // Loading state - shown when grid is not yet initialized
  if (!commonProps) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoader size="lg" text={core.t('common.loading')} />
      </div>
    );
  }

  const encouragementBanner = encouragement.currentTrigger ? (
    <div className="absolute top-2 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto">
        <FirstTimeEncouragement
          trigger={encouragement.currentTrigger}
          onDismiss={encouragement.dismiss}
        />
      </div>
    </div>
  ) : null;

  const scorePopupElement = (
    <ScorePopupFly
      popup={scorePopup}
      flyToTarget
      showWord
      size={scorePopup?.bonus ? 'lg' : 'md'}
      onComplete={() => setScorePopup(null)}
    />
  );

  const practicePromptElement = settings.mode === 'practice' ? (
    <PracticeContinuePrompt
      open={continuePromptOpen}
      score={core.score}
      onContinue={handlePromptContinue}
      onSkip={handlePromptSkip}
    />
  ) : null;

  // In-game coaching strip for practice mode — auto-hides after first word found.
  const practiceCoachElement = settings.mode === 'practice' ? (
    <div className="absolute top-2 inset-x-0 z-30 px-3 pointer-events-auto">
      <PracticeCoachTip mode="classic" wordsFound={core.foundWords.length} />
    </div>
  ) : null;

  // Landscape layout
  if (core.isLandscape) {
    return (
      <div className="relative h-full" translate="no">
        {encouragementBanner}
        {scorePopupElement}
        {practicePromptElement}
        {practiceCoachElement}
        <LandscapeGameLayout
          {...commonProps}
          progressBarExpanded={core.progressBarExpanded}
          onToggleProgressBar={core.handleToggleProgressBar}
          showLandscapeTutorial={core.showLandscapeTutorial}
          onDismissLandscapeTutorial={core.dismissLandscapeTutorial}
        />
      </div>
    );
  }

  // Desktop/TV layout
  if (core.isDesktop || core.isTv) {
    return (
      <div className="relative h-full" translate="no">
        {encouragementBanner}
        {scorePopupElement}
        {practicePromptElement}
        {practiceCoachElement}
        <DesktopGameLayout
          {...commonProps}
          targetHighScore={core.targetHighScore}
          totalBoardWords={core.totalBoardWords}
          progressBarExpanded={core.progressBarExpanded}
          onToggleProgressBar={core.handleToggleProgressBar}
          isTv={core.isTv}
        />
      </div>
    );
  }

  // Portrait layout (default)
  return (
    <div className="relative" translate="no">
      {encouragementBanner}
      {scorePopupElement}
      {practicePromptElement}
      <PortraitGameLayout
        {...commonProps}
        targetHighScore={core.targetHighScore}
        totalBoardWords={core.totalBoardWords}
        progressBarExpanded={core.progressBarExpanded}
        onToggleProgressBar={core.handleToggleProgressBar}
        gameStatsRef={core.gameStatsRef}
      />
    </div>
  );
}

export default SinglePlayerGame;
