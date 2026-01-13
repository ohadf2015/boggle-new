'use client';

import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useContextualGuidance, useSwipeTipGuidanceTrigger } from '@/hooks/useContextualGuidance';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import SwipeTipTooltip from '@/components/game/SwipeTipTooltip';
import KeyboardHintTooltip from '@/components/game/KeyboardHintTooltip';
import { WordFeedbackToast } from './WordFeedbackToast';

import type { LetterGrid, Language } from '@/types';
import type { SurvivalGameResult } from './survival/types';

import {
  useSurvivalGameLogic,
  SurvivalHeader,
  SurvivalLifeBar,
  SurvivalClueBoxes,
  SurvivalGridSection,
  SurvivalLandscapeLayout,
  AutoClueNotification,
} from './survival';

// Re-export types for backwards compatibility
export type { WordDiscovery, TargetAttempt, SurvivalGameResult } from './survival/types';

interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  onQuit: () => void;
}

/**
 * DailyWordHuntSurvival - Word Hunt with bleeding points, word discovery, and AI hints
 *
 * This is a thin orchestrator component that composes specialized sub-components
 * for different UI sections and uses a custom hook for all game logic.
 */
const DailyWordHuntSurvival: React.FC<DailyWordHuntSurvivalProps> = ({
  grid,
  puzzleNumber,
  language,
  targetWord,
  onComplete,
  onQuit,
}) => {
  const { t } = useLanguage();
  const isLandscape = useMobileLandscape();
  const setIsInGame = useHideNavigation();

  // Performance optimization for low-end devices
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipAnimations = useMemo(
    () => isLowEnd || !enableComplexAnimations,
    [isLowEnd, enableComplexAnimations]
  );

  // Screenshot protection
  const { isProtected } = useScreenshotProtection();

  // Game logic hook
  const [state, actions] = useSurvivalGameLogic({
    grid,
    puzzleNumber,
    language,
    targetWord,
    onComplete,
    t,
  });

  // Navigation guard
  useNavigationGuard({
    enabled: !state.isGameOver,
    message: t('wordHunt.quitConfirmMessage') || 'Your progress will be lost!',
    onNavigationAttempt: () => {
      actions.setShowQuitConfirm(true);
      return false;
    },
  });

  // Contextual guidance for new players
  const contextualGuidance = useContextualGuidance();
  const isGameActive = !state.isGameOver && state.lifePoints > 0;

  useSwipeTipGuidanceTrigger(
    state.discoveredWords.length,
    contextualGuidance.triggerSwipeTipGuidance,
    isGameActive,
    15
  );

  // Keyboard word input - allows typing words directly instead of swiping
  const keyboardInput = useKeyboardWordInput({
    grid,
    language,
    gameLanguage: language,
    enabled: !state.isGameOver,
    onWordSubmit: actions.handleWordSubmit,
    minWordLength: 3,
  });

  // Hide bottom navigation during active gameplay
  useEffect(() => {
    setIsInGame(isGameActive);
    return () => setIsInGame(false);
  }, [isGameActive, setIsInGame]);

  // Handle quit flow
  const handleQuitConfirm = () => {
    actions.setShowQuitConfirm(false);
    onQuit();
  };

  // Landscape layout
  if (isLandscape) {
    return (
      <SurvivalLandscapeLayout
        grid={grid}
        isGameOver={state.isGameOver}
        isProtected={isProtected}
        eliminatedLetters={state.eliminatedLetters}
        onWordSubmit={actions.handleWordSubmit}
        onWordChange={actions.handleWordChange}
        highlightedPath={keyboardInput.highlightedCells}
        lifePoints={state.lifePoints}
        isLifeGaining={state.isLifeGaining}
        attempts={state.attempts}
        liveScore={state.liveScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        currentHint={state.currentHint}
        targetWord={targetWord}
        accumulatedClues={state.accumulatedClues}
        revealedLetters={state.revealedLetters}
        gameDir={actions.gameDir}
        showQuitConfirm={state.showQuitConfirm}
        onQuitClick={() => actions.setShowQuitConfirm(true)}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={() => actions.setShowQuitConfirm(false)}
        feedbackType={state.feedbackType}
        feedbackMessage={state.feedbackMessage}
        onCloseToast={actions.closeToast}
        showSwipeTip={contextualGuidance.showSwipeTip}
        onDismissSwipeTip={contextualGuidance.dismissSwipeTip}
        activeNotifications={state.activeNotifications}
        onDismissNotification={actions.dismissNotification}
        t={t}
      />
    );
  }

  // Portrait layout
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden pb-safe"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Top bar */}
      <SurvivalHeader
        liveScore={state.liveScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        onQuitClick={() => actions.setShowQuitConfirm(true)}
        t={t}
      />

      {/* Target word clue boxes */}
      <SurvivalClueBoxes
        ref={actions.clueContainerRef}
        currentHint={state.currentHint}
        targetWord={targetWord}
        attempts={state.attempts}
        accumulatedClues={state.accumulatedClues}
        revealedLetters={state.revealedLetters}
        knownLetters={state.knownLetters}
        latestAttemptFeedback={state.latestAttemptFeedback}
        showFeedbackOverlay={state.showFeedbackOverlay}
        isClueGaining={state.isClueGaining}
        isProtected={isProtected}
        skipAnimations={skipAnimations}
        gameDir={actions.gameDir}
        t={t}
      />

      {/* Category and example hints (if unlocked) */}
      {state.showCategory && (
        <div className="text-[11px] bg-purple-50 dark:bg-purple-900/20 border border-purple-300 rounded px-2 py-0.5 max-w-3xl mx-auto w-full mb-0.5">
          <span className="font-bold">
            {t('wordHunt.survival.category')?.replace('{category}', state.category) ||
              `Category: ${state.category}`}
          </span>
        </div>
      )}
      {state.showExample && (
        <div className="text-[11px] bg-green-50 dark:bg-green-900/20 border border-green-300 rounded px-2 py-0.5 max-w-3xl mx-auto w-full mb-0.5">
          <span className="font-bold">{t('wordHunt.survival.exampleSentence') || 'Example:'}</span>{' '}
          {state.exampleSentence.replace(new RegExp(targetWord, 'gi'), '____')}
        </div>
      )}

      {/* Life bar */}
      <SurvivalLifeBar
        lifePoints={state.lifePoints}
        isGameOver={state.isGameOver}
        isLifeGaining={state.isLifeGaining}
        lifeGainAmount={state.lifeGainAmount}
        skipAnimations={skipAnimations}
        onLifeGainComplete={() => actions.setLifeGainAmount(null)}
      />

      {/* Game Grid */}
      <SurvivalGridSection
        grid={grid}
        isGameOver={state.isGameOver}
        isProtected={isProtected}
        eliminatedLetters={state.eliminatedLetters}
        onWordSubmit={actions.handleWordSubmit}
        onWordChange={actions.handleWordChange}
        highlightedPath={keyboardInput.highlightedCells}
        t={t}
      />

      {/* Swipe Tip Tooltip */}
      <SwipeTipTooltip
        isVisible={contextualGuidance.showSwipeTip}
        onDismiss={contextualGuidance.dismissSwipeTip}
        t={t}
      />

      {/* Keyboard Input Hint - Desktop only */}
      {!state.isGameOver && (
        <KeyboardHintTooltip
          delaySeconds={10}
          desktopOnly={true}
          t={t}
        />
      )}

      {/* Word Feedback Toast */}
      <WordFeedbackToast
        type={state.feedbackType}
        message={state.feedbackMessage}
        onClose={actions.closeToast}
      />

      {/* Auto-Clue Notifications */}
      <AnimatePresence>
        {state.activeNotifications.map((notification) => (
          <AutoClueNotification
            key={notification.id}
            clueType={notification.clueType}
            onDismiss={() => actions.dismissNotification(notification.id)}
            direction={actions.gameDir}
            t={t}
          />
        ))}
      </AnimatePresence>

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={state.showQuitConfirm}
        onOpenChange={(open) => actions.setShowQuitConfirm(open)}
        title={t('daily.quitConfirmTitle') || 'Quit Challenge?'}
        description={
          t('daily.quitConfirm') ||
          "If you quit, this will count as your attempt for today. You won't be able to try again until tomorrow."
        }
        confirmText={t('daily.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={handleQuitConfirm}
        variant="danger"
      />
    </motion.div>
  );
};

export default DailyWordHuntSurvival;
