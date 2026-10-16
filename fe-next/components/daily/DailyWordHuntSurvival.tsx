'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DiscoveredWordsList } from './DiscoveredWordsList';
import { AnimatePresence, m } from 'framer-motion';

const WordHuntEffectsCanvas = dynamic(
  () => import('./WordHuntEffectsCanvas'),
  { ssr: false }
);
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
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
  AutoClueNotification,
} from './survival';
import { HuntLeftRail, HuntRightRail } from './survival/HuntShellRails';
import { GameShell, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SurvivalExtraLifeModal } from './survival/SurvivalExtraLifeModal';
import { useWordHuntFx } from './survival/useWordHuntFx';
import { HuntPlayfield } from './survival/hunt/HuntPlayfield';
import { useHuntStage } from './survival/hunt/useHuntStage';
import { HuntSolveCelebration } from './survival/hunt/HuntSolveCelebration';
import { HuntHintSlots } from './survival/hunt/HuntHintSlots';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';
import { ModeCoach } from '@/components/tutorial/ModeCoach';

const EXTRA_LIFE_RESTORE_AMOUNT = 50;
const EXTRA_LIFE_COIN_COST = 50;

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
   * Quick Play only: other players' scores on this mode, shown as a live
   * standing in the practice header. Undefined for the daily challenge.
   */
  rivals?: Array<{ username: string; score: number }>;
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
  rivals,
  hideModeCoach = false,
  quitStaysOnPage = false,
}) => {
  const { t } = useLanguage();
  const inShell = useMediaQuery(SHELL_MEDIA);
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

  const fx = useWordHuntFx(state, skipAnimations);
  const { stage, live: onStageLive, release: onStageRelease } = useHuntStage({
    feedbackSeq: state.feedbackSeq,
    feedbackType: state.feedbackType,
    feedbackWord: state.feedbackWord,
  });

  const { handleWordSubmit, handleWordChange } = actions;
  const submitTypedWord = useCallback((word: string) => {
    onStageRelease(word, []);
    handleWordSubmit(word);
  }, [onStageRelease, handleWordSubmit]);

  const isGameActive = !state.isGameOver && state.lifePoints > 0;

  // Keyboard word input - allows typing words directly instead of swiping
  const keyboardInput = useKeyboardWordInput({
    grid,
    language,
    gameLanguage: language,
    enabled: !state.isGameOver,
    onWordSubmit: submitTypedWord,
    minWordLength: MIN_DISCOVERY_WORD_LENGTH,
    disablePathHighlighting: true,
  });

  const pixiOverlay =
    !skipAnimations && fx.canvasSize.width > 0 && fx.canvasSize.height > 0 ? (
      <WordHuntEffectsCanvas
        width={fx.canvasSize.width}
        height={fx.canvasSize.height}
        effects={fx.pixiEffects}
        onEffectsConsumed={fx.handleEffectsConsumed}
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

  const playfieldProps = {
    grid,
    isGameOver: state.isGameOver,
    eliminatedLetters: state.eliminatedLetters,
    onWordSubmit: handleWordSubmit,
    onWordChange: handleWordChange,
    stage,
    onLive: onStageLive,
    onRelease: onStageRelease,
    typedWord: keyboardInput.typedWord,
    feedbackMessage: state.feedbackMessage,
    discoveredWords: state.discoveredWords,
    calm: skipAnimations,
    t,
  };

  const celebration = fx.showTargetConfetti ? (
    <HuntSolveCelebration tier={fx.solveTier} onDone={fx.clearTargetConfetti} t={t} />
  ) : null;

  const notifications = (
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
  );

  const quitConfirm = (orientation: 'landscape' | 'portrait') => (
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
      analyticsExtras={{ orientation }}
    />
  );

  const coach = (
    <>
      {practice && !hideModeCoach && (
        <div className="px-1 pt-1 pb-2">
          <PracticeCoachTip mode="wordHunt" wordsFound={state.discoveredWords.length} />
        </div>
      )}
      {!practice && !hideModeCoach && <ModeCoach mode="wordHunt" />}
    </>
  );

  const lifeBar = (
    <SurvivalLifeBar
      lifePoints={state.lifePoints}
      isGameOver={state.isGameOver}
      isLifeGaining={state.isLifeGaining}
      lifeGainAmount={state.lifeGainAmount}
      skipAnimations={skipAnimations}
      onLifeGainComplete={handleLifeGainComplete}
    />
  );

  // One tree for every screen; on desktop the GameShell frames it with rails.
  // pt-3 ensures game header doesn't overlap with the sticky app header on mobile
  return (
    <GameShell
      mode="hunt"
      accent="yellow"
      left={
        <HuntLeftRail
          t={t}
          liveScore={state.liveScore}
          lifePoints={state.lifePoints}
          hintStage={state.hintStage}
          attempts={state.attempts}
          rivals={rivals}
          daily={puzzleDate ? { puzzleDate, language, currentPlayerId: currentPlayerId ?? null, currentGuestFingerprint: currentGuestFingerprint ?? null } : undefined}
        />
      }
      right={<HuntRightRail t={t} words={state.discoveredWords} />}
    >
    <div
      ref={fx.containerRef}
      className="relative flex-1 flex flex-col bg-neo-navy px-2 sm:px-4 overflow-x-clip overflow-y-auto pt-3 sm:pt-2 shell:p-0 shell:h-full shell:overflow-hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {pixiOverlay}
      <ScreenFlashOverlay trigger={fx.flashTrigger} colorClass={fx.flashColor} />
      {coach}

      <SurvivalHeader
        // On desktop the start rail already races the rivals.
        rivals={inShell ? undefined : rivals}
        selfUsername={t('mp.rivals.you')}
        liveScore={state.liveScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        onQuitClick={handleQuitClick}
        practice={practice}
        center={inShell ? lifeBar : undefined}
        t={t}
      />

      <div className={cn('shrink-0', fx.shakingClues && 'animate-neo-shake')}>
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
          matchesTargetLength={
            !state.isGameOver
            && (keyboardInput.typedWord || state.formedWord).length === targetWord.length
          }
          t={t}
        />
      </div>

      {/* The last word's result stays readable here; the board stage only flashes it. */}
      <div data-testid="hunt-feedback-row" className="shrink-0 h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {state.feedbackType && state.feedbackMessage && (
            <m.div
              key={state.feedbackSeq}
              data-testid="hunt-feedback-pill"
              data-type={state.feedbackType}
              role="status"
              initial={skipAnimations ? false : { opacity: 0, y: -6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'max-w-full truncate text-xs font-bold px-2.5 py-0.5 rounded-full',
                state.feedbackType === 'valid-word' || state.feedbackType === 'target-found'
                  ? 'bg-neo-lime/15 text-neo-lime'
                  : state.feedbackType === 'duplicate' || state.feedbackType === 'too-short' || state.feedbackType === 'too-long'
                    ? 'bg-neo-orange/15 text-neo-orange'
                    : 'bg-neo-red/15 text-neo-red',
              )}
            >
              {state.feedbackWord && (
                <span className="font-black uppercase tracking-wider me-1">{state.feedbackWord}</span>
              )}
              {state.feedbackMessage}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <HuntHintSlots
        showCategory={state.showCategory}
        category={state.category}
        showExample={state.showExample}
        exampleSentence={state.exampleSentence}
        targetWord={targetWord}
        t={t}
      />

      {!inShell && (
        <div data-testid="hunt-life-row" className="shrink-0 overflow-x-clip">
          {lifeBar}
        </div>
      )}

      <div className="relative flex-1 min-h-[220px] flex flex-col">
        <HuntPlayfield
          {...playfieldProps}
          size={inShell ? 'desktop' : 'phone'}
          stageOverlay={
            <>
              <span id={fx.rewardId} className="absolute left-1/2 top-8 pointer-events-none" />
              {celebration}
            </>
          }
        />
      </div>

      {/* Fixed height, not just a floor: the board is sized from what's left, so a
          slot that grows would shrink the board every time a word is found. */}
      <div className="shrink-0 min-h-[64px] h-[64px] overflow-hidden shell:hidden" data-testid="wordhunt-discovered-words-slot">
        {state.discoveredWords.length > 0 && <DiscoveredWordsList words={state.discoveredWords} t={t} />}
      </div>

      {notifications}
      {quitConfirm('portrait')}
      {extraLifeModal}
    </div>
    </GameShell>
  );
};

export default DailyWordHuntSurvival;
