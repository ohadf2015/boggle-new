'use client';

import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useContextualGuidance, useSwipeTipGuidanceTrigger } from '@/hooks/useContextualGuidance';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import SwipeTipTooltip from '@/components/game/SwipeTipTooltip';
import { WordFeedbackToast } from './WordFeedbackToast';

import type { LetterGrid, Language } from '@/types';
import type { SurvivalGameResult } from './survival/types';

import {
  useSurvivalGameLogic,
  SurvivalHeader,
  SurvivalLifeBar,
  SurvivalClueBoxes,
  SurvivalClueShop,
  SurvivalGridSection,
  SurvivalLandscapeLayout,
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
        lifePoints={state.lifePoints}
        isLifeGaining={state.isLifeGaining}
        attempts={state.attempts}
        clueTokens={state.clueTokens}
        showShop={state.showShop}
        showShopHint={state.showShopHint}
        isClueGaining={state.isClueGaining}
        onShopClick={() => {
          actions.setShowShop(!state.showShop);
          actions.setShowShopHint(false);
        }}
        onPurchase={actions.handlePurchase}
        onShopClose={() => actions.setShowShop(false)}
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
        clueTokens={state.clueTokens}
        showShop={state.showShop}
        showShopHint={state.showShopHint}
        onQuitClick={() => actions.setShowQuitConfirm(true)}
        onShopClick={() => {
          actions.setShowShop(!state.showShop);
          actions.setShowShopHint(false);
        }}
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
        t={t}
      />

      {/* Clue Shop Modal */}
      <SurvivalClueShop
        isOpen={state.showShop}
        clueTokens={state.clueTokens}
        onClose={() => actions.setShowShop(false)}
        onPurchase={actions.handlePurchase}
        t={t}
      />

      {/* Swipe Tip Tooltip */}
      <SwipeTipTooltip
        isVisible={contextualGuidance.showSwipeTip}
        onDismiss={contextualGuidance.dismissSwipeTip}
        t={t}
      />

      {/* Word Feedback Toast */}
      <WordFeedbackToast
        type={state.feedbackType}
        message={state.feedbackMessage}
        onClose={actions.closeToast}
      />

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
