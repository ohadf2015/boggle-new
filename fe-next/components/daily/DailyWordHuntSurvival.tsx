'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useGameRewards } from '@/hooks/useGameRewards';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';

import type { LetterGrid, Language } from '@/types';
import type { SurvivalGameResult } from './survival/types';
import { MIN_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';

import {
  useSurvivalGameLogic,
  SurvivalHeader,
  SurvivalLifeBar,
  SurvivalClueBoxes,
  SurvivalGridSection,
  AutoClueNotification,
} from './survival';
import { SurvivalDesktopLayout } from './survival/SurvivalDesktopLayout';

// Re-export types for backwards compatibility
export type { WordDiscovery, TargetAttempt, SurvivalGameResult } from './survival/types';

interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  onQuit: () => void;
  /** Puzzle date string for desktop leaderboard sidebar */
  puzzleDate?: string;
  /** Authenticated player ID for highlighting in leaderboard */
  currentPlayerId?: string | null;
  /** Guest fingerprint for highlighting in leaderboard */
  currentGuestFingerprint?: string | null;
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
  puzzleDate,
  currentPlayerId,
  currentGuestFingerprint,
}) => {
  const { t } = useLanguage();
  const { isDesktop, isTv } = useDesktopLayout();
  const setIsInGame = useHideNavigation();

  // Performance optimization for low-end devices
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipAnimations = useMemo(
    () => isLowEnd || !enableComplexAnimations,
    [isLowEnd, enableComplexAnimations]
  );

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
    message: t('wordHunt.quitConfirmMessage'),
    onNavigationAttempt: () => {
      actions.setShowQuitConfirm(true);
      return false;
    },
  });

  const feedbackKeyRef = useRef(0);
  const prevFeedbackRef = useRef(state.feedbackType);
  if (state.feedbackType && state.feedbackType !== prevFeedbackRef.current) {
    feedbackKeyRef.current += 1;
  }
  prevFeedbackRef.current = state.feedbackType;

  const isGameActive = !state.isGameOver && state.lifePoints > 0;

  // Keyboard word input - allows typing words directly instead of swiping
  const keyboardInput = useKeyboardWordInput({
    grid,
    language,
    gameLanguage: language,
    enabled: !state.isGameOver,
    onWordSubmit: actions.handleWordSubmit,
    minWordLength: MIN_DISCOVERY_WORD_LENGTH, // Accept 2+ letter words for discovery (target word min enforced separately)
    disablePathHighlighting: true,
  });

  // Micro-celebration effects (react-rewards confetti bursts)
  const { rewardId, triggerReward } = useGameRewards();
  const [showTargetConfetti, setShowTargetConfetti] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [flashColor, setFlashColor] = useState('bg-green-400/15');

  // Trigger effects on feedback type changes
  const prevFeedbackForEffects = useRef(state.feedbackType);
  useEffect(() => {
    if (state.feedbackType && state.feedbackType !== prevFeedbackForEffects.current) {
      if (state.feedbackType === 'valid-word') {
        triggerReward('wordFound');
        if (!skipAnimations) {
          setFlashColor('bg-green-400/15');
          setFlashTrigger((n) => n + 1);
        }
      } else if (state.feedbackType === 'target-found') {
        triggerReward('levelUp');
        setShowTargetConfetti(true);
        if (!skipAnimations) {
          setFlashColor('bg-neo-lime/20');
          setFlashTrigger((n) => n + 1);
        }
      }
    }
    prevFeedbackForEffects.current = state.feedbackType;
  }, [state.feedbackType, triggerReward, skipAnimations]);

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

  // Desktop/TV layout (3-column with sidebars)
  if ((isDesktop || isTv) && puzzleDate) {
    return (
      <>
        <ScreenFlashOverlay trigger={flashTrigger} colorClass={flashColor} />
        {/* react-rewards anchor — must exist in DOM for reward confetti to target */}
        <span id={rewardId} className="fixed top-1/2 left-1/2 pointer-events-none" />
        <SurvivalDesktopLayout
          isTv={isTv}
          grid={grid}
          isGameOver={state.isGameOver}
          eliminatedLetters={state.eliminatedLetters}
          onWordSubmit={actions.handleWordSubmit}
          onWordChange={actions.handleWordChange}
          highlightedPath={keyboardInput.highlightedCells}
          lifePoints={state.lifePoints}
          isLifeGaining={state.isLifeGaining}
          lifeGainAmount={state.lifeGainAmount}
          skipAnimations={skipAnimations}
          onLifeGainComplete={() => actions.setLifeGainAmount(null)}
          liveScore={state.liveScore}
          lastScoreIncrement={state.lastScoreIncrement}
          isScoreAnimating={state.isScoreAnimating}
          currentHint={state.currentHint}
          targetWord={targetWord}
          attempts={state.attempts}
          accumulatedClues={state.accumulatedClues}
          revealedLetters={state.revealedLetters}
          knownLetters={state.knownLetters}
          latestAttemptFeedback={state.latestAttemptFeedback}
          showFeedbackOverlay={state.showFeedbackOverlay}
          isClueGaining={state.isClueGaining}
          clueContainerRef={actions.clueContainerRef}
          gameDir={actions.gameDir}
          discoveredWords={state.discoveredWords}
          hintStage={state.hintStage}
          puzzleDate={puzzleDate}
          language={language}
          currentPlayerId={currentPlayerId ?? null}
          currentGuestFingerprint={currentGuestFingerprint ?? null}
          onQuitClick={() => actions.setShowQuitConfirm(true)}
          t={t}
        />

        {/* Word Feedback — inline WordFormingArea */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <WordFormingArea word={state.formedWord} letterCount={state.letterCount} feedback={state.wordFeedback} compact />
        </div>

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
          title={t('daily.quitConfirmTitle')}
          description={
            t('daily.quitConfirm') ||
            "If you quit, this will count as your attempt for today. You won't be able to try again until tomorrow."
          }
          confirmText={t('daily.imSure')}
          cancelText={t('common.cancel')}
          onConfirm={handleQuitConfirm}
          variant="danger"
        />
      </>
    );
  }

  // Portrait/responsive layout
  // pt-3 ensures game header doesn't overlap with the sticky app header on mobile
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col p-2 sm:p-4 overflow-x-clip overflow-y-auto pb-safe pt-3 sm:pt-2"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      } as React.CSSProperties}
    >
      {/* Subtle screen flash on word discovery */}
      <ScreenFlashOverlay trigger={flashTrigger} colorClass={flashColor} />

      {/* Top bar */}
      <SurvivalHeader
        liveScore={state.liveScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        onQuitClick={() => actions.setShowQuitConfirm(true)}
        t={t}
      />

      {/* Target word clue boxes + inline feedback */}
      <div className="shrink-0">
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
          skipAnimations={skipAnimations}
          gameDir={actions.gameDir}
          t={t}
        />

        {/* Minimal word feedback pill — shows life delta near clue boxes */}
        <div className="h-6 flex items-center justify-center relative">
          {/* react-rewards anchor — confetti bursts from this point */}
          <span id={rewardId} className="absolute inset-0 pointer-events-none" />
          <AnimatePresence mode="wait">
            {state.feedbackType && (
              <motion.div
                key={`${state.feedbackType}-${feedbackKeyRef.current}`}
                initial={{ opacity: 0, y: -8, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: [0.6, 1.08, 1] }}
                exit={{ opacity: 0, y: 6, scale: 0.7 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`relative text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  state.feedbackType === 'valid-word'
                    ? 'bg-green-500/15 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                    : state.feedbackType === 'duplicate'
                      ? 'bg-yellow-500/15 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                      : state.feedbackType === 'target-found'
                        ? 'bg-neo-lime/20 text-neo-lime drop-shadow-[0_0_12px_rgba(191,255,0,0.5)]'
                        : 'bg-red-500/15 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                }`}
              >
                {state.feedbackMessage}
                {/* Sparkle burst on positive feedback */}
                {(state.feedbackType === 'valid-word' || state.feedbackType === 'target-found') && (
                  <span key={feedbackKeyRef.current} className="sparkle-burst" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Full confetti explosion when target word is found */}
          {showTargetConfetti && (
            <InlineConfetti size="lg" duration={2500} onComplete={() => setShowTargetConfetti(false)} />
          )}
        </div>
      </div>

      {/* Category and example hints (if unlocked) */}
      {state.showCategory && (
        <div className="text-[11px] bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded px-2 py-0.5 max-w-3xl mx-auto w-full mb-0.5 text-purple-900 dark:text-purple-100">
          <span className="font-bold">
            {t('wordHunt.survival.category')?.replace('{category}', state.category) ||
              `Category: ${state.category}`}
          </span>
        </div>
      )}
      {state.showExample && (
        <div className="text-[11px] bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded px-2 py-0.5 max-w-3xl mx-auto w-full mb-0.5 text-green-900 dark:text-green-100">
          <span className="font-bold">{t('wordHunt.survival.exampleSentence')}</span>{' '}
          {state.exampleSentence.replace(new RegExp(targetWord, 'gi'), '____')}
        </div>
      )}

      {/* Life bar — overflow-x clips sideways particles, overflow-y visible for gain animation */}
      <div className="shrink-0 overflow-x-clip">
        <SurvivalLifeBar
          lifePoints={state.lifePoints}
          isGameOver={state.isGameOver}
          isLifeGaining={state.isLifeGaining}
          lifeGainAmount={state.lifeGainAmount}
          skipAnimations={skipAnimations}
          onLifeGainComplete={() => actions.setLifeGainAmount(null)}
        />
      </div>

      {/* Game Grid — flex-1 lets it fill remaining space; min-h-0 allows flex shrinking */}
      <div className="flex-1 min-h-0">
        <SurvivalGridSection
          grid={grid}
          isGameOver={state.isGameOver}
          eliminatedLetters={state.eliminatedLetters}
          onWordSubmit={actions.handleWordSubmit}
          onWordChange={actions.handleWordChange}
          highlightedPath={keyboardInput.highlightedCells}
          t={t}
        />
      </div>

      {/* Mobile: minimal word count badge (no expandable sheet — less intrusive) */}
      {puzzleDate && state.discoveredWords.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-neo-cream/60 font-bold">
          <span className="tabular-nums">{state.discoveredWords.length} {t('wordHunt.mobile.words')}</span>
        </div>
      )}

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
        title={t('daily.quitConfirmTitle')}
        description={
          t('daily.quitConfirm') ||
          "If you quit, this will count as your attempt for today. You won't be able to try again until tomorrow."
        }
        confirmText={t('daily.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={handleQuitConfirm}
        variant="danger"
      />
    </motion.div>
  );
};

export default DailyWordHuntSurvival;
