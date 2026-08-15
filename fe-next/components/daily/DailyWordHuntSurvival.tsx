'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { DiscoveredWordsList } from './DiscoveredWordsList';
import { m, AnimatePresence } from 'framer-motion';
import type { WordHuntEffect } from './WordHuntEffectsCanvas';

const WordHuntEffectsCanvas = dynamic(
  () => import('./WordHuntEffectsCanvas'),
  { ssr: false }
);
import { useLanguage } from '@/contexts/LanguageContext';
import { wordHuntSolveTier, type WordHuntSolveTier } from '@/shared/utils/wordHuntScoring';
import { cn } from '@/lib/utils';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import { useKeyboardWordInput } from '@/hooks/useKeyboardWordInput';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { buildQuitDialogConfig } from './survival/quitDialogConfig';
import logger from '@/utils/logger';
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
import { ModeCoach } from '@/components/tutorial/ModeCoach';

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
  /**
   * Suppress ModeCoach FTUE and PracticeCoachTip (Quick Play arcade).
   * Independent of `practice` so life-drain can stay off without coach UI.
   */
  hideModeCoach?: boolean;
  /**
   * True when `onQuit` resets state and stays on this page (Quick Play)
   * instead of navigating away (standalone Daily Word Hunt). Flips the nav
   * guard's phantom-history handling below — see the `leaving` comment.
   */
  quitStaysOnPage?: boolean;
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
  hideModeCoach = false,
  quitStaysOnPage = false,
}) => {
  const { t } = useLanguage();
  const { isDesktop, isTv } = useDesktopLayout();
  const setIsInGame = useHideNavigation();

  // Performance optimization for low-end devices + player opt-out.
  // The in-game effects toggle (and OS reduced-motion) collapse onto the same
  // skipAnimations lever that already gates particles, flashes, and confetti.
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const [effectsReduced] = useReducedEffects();
  const skipAnimations = useMemo(
    () => isLowEnd || !enableComplexAnimations || effectsReduced,
    [isLowEnd, enableComplexAnimations, effectsReduced]
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
    // `leaving` tells the guard's teardown NOT to pop its phantom history entry:
    // confirming quit fires router.push('/daily') in the same handler, and a
    // go(-1) cleanup would race-cancel that push — black screen on native exit.
    // Quick Play's onQuit stays on this page instead, so it needs the phantom
    // popped (leaving=false) or every quit strands an extra history entry.
    leaving: quitting && !quitStaysOnPage,
    message: t('wordHunt.quitConfirmMessage'),
    onNavigationAttempt: () => {
      actions.setShowQuitConfirm(true);
      return false;
    },
  });

  const { variant: clueShakeVariant, trackExposure: trackClueShakeExposure } =
    useExperiment('exp-wordhunt-clue-shake-v1');
  const [shakingClues, setShakingClues] = useState(false);

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
  // Wordle-style solve escalation: the faster the solve, the grander the moment.
  const [solveTier, setSolveTier] = useState<WordHuntSolveTier | null>(null);
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
        if (!skipAnimations) {
          triggerReward('wordFound');
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
        if (!skipAnimations) {
          // Escalate by how few guesses it took (Wordle: GENIUS on guess 1).
          const tier = wordHuntSolveTier(state.attempts.filter((a) => !a.isDiscovery).length);
          setSolveTier(tier);
          triggerReward('levelUp');
          setShowTargetConfetti(true);
          setFlashColor(tier.tier <= 1 ? 'bg-neo-yellow/30' : 'bg-neo-lime/20');
          setFlashTrigger((n) => n + 1);
          pushEffect({ type: 'targetFound', x: cx, y: cy });
        }
      } else if (
        state.feedbackType === 'invalid-word' ||
        state.feedbackType === 'not-in-dictionary' ||
        state.feedbackType === 'not-on-board'
      ) {
        if (!skipAnimations) {
          pushEffect({ type: 'invalid', x: canvasSize.width / 2, y: canvasSize.height / 2 });
        }
        trackGrowthEvent('wordhunt_invalid_submitted', { feedbackType: state.feedbackType });
        trackClueShakeExposure();
        if (clueShakeVariant === 'clue-shake') {
          setShakingClues(true);
          setTimeout(() => setShakingClues(false), 500);
        }
      }
    }
    prevFeedbackForEffects.current = state.feedbackType;
  }, [
    state.feedbackType,
    state.lastScoreIncrement,
    state.attempts,
    triggerReward,
    skipAnimations,
    pushEffect,
    canvasSize.width,
    canvasSize.height,
    clueShakeVariant,
    trackClueShakeExposure,
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

  // Quit-confirmation copy, resolved defensively. A locale bundle that resolves
  // one of these keys to a non-string would otherwise make React throw during
  // render — and on this nav-hidden, guard-armed surface that throw presents as
  // a black, frozen screen (the "exit Daily in Hebrew → black screen" report).
  // buildQuitDialogConfig never throws: broken keys degrade to a generic config.
  // In Quick Play (practice mode), use Word Hunt copy; in daily challenge use ad-gated copy.
  const quitDialog = useMemo(() =>
    buildQuitDialogConfig(t, practice ? {
      titleKey: 'wordHunt.quitConfirmTitle',
      descriptionKey: 'wordHunt.quitConfirmMessage',
      confirmKey: 'daily.imSure',
      cancelKey: 'common.cancel',
    } : undefined),
    [t, practice]
  );

  // Handle quit flow
  const handleQuitConfirm = () => {
    // Close the dialog and disarm the guard FIRST and unconditionally, so its
    // teardown can't fire the history.go(-1) that blanks a Capacitor WebView.
    actions.setShowQuitConfirm(false);
    setQuitting(true); // disarm guard before the exit nav
    try {
      onQuit();
    } catch (err) {
      // A throw in the exit bookkeeping (analytics/nav) must never strand the
      // player on a nav-hidden game screen. Force a hard navigation to the
      // daily hub as a last-resort escape hatch instead of freezing black.
      logger.error('Daily quit handler threw; forcing navigation to hub', err);
      if (typeof window !== 'undefined') {
        window.location.assign(`/${language}/daily`);
      }
    }
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
      language={language}
    />
  ) : null;

  // Desktop/TV layout (3-column with sidebars)
  if ((isDesktop || isTv) && puzzleDate) {
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {pixiOverlay}
        <ScreenFlashOverlay trigger={flashTrigger} colorClass={flashColor} />
        {practice && !hideModeCoach && (
          <div className="absolute top-2 inset-x-0 z-30 px-3 pointer-events-auto">
            <PracticeCoachTip mode="wordHunt" wordsFound={state.discoveredWords.length} />
          </div>
        )}
        {!practice && !hideModeCoach && <ModeCoach mode="wordHunt" />}
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
          practice={practice}
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
              language={language}
            />
          ))}
        </AnimatePresence>

        {/* Quit Confirmation Dialog */}
        <ConfirmationDialog
          open={state.showQuitConfirm}
          onOpenChange={(open) => actions.setShowQuitConfirm(open)}
          title={quitDialog.title}
          description={quitDialog.description}
          confirmText={quitDialog.confirmText}
          cancelText={quitDialog.cancelText}
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
      {practice && !hideModeCoach && (
        <div className="px-1 pt-1 pb-2">
          <PracticeCoachTip mode="wordHunt" wordsFound={state.discoveredWords.length} />
        </div>
      )}
      {!practice && !hideModeCoach && <ModeCoach mode="wordHunt" />}

      {/* Top bar */}
      <SurvivalHeader
        liveScore={state.liveScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        onQuitClick={handleQuitClick}
        practice={practice}
        t={t}
      />

      {/* Target word clue boxes + inline feedback */}
      <div className={cn('shrink-0', shakingClues && 'animate-neo-shake')}>
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
                    ? 'bg-neo-lime/15 text-neo-lime drop-shadow-[0_0_8px_rgba(191,255,0,0.4)]'
                    : state.feedbackType === 'duplicate'
                      ? 'bg-neo-orange/15 text-neo-orange drop-shadow-[0_0_8px_rgba(255,107,53,0.35)]'
                      : state.feedbackType === 'target-found'
                        ? 'bg-neo-lime/20 text-neo-lime drop-shadow-[0_0_12px_rgba(191,255,0,0.5)]'
                        : 'bg-neo-red/15 text-neo-red drop-shadow-[0_0_8px_rgba(255,51,102,0.35)]'
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
          {/* Full confetti explosion when target word is found — escalated for
              a fast solve (Wordle-style: bigger burst + "GENIUS!" the fewer the guesses). */}
          {showTargetConfetti && (
            <InlineConfetti
              size="lg"
              duration={solveTier && solveTier.tier <= 1 ? 3500 : 2500}
              onComplete={() => { setShowTargetConfetti(false); setSolveTier(null); }}
            />
          )}
          {showTargetConfetti && solveTier && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <m.span
                initial={{ scale: 0.4, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 14 }}
                className={cn(
                  'px-5 py-2 rounded-neo border-3 border-neo-black shadow-hard-lg font-neo-display font-black uppercase tracking-wider',
                  solveTier.tier <= 1
                    ? 'text-2xl sm:text-4xl bg-neo-yellow text-neo-black'
                    : 'text-xl sm:text-2xl bg-neo-lime text-neo-black',
                )}
              >
                {t(solveTier.labelKey)}
              </m.span>
            </div>
          )}
        </div>
      </div>

      {/* Category and example hints (if unlocked) — reserved slots so unlocking
          a hint mid-round doesn't shift the grid below (Class-5 layout shift). */}
      <div className="min-h-[22px] mb-0.5" data-testid="wordhunt-category-slot">
        {state.showCategory && (
          <div className="text-[11px] bg-neo-purple/15 border border-neo-purple/50 rounded px-2 py-0.5 max-w-3xl mx-auto w-full text-neo-white/90">
            <span className="font-bold">
              {t('wordHunt.survival.category')?.replace('{category}', state.category) ||
                state.category}
            </span>
          </div>
        )}
      </div>
      <div className="min-h-[22px] mb-0.5" data-testid="wordhunt-example-slot">
        {state.showExample && (
          <div className="text-[11px] bg-neo-lime/15 border border-neo-lime/50 rounded px-2 py-0.5 max-w-3xl mx-auto w-full text-neo-white/90">
            <span className="font-bold">{t('wordHunt.survival.exampleSentence')}</span>{' '}
            {state.exampleSentence.replace(new RegExp(targetWord, 'gi'), '____')}
          </div>
        )}
      </div>

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

      {/* Mobile: discovered words list with obfuscate toggle. Reserved slot so the
          first word found doesn't shrink the flex-1 grid above it mid-round. */}
      <div className="shrink-0 min-h-[64px]" data-testid="wordhunt-discovered-words-slot">
        {state.discoveredWords.length > 0 && (
          <DiscoveredWordsList
            words={state.discoveredWords}
            t={t}
          />
        )}
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
            language={language}
          />
        ))}
      </AnimatePresence>

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={state.showQuitConfirm}
        onOpenChange={(open) => actions.setShowQuitConfirm(open)}
        title={quitDialog.title}
        description={quitDialog.description}
        confirmText={quitDialog.confirmText}
        cancelText={quitDialog.cancelText}
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
