'use client';

import React, { useMemo } from 'react';
import { NeoLoader } from '@/components/ui/NeoLoader';
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
      maxCombo: core.combo.maxCombo,
      comboCoinReward: core.comboCoinReward,
      onCoinAnimationComplete: core.handleCoinAnimationComplete,
      formedWord: core.formedWord,
      letterCount: core.letterCount,
      currentFeedback: core.currentFeedback,
      keyboardInput: core.keyboardInput,
      tutorialPath: core.tutorialPath,
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
    core.combo.maxCombo,
    core.comboCoinReward,
    core.handleCoinAnimationComplete,
    core.formedWord,
    core.letterCount,
    core.currentFeedback,
    core.keyboardInput,
    core.tutorialPath,
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
        <NeoLoader variant="mascot-letters" size="lg" text={core.t('common.loading') || 'Loading...'} />
      </div>
    );
  }

  // Landscape layout
  if (core.isLandscape) {
    return (
      <LandscapeGameLayout
        {...commonProps}
        progressBarExpanded={core.progressBarExpanded}
        onToggleProgressBar={core.handleToggleProgressBar}
        showLandscapeTutorial={core.showLandscapeTutorial}
        onDismissLandscapeTutorial={core.dismissLandscapeTutorial}
      />
    );
  }

  // Desktop/TV layout
  if (core.isDesktop || core.isTv) {
    return (
      <DesktopGameLayout
        {...commonProps}
        targetHighScore={core.targetHighScore}
        totalBoardWords={core.totalBoardWords}
        isTv={core.isTv}
      />
    );
  }

  // Portrait layout (default)
  return (
    <PortraitGameLayout
      {...commonProps}
      targetHighScore={core.targetHighScore}
      progressBarExpanded={core.progressBarExpanded}
      onToggleProgressBar={core.handleToggleProgressBar}
      showCompletionPopup={core.showCompletionPopup}
      setShowCompletionPopup={core.setShowCompletionPopup}
      gameStatsRef={core.gameStatsRef}
    />
  );
}

export default SinglePlayerGame;
