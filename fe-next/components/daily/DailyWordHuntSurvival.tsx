'use client';

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DiscoveredWordsList } from './DiscoveredWordsList';
import { AnimatePresence } from 'framer-motion';

const WordHuntEffectsCanvas = dynamic(
  () => import('./WordHuntEffectsCanvas'),
  { ssr: false }
);
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
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
import { useSurvivalExtraLife, EXTRA_LIFE_RESTORE_AMOUNT, EXTRA_LIFE_COIN_COST } from './survival/useSurvivalExtraLife';
import { useWordHuntFx } from './survival/useWordHuntFx';
import { HuntPlayfield } from './survival/hunt/HuntPlayfield';
import { useHuntStage } from './survival/hunt/useHuntStage';
import { useLiveWord } from './survival/hunt/liveWord';
import { HuntFinishOverlay } from './survival/hunt/HuntFinishOverlay';
import { HuntFeedbackPill } from './survival/hunt/HuntFeedbackPill';
import { wordHuntSolveTier } from '@/shared/utils/wordHuntScoring';
import { HuntHintSlots } from './survival/hunt/HuntHintSlots';
import { HuntRoundClock } from './survival/hunt/HuntRoundClock';
import { useGameTimer } from '@/hooks/useGameTimer';
import { calculateWordScore } from '@/shared/utils/scoring';
import PracticeCoachTip from '@/components/practice/PracticeCoachTip';
import { useStarterGuide } from './survival/hunt/useStarterGuide';
import { isNewDailyPlayer } from '@/utils/trainingProgressStorage';
import { NEW_PLAYER_THRESHOLD } from './survival/constants';
import { ModeCoach } from '@/components/tutorial/ModeCoach';

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
  /**
   * Quick Play: the round lasts this many seconds. A clock takes the life
   * bar's place and the round ends unsolved when it runs out. Undefined for
   * the daily challenge, which is life-drain survival with no clock.
   */
  timeLimitSec?: number;
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
  timeLimitSec,
}) => {
  const { t } = useLanguage();
  const inShell = useMediaQuery(SHELL_MEDIA);
  const setIsInGame = useHideNavigation();

  // Two levers. `calm` is motion the player asked to stop (the in-game effects
  // toggle or the OS reduced-motion setting): the board, word stage, feedback pill
  // and finish all hold still. `skipAnimations` adds the device tier on top and only
  // drops the heavy layers (particles, flashes, confetti, framer extras). Phones are
  // flagged low-end far more often (Low Power Mode / battery saver caps frames at
  // 30fps and trips the runtime frame watch; Data Saver and 2GB phones trip the
  // static check), and the tile lift, path pop, pill, clue flips, life bar and
  // screen flash are cheap animations, so a low-end flag must not freeze them.
  const { isLowEnd, enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const [effectsReduced] = useReducedEffects();
  const calm = effectsReduced || prefersReducedMotion;
  const skipAnimations = useMemo(
    () => calm || isLowEnd || !enableComplexAnimations,
    [calm, isLowEnd, enableComplexAnimations]
  );

  const extraLife = useSurvivalExtraLife({ practice });
  const { rescueMethodRef } = extraLife;

  const handleInnerComplete = React.useCallback(
    (result: SurvivalGameResult) => onComplete(result, rescueMethodRef.current),
    [onComplete, rescueMethodRef],
  );

  const timed = typeof timeLimitSec === 'number' && timeLimitSec > 0;
  // A player's first daily runs start gently: no drain before the first word, misses cost no
  // life, a word to trace when stuck. Read once: finishing this run must not flip it mid-game.
  const [gentle] = useState(() => !timed && isNewDailyPlayer(NEW_PLAYER_THRESHOLD));

  // Game logic hook
  const [state, actions] = useSurvivalGameLogic({
    grid,
    puzzleNumber,
    language,
    targetWord,
    onComplete: handleInnerComplete,
    t,
    deferGameOver: extraLife.offerOpen,
    disableLifeDrain: practice,
    gentleStart: gentle,
  });
  extraLife.restoreRef.current = actions.restoreLife;

  const { endRound } = actions;
  const roundClock = useGameTimer({
    initialTime: timed ? timeLimitSec : 0,
    autoStart: timed,
    // Stops on game over; holds while the quit dialog asks, like the life drain.
    isPaused: !timed || state.isGameOver || state.showQuitConfirm,
    onTimeUp: endRound,
  });

  const extraLifeModalOpen = extraLife.offerOpen && state.lifePoints === 0 && !state.isGameOver;

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

  const fx = useWordHuntFx(state, skipAnimations, calm);
  const { stage, live: onStageLive, release: onStageRelease, liveWord } = useHuntStage({
    feedbackSeq: state.feedbackSeq,
    feedbackType: state.feedbackType,
    feedbackWord: state.feedbackWord,
  });

  const { handleWordSubmit } = actions;
  const targetLength = targetWord.length;
  const swipeMatchesTarget = useLiveWord(liveWord, (w) => w.length === targetLength);
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
      onRestore={extraLife.onAdRestore}
      onDecline={extraLife.onDecline}
      coinCost={EXTRA_LIFE_COIN_COST}
      canAffordCoinRestore={extraLife.canAffordCoinRestore}
      onCoinRestore={extraLife.onCoinRestore}
      coinPending={extraLife.coinPending}
      t={t}
      language={language}
    />
  ) : null;

  const foundWords = useMemo(() => state.discoveredWords.map((d) => d.word), [state.discoveredWords]);
  const guide = useStarterGuide({
    enabled: gentle && !state.isGameOver,
    grid,
    language,
    targetLength: targetWord.length,
    foundWords,
    feedbackSeq: state.feedbackSeq,
    feedbackType: state.feedbackType,
    t,
  });

  const playfieldProps = {
    grid,
    isGameOver: state.isGameOver,
    eliminatedLetters: state.eliminatedLetters,
    onWordSubmit: handleWordSubmit,
    liveWord,
    stage,
    onLive: onStageLive,
    onRelease: onStageRelease,
    typedWord: keyboardInput.typedWord,
    feedbackMessage: state.feedbackMessage,
    discoveredWords: state.discoveredWords,
    calm,
    guide,
    t,
  };

  const rewardAnchor = useMemo(
    () => <span id={fx.rewardId} className="absolute left-1/2 top-8 pointer-events-none" />,
    [fx.rewardId],
  );

  const finishOverlay = state.isGameOver ? (
    <HuntFinishOverlay
      outcome={state.hasWon ? 'win' : 'loss'}
      targetWord={targetWord}
      language={language}
      tier={state.hasWon ? wordHuntSolveTier(state.attempts.filter((a) => !a.isDiscovery).length) : null}
      calm={calm}
      onSkip={actions.skipFinish}
      sourcePath={state.hasWon ? stage.path : undefined}
      timedOut={timed && !state.hasWon && roundClock.remainingTime <= 0}
      t={t}
    />
  ) : null;

  const notifications = (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence mode="popLayout">
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
    </div>
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
      skipAnimations={calm}
      onLifeGainComplete={handleLifeGainComplete}
    />
  );

  // The daily HUD projects the daily score (800 at the start, eroding with
  // misses), but a Quick Play round is scored as the sum of its words, and the
  // rivals it races are on that scale. Showing 800 against rivals' 168 put
  // every player "in the lead" before their first word.
  const roundScore = useMemo(
    () => state.discoveredWords.reduce((sum, d) => sum + calculateWordScore(d.word, 0), 0),
    [state.discoveredWords],
  );
  const shownScore = timed ? roundScore : state.liveScore;

  // A timed round has no life drain, so its bar would sit at 100 forever: the
  // clock takes that slot instead.
  const statusBar = timed ? (
    <HuntRoundClock
      remaining={roundClock.remainingTime}
      total={timeLimitSec ?? 0}
      label={t('gameShell.time')}
    />
  ) : lifeBar;

  // One tree for every screen; on desktop the GameShell frames it with rails.
  // pt-3 ensures game header doesn't overlap with the sticky app header on mobile
  return (
    <GameShell
      mode="hunt"
      accent="yellow"
      left={
        <HuntLeftRail
          t={t}
          liveScore={shownScore}
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
        liveScore={shownScore}
        lastScoreIncrement={state.lastScoreIncrement}
        isScoreAnimating={state.isScoreAnimating}
        onQuitClick={handleQuitClick}
        practice={practice}
        hideScore={gentle && state.discoveredWords.length === 0}
        center={inShell ? statusBar : undefined}
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
          skipAnimations={calm}
          gameDir={actions.gameDir}
          explainRules={!timed}
          matchesTargetLength={
            !state.isGameOver
            && (keyboardInput.typedWord ? keyboardInput.typedWord.length === targetWord.length : swipeMatchesTarget)
          }
          t={t}
        />
      </div>

      {/* A timed round needs every pixel for the board: the word stage above
          the board already shows each verdict and its reason, and the hint
          rows only take room once a hint is actually showing. */}
      {!timed && (
        <HuntFeedbackPill
          seq={state.feedbackSeq}
          type={state.feedbackType}
          message={state.feedbackMessage}
          word={state.feedbackWord}
          calm={calm}
        />
      )}

      {(!timed || state.showCategory || state.showExample) && (
        <HuntHintSlots
          showCategory={state.showCategory}
          category={state.category}
          showExample={state.showExample}
          exampleSentence={state.exampleSentence}
          targetWord={targetWord}
          t={t}
        />
      )}

      {!inShell && (
        <div data-testid={timed ? 'hunt-clock-row' : 'hunt-life-row'} className="shrink-0 overflow-x-clip">
          {statusBar}
        </div>
      )}

      <div className="relative flex-1 min-h-[220px] flex flex-col">
        <HuntPlayfield
          {...playfieldProps}
          size={inShell ? 'desktop' : 'phone'}
          stageOverlay={rewardAnchor}
        />
        {finishOverlay}
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
