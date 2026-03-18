'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAchievementQueue } from '@/components/achievements';
import FirstTimeEncouragement from '@/components/game/FirstTimeEncouragement';
import { useFirstTimeEncouragement } from '@/hooks/useFirstTimeEncouragement';
import {
  useSinglePlayerCore,
  LandscapeGameLayout,
  DesktopGameLayout,
  PortraitGameLayout,
} from './game';
import type { SinglePlayerGameState, SinglePlayerResultsData } from './SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';

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
      onWordChange: core.handleWordChange,
      onPauseToggle: core.handlePauseToggle,
      onFinishPractice: core.handleFinishPractice,
      onQuitRequest: core.handleQuitRequest,
      onConfirmQuit: core.onQuit,
      showQuitConfirm: core.showQuitConfirm,
      setShowQuitConfirm: core.setShowQuitConfirm,
      t: core.t,
    };
  }, [
    core.grid,
    settings.language,
    core.isPaused,
    core.isGameOver,
    core.score,
    core.foundWords,
    core.timer.remainingTime,
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
    core.handleWordChange,
    core.handlePauseToggle,
    core.handleFinishPractice,
    core.handleQuitRequest,
    core.onQuit,
    core.showQuitConfirm,
    core.setShowQuitConfirm,
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
    <div className="flex justify-center py-1">
      <FirstTimeEncouragement
        trigger={encouragement.currentTrigger}
        onDismiss={encouragement.dismiss}
      />
    </div>
  ) : null;

  // Landscape layout
  if (core.isLandscape) {
    return (
      <>
        {encouragementBanner}
        <LandscapeGameLayout
          {...commonProps}
          progressBarExpanded={core.progressBarExpanded}
          onToggleProgressBar={core.handleToggleProgressBar}
          showLandscapeTutorial={core.showLandscapeTutorial}
          onDismissLandscapeTutorial={core.dismissLandscapeTutorial}
        />
      </>
    );
  }

  // Desktop/TV layout
  if (core.isDesktop || core.isTv) {
    return (
      <>
        {encouragementBanner}
        <DesktopGameLayout
          {...commonProps}
          targetHighScore={core.targetHighScore}
          totalBoardWords={core.totalBoardWords}
          progressBarExpanded={core.progressBarExpanded}
          onToggleProgressBar={core.handleToggleProgressBar}
          isTv={core.isTv}
        />
      </>
    );
  }

  // Portrait layout (default)
  return (
    <>
      {encouragementBanner}
      <PortraitGameLayout
        {...commonProps}
        targetHighScore={core.targetHighScore}
        totalBoardWords={core.totalBoardWords}
        progressBarExpanded={core.progressBarExpanded}
        onToggleProgressBar={core.handleToggleProgressBar}
        showCompletionPopup={core.showCompletionPopup}
        setShowCompletionPopup={core.setShowCompletionPopup}
        gameStatsRef={core.gameStatsRef}
      />
    </>
  );
}

export default SinglePlayerGame;
