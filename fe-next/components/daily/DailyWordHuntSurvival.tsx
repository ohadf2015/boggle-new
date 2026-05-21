'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DiscoveredWordsList } from './DiscoveredWordsList';
import { m, AnimatePresence } from 'framer-motion';
import type { WordHuntEffect } from './WordHuntEffectsCanvas';

const WordHuntEffectsCanvas = dynamic(
  () => import('./WordHuntEffectsCanvas'),
  { ssr: false }
);
import { useLanguage } from '@/contexts/LanguageContext';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import WordFormingArea from '@/components/game/WordFormingArea';
import { useGameRewards } from '@/hooks/useGameRewards';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';

import type { LetterGrid, Language } from '@/types';
import type { SurvivalGameResult } from './survival/types';
import type { WordHuntRescueMethod } from './analytics/wordHuntCompletePayload';
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
import { SurvivalExtraLifeModal } from './survival/SurvivalExtraLifeModal';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';

const EXTRA_LIFE_RESTORE_AMOUNT = 50;
const EXTRA_LIFE_COIN_COST = 50;

// Re-export types for backwards compatibility
export type { WordDiscovery, TargetAttempt, SurvivalGameResult } from './survival/types';

interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult, rescueMethod?: WordHuntRescueMethod) => void;
  onQuit: () => void;
  /** Puzzle date string for desktop leaderboard sidebar */
  puzzleDate?: string;
  /** Authenticated player ID for highlighting in leaderboard */
  currentPlayerId?: string | null;
  /** Guest fingerprint for highlighting in leaderboard */
  currentGuestFingerprint?: string | null;
  /** Practice mode: suppress life drain + extra-life monetization. */
  practice?: boolean;
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
  practice = false,
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

  // Extra-life offer state (rewarded ad OR coin-spend on life=0, single-use per run)
  const hasUsedExtraLifeRef = useRef(false);
  const rescueMethodRef = useRef<WordHuntRescueMethod>(null);
  const [extraLifeDeclined, setExtraLifeDeclined] = useState(false);
  const hasRealAdProvider = useHasRealAdProvider();
  const { canAfford, spendCoins } = useCoinsFromContext();
  const canAffordCoinRestore = canAfford(EXTRA_LIFE_COIN_COST);
  // Practice runs never bottom out on life, so the rescue prompt would never fire —
  // gate it explicitly so we don't surface monetization in a tutorial flow.
  const hasRescueAvailable = !practice && (hasRealAdProvider || canAffordCoinRestore);

  const handleInnerComplete = React.useCallback(
    (result: SurvivalGameResult) => onComplete(result, rescueMethodRef.current),
    [onComplete],
  );

  // Game logic hook
  const [state, actions] = useSurvivalGameLogic({
    grid,
    puzzleNumber,
    language,
    targetWord,
    onComplete: handleInnerComplete,
    t,
    deferGameOver:
      hasRescueAvailable && !hasUsedExtraLifeRef.current && !extraLifeDeclined,
    disableLifeDrain: practice,
  });

  const extraLifeModalOpen =
    hasRescueAvailable
    && !hasUsedExtraLifeRef.current
    && !extraLifeDeclined
    && state.lifePoints === 0
    && !state.isGameOver;

  const handleExtraLifeAccept = () => {
    hasUsedExtraLifeRef.current = true;
    rescueMethodRef.current = 'ad';
    actions.restoreLife(EXTRA_LIFE_RESTORE_AMOUNT);
  };

  const handleExtraLifeDecline = () => {
    setExtraLifeDeclined(true);
  };

  const handleExtraLifeCoinAccept = async () => {
    const ok = await spendCoins(
      EXTRA_LIFE_COIN_COST,
      'Daily Survival Extra Life',
      { placement: 'daily_survival_extra_life_coin' },
    );
    if (ok) {
      hasUsedExtraLifeRef.current = true;
      rescueMethodRef.current = 'coin';
      actions.restoreLife(EXTRA_LIFE_RESTORE_AMOUNT);
    }
  };

  // Disarm the navigation guard the instant the player confirms a quit, so its
  // beforeunload/popstate handlers don't fire during the exit nav (black-screen race).
  const [quitting, setQuitting] = useState(false);

  // Navigation guard
  useNavigationGuard({
    enabled: !state.isGameOver && !quitting,
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

  // PixiJS effects layer — queue-drain pattern
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [pixiEffects, setPixiEffects] = useState<WordHuntEffect[]>([]);

  const pushEffect = useCallback((effect: WordHuntEffect) => {
    setPixiEffects((prev) => [...prev, effect]);
  }, []);
  const handleEffectsConsumed = useCallback(() => {
    setPixiEffects([]);
  }, []);

  useEffect(() => {
    if (skipAnimations) return;
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [skipAnimations]);

  // Trigger effects on feedback type changes
  const prevFeedbackForEffects = useRef(state.feedbackType);
  useEffect(() => {
    if (state.feedbackType && state.feedbackType !== prevFeedbackForEffects.current) {
      const cx = canvasSize.width / 2;
      const cy = canvasSize.height / 2;
      if (state.feedbackType === 'valid-word') {
        triggerReward('wordFound');
        if (!skipAnimations) {
          setFlashColor('bg-green-400/15');
          setFlashTrigger((n) => n + 1);
          pushEffect({
            type: 'wordValid',
            x: cx,
            y: cy,
            points: state.lastScoreIncrement ?? 1,
          });
        }
      } else if (state.feedbackType === 'target-found') {
        triggerReward('levelUp');
        setShowTargetConfetti(true);
        if (!skipAnimations) {
          setFlashColor('bg-neo-lime/20');
          setFlashTrigger((n) => n + 1);
          pushEffect({ type: 'targetFound', x: cx, y: cy });
        }
      } else if (
        !skipAnimations &&
        (state.feedbackType === 'invalid-word' ||
          state.feedbackType === 'not-in-dictionary' ||
          state.feedbackType === 'not-on-board')
      ) {
        pushEffect({ type: 'invalid', x: canvasSize.width / 2, y: canvasSize.height / 2 });
      }
    }
    prevFeedbackForEffects.current = state.feedbackType;
  }, [
    state.feedbackType,
    state.lastScoreIncrement,
    triggerReward,
    skipAnimations,
    pushEffect,
    canvasSize.width,
    canvasSize.height,
  ]);

  // Life delta watcher — gain / drop / lowLife
  const prevLifePointsRef = useRef(state.lifePoints);
  const lowLifeFiredRef = useRef(false);
  useEffect(() => {
    if (skipAnimations) {
      prevLifePointsRef.current = state.lifePoints;
      return;
    }
    const prev = prevLifePointsRef.current;
    const curr = state.lifePoints;
    if (curr > prev) {
      pushEffect({ type: 'lifeGain', amount: curr - prev });
    } else if (curr < prev) {
      pushEffect({ type: 'lifeDrop', amount: prev - curr });
    }
    if (curr > 0 && curr <= 25 && !lowLifeFiredRef.current) {
      pushEffect({ type: 'lowLife' });
      lowLifeFiredRef.current = true;
    } else if (curr > 25 && lowLifeFiredRef.current) {
      lowLifeFiredRef.current = false;
    }
    prevLifePointsRef.current = curr;
  }, [state.lifePoints, skipAnimations, pushEffect]);

  // Letter elimination watcher — push effect on each new eliminated letter
  const prevEliminatedCountRef = useRef(state.eliminatedLetters.size);
  useEffect(() => {
    if (skipAnimations) {
      prevEliminatedCountRef.current = state.eliminatedLetters.size;
      return;
    }
    const prev = prevEliminatedCountRef.current;
    const curr = state.eliminatedLetters.size;
    if (curr > prev) {
      pushEffect({
        type: 'letterEliminated',
        x: canvasSize.width / 2,
        y: canvasSize.height * 0.6,
      });
    }
    prevEliminatedCountRef.current = curr;
  }, [state.eliminatedLetters.size, skipAnimations, pushEffect, canvasSize.width, canvasSize.height]);

  // Clue-gain watcher — fire on rising edge
  const prevClueGainingRef = useRef(state.isClueGaining);
  useEffect(() => {
    if (!skipAnimations && state.isClueGaining && !prevClueGainingRef.current) {
      pushEffect({ type: 'clueGain' });
    }
    prevClueGainingRef.current = state.isClueGaining;
  }, [state.isClueGaining, skipAnimations, pushEffect]);

  // Game end watcher — gameWon / gameLost
  const gameEndFiredRef = useRef<'won' | 'lost' | null>(null);
  useEffect(() => {
    if (skipAnimations) return;
    if (state.hasWon && gameEndFiredRef.current !== 'won') {
      pushEffect({ type: 'gameWon', score: state.liveScore });
      gameEndFiredRef.current = 'won';
    } else if (state.isGameOver && !state.hasWon && gameEndFiredRef.current !== 'lost') {
      pushEffect({ type: 'gameLost' });
      gameEndFiredRef.current = 'lost';
    }
  }, [state.hasWon, state.isGameOver, state.liveScore, skipAnimations, pushEffect]);

  const pixiOverlay =
    !skipAnimations && canvasSize.width > 0 && canvasSize.height > 0 ? (
      <WordHuntEffectsCanvas
        width={canvasSize.width}
        height={canvasSize.height}
        effects={pixiEffects}
        onEffectsConsumed={handleEffectsConsumed}
      />
    ) : null;

  // Hide bottom navigation during active gameplay
  useEffect(() => {
    setIsInGame(isGameActive);
    return () => setIsInGame(false);
  }, [isGameActive, setIsInGame]);

  // Handle quit flow
  const handleQuitConfirm = () => {
    actions.setShowQuitConfirm(false);
    setQuitting(true); // disarm guard before the exit nav
    onQuit();
  };

  // Stable callbacks for SurvivalDesktopLayout — inline arrows broke the memo()
  // wrap on the layout, so every life-drain tick re-rendered the whole 3-column
  // tree (and through it, the grid). The setters are individually useCallback'd
  // in useSurvivalGameLogic; destructure to give exhaustive-deps a clean signal.
  const { setLifeGainAmount, setShowQuitConfirm } = actions;
  const handleLifeGainComplete = useCallback(() => {
    setLifeGainAmount(null);
  }, [setLifeGainAmount]);
  const handleQuitClick = useCallback(() => {
    setShowQuitConfirm(true);
  }, [setShowQuitConfirm]);

  const extraLifeModal = extraLifeModalOpen ? (
    <SurvivalExtraLifeModal
      isOpen
      restoreAmount={EXTRA_LIFE_RESTORE_AMOUNT}
      onRestore={handleExtraLifeAccept}
      onDecline={handleExtraLifeDecline}
      coinCost={EXTRA_LIFE_COIN_COST}
      canAffordCoinRestore={canAffordCoinRestore}
      onCoinRestore={handleExtraLifeCoinAccept}
      t={t}
    />
  ) : null;

  // Desktop/TV layout (3-column with sidebars)
  if ((isDesktop || isTv) && puzzleDate) {
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {pixiOverlay}
        <ScreenFlashOverlay trigger={flashTrigger} colorClass={flashColor} />
        {practice && (
          <div className="absolute top-2 inset-x-0 z-30 px-3 pointer-events-auto">
            <PracticeCoachTip mode="wordHunt" wordsFound={state.discoveredWords.length} />
          </div>
        )}
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
          onLifeGainComplete={handleLifeGainComplete}
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
          onQuitClick={handleQuitClick}
          t={t}
        />

        {/* Word Feedback — inline WordFormingArea */}
        <div className="fixed bottom-[calc(1rem+var(--admob-banner-height,0px))] left-1/2 -translate-x-1/2 z-40">
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
          analyticsId="daily_survival_quit_confirm"
          analyticsExtras={{ orientation: 'landscape' }}
        />

        {extraLifeModal}
      </div>
    );
  }

  // Portrait/responsive layout
  // pt-3 ensures game header doesn't overlap with the sticky app header on mobile
  return (
    <m.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex-1 flex flex-col p-2 sm:p-4 overflow-x-clip overflow-y-auto pb-safe pt-3 sm:pt-2"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      } as React.CSSProperties}
    >
      {pixiOverlay}
      {/* Subtle screen flash on word discovery */}
      <ScreenFlashOverlay trigger={flashTrigger} colorClass={flashColor} />

      {/* Practice-mode coaching strip — auto-hides on first discovery. */}
      {practice && (
        <div className="px-1 pt-1 pb-2">
          <PracticeCoachTip mode="wordHunt" wordsFound={state.discoveredWords.length} />
        </div>
      )}

      {/* Top bar */}
      <SurvivalHeader
        liveScore={state.liveScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        onQuitClick={handleQuitClick}
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
              <m.div
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
                {state.feedbackWord && state.feedbackType === 'valid-word' && (
                  <span className="font-black uppercase tracking-wider me-1">{state.feedbackWord}</span>
                )}
                {state.feedbackMessage}
                {/* Sparkle burst on positive feedback */}
                {(state.feedbackType === 'valid-word' || state.feedbackType === 'target-found') && (
                  <span key={feedbackKeyRef.current} className="sparkle-burst" />
                )}
              </m.div>
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
          onLifeGainComplete={handleLifeGainComplete}
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

      {/* Mobile: discovered words list with obfuscate toggle */}
      {state.discoveredWords.length > 0 && (
        <DiscoveredWordsList
          words={state.discoveredWords}
          t={t}
        />
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
          "Your progress won't be saved. You'll need to watch an ad to play again today."
        }
        confirmText={t('daily.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={handleQuitConfirm}
        variant="danger"
        analyticsId="daily_survival_quit_confirm"
        analyticsExtras={{ orientation: 'portrait' }}
      />

      {extraLifeModal}
    </m.div>
  );
};

export default DailyWordHuntSurvival;
