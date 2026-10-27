'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { buildQuitDialogConfig } from './survival/quitDialogConfig';
import logger from '@/utils/logger';
import WordWheelGame, { type WordWheelGameResult } from './WordWheelGame';
import WordWheelBoardEntrance from './wheel/WordWheelBoardEntrance';
import WheelTimeUpStamp, { shouldPlayFinishBeat } from './wheel/WheelTimeUpStamp';
import { DailyFlowChrome } from './flow/DailyFlowChrome';
import { useWordWheelLoad } from './wheel/useWordWheelLoad';
import { submitWordWheelDailyResult } from './wheel/submitWordWheelDailyResult';
import WordWheelResults from './WordWheelResults';
import ReadyLeaderboardPeek from './ReadyLeaderboardPeek';
import WordWheelReadyCard from './WordWheelReadyCard';
const TabbedDailyLeaderboard = dynamic(() => import('./TabbedDailyLeaderboard'), {
  ssr: false,
});
import { generateWordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';
import {
  getDailyChallengeDate,
  saveWordWheelResult,
  getDailyStreak,
  updateDailyStreak,
} from '@/utils/dailyChallenge';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { isCatchUpDate, shouldGateCatchUpBehindAd } from '@/utils/dailyChallenge/catchUp';
import type { Language } from '@/types';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fastValidateWord } from '@/hooks/fastValidateWord';
import { prewarmDictionary, hasWordInMemoryCache } from '@/hooks/useDictionaryCache';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import { useDailyModePlayed } from '@/hooks/useDailyModePlayed';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { isNative } from '@/utils/platform';
import PracticeBadge from '@/components/practice/PracticeBadge';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';

// Lazy-load PixiJS effects canvas (no SSR). Preloaded while the loader is up so it mounts with the board.
const loadEffectsCanvas = () => import('./WordWheelEffectsCanvas');
const WordWheelEffectsCanvas = dynamic(() => import('./WordWheelEffectsCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 pointer-events-none" aria-hidden />,
});

const WORD_WHEEL_DURATION = 120; // 2 minutes

// Always-on, phase-independent ambient backdrop: a navy-only gradient read as flat black on-device.
const STAGE_AMBIENT_BG =
  'radial-gradient(125% 75% at 50% -8%, rgba(191,255,0,0.18) 0%, transparent 58%),' +
  'radial-gradient(115% 70% at 50% 108%, rgba(0,255,255,0.14) 0%, transparent 58%),' +
  'radial-gradient(70% 55% at 85% 82%, rgba(139,92,246,0.12) 0%, transparent 62%),' +
  'radial-gradient(circle at 50% 42%, var(--neo-navy-elevated) 0%, var(--neo-navy) 55%, var(--neo-abyss) 100%)';

// ==========================================
// Word Wheel Challenge Orchestrator
// ==========================================

const WordWheelChallenge: React.FC = () => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isPractice = usePracticeFlag();
  const { setGameActive } = useSoundEffects();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const setIsInGame = useHideNavigation();
  const { isDesktop, isTv } = useDesktopLayout();

  // Catch-up: `?date=YYYY-MM-DD` launches a past daily within the 3-day window.
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const catchupDate = dateParam && isCatchUpDate(getDailyChallengeDate(), dateParam) ? dateParam : null;
  const isCatchup = !!catchupDate;

  /**
   * Bumped once the submit POST lands, to remount the results leaderboard.
   * The results screen shows immediately (the submit is deliberately not
   * awaited), so its first fetch races the write and comes back without this
   * player. Same pattern Word Hunt uses via `onSubmitSuccess`.
   */
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [effects, setEffects] = useState<WordWheelEffect[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Catch-up ad gate — mirrors DailyChallenge pattern. Per-date unlock so a
  // single ad watch covers the whole session for that date.
  const catchupAdUnlockedRef = useRef(false);

  const {
    phase, setPhase, puzzle, setPuzzle, gameResult, setGameResult, puzzleNumber, enterPlaying,
  } = useWordWheelLoad({
    language: language as Language,
    isPractice,
    catchupDate,
    isAuthenticated,
    authLoading,
    playerId: profile?.id,
    guestFingerprint,
    setGameActive,
    catchupAdUnlockedRef,
    preloadForPlay: loadEffectsCanvas,
  });

  // Mid-game exit. The Word Wheel had no exit affordance at all — the player
  // was trapped once the timer started (no top-nav back button, worst under
  // RTL). Tapping the in-HUD exit opens a confirm; confirming leaves for the
  // daily hub. Reuses the shared defensive quit-dialog config (never throws on
  // a bad locale bundle) with the ad-free "progress will be lost" message.
  const quitDialog = useMemo(
    () => buildQuitDialogConfig(t, {
      descriptionKey: 'wordHunt.quitConfirmMessage',
      fallback: { description: "Your progress won't be saved." },
    }),
    [t],
  );
  const handleExitClick = useCallback(() => setShowExitConfirm(true), []);
  const handleExitConfirm = useCallback(() => {
    setShowExitConfirm(false);
    try {
      router.push(`/${language}/daily`);
    } catch (err) {
      // Never let a nav throw strand the player on the nav-hidden game surface.
      logger.error('Word Wheel exit navigation failed; forcing hard nav', err);
      if (typeof window !== 'undefined') window.location.assign(`/${language}/daily`);
    }
  }, [router, language]);

  // Cross-promo gate: has the player finished today's Word Hunt (this language)?
  // Resolved localStorage-first, then server-of-record (cross-device) — so the
  // CTA flips to "Back to Daily Hub" even when this device never stored it.
  const hasPlayedWH = useDailyModePlayed('word-hunt', language as Language, {
    isAuthenticated,
    playerId: profile?.id,
    guestFingerprint,
    isPractice,
  });

  // Daily guest identity (utils/dailyChallenge/guestPlayer) — the SAME fingerprint
  // Word Hunt records guests under, so a guest's hunt + wheel rows merge on the
  // combined board and their own row is highlighted. Not the multiplayer guest
  // session id from utils/guestManager, which used to be read here.
  useEffect(() => {
    let cancelled = false;
    getGuestFingerprint().then((fp) => {
      if (!cancelled) setGuestFingerprint(fp || null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setIsInGame(phase === 'playing');
    return () => setIsInGame(false);
  }, [phase, setIsInGame]);

  const containerRef = useRef<HTMLDivElement>(null);
  const sizeObserverRef = useRef<ResizeObserver | null>(null);

  // Callback ref, not useEffect([]): the stage mounts after the loading branch, so a mount-time
  // read of the ref was null and the Pixi canvas stayed at its 400x600 seed (effects off-stage).
  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    sizeObserverRef.current?.disconnect();
    sizeObserverRef.current = null;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width === 0 || height === 0) return;
      setCanvasSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    sizeObserverRef.current = observer;
  }, []);

  useEffect(() => () => sizeObserverRef.current?.disconnect(), []);

  const handleValidateWord = useCallback(
    (word: string) => fastValidateWord(word, language as Language),
    [language]
  );
  const handleQuickVerdict = useCallback(
    (word: string) => hasWordInMemoryCache(word, language as Language),
    [language]
  );

  // Fullscreen game paths skip the global prewarm (PSI window), so warm on the first touch instead.
  useEffect(() => {
    if (phase !== 'ready') return;
    const warm = () => {
      void prewarmDictionary(language as Language);
      void loadEffectsCanvas().catch(() => {});
    };
    window.addEventListener('pointerdown', warm, { once: true, passive: true });
    return () => window.removeEventListener('pointerdown', warm);
  }, [phase, language]);

  const startPlaying = useCallback(() => {
    void prewarmDictionary(language as Language);
    enterPlaying();
  }, [enterPlaying, language]);

  // Rewarded ad for catch-up plays (native only; web degrades to free).
  const {
    showAd: showCatchUpAd,
    isAdAvailable: isCatchUpAdAvailable,
    isPlaceholderCooldown: isCatchUpPlaceholderCooldown,
  } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'catchup',
    onRewardEarned: () => {
      catchupAdUnlockedRef.current = true;
      startPlaying();
    },
    // Best-effort gate: on any non-reward outcome (skip / no-fill / stalled show
    // that hits the safety timeout) degrade to free play so the player isn't
    // stranded on the ready screen after the native ad Activity tears down.
    // Mirrors the web contract (which never gates). sessionSettled guarantees
    // exactly one terminal callback, so this can't double-start.
    onAdError: () => startPlaying(),
  });

  const handleStart = useCallback(() => {
    // Catch-up ad gate: playing a past day costs a rewarded ad on native.
    if (
      shouldGateCatchUpBehindAd({
        isCatchup,
        alreadyUnlocked: catchupAdUnlockedRef.current,
        isNative: isNative(),
        isAdAvailable: isCatchUpAdAvailable,
        isPlaceholderCooldown: isCatchUpPlaceholderCooldown,
      })
    ) {
      showCatchUpAd();
      return;
    }
    startPlaying();
  }, [isCatchup, isCatchUpAdAvailable, isCatchUpPlaceholderCooldown, showCatchUpAd, startPlaying]);

  const handleComplete = useCallback((result: WordWheelGameResult) => {
    setGameActive(false);
    setGameResult(result);

    // Practice mode: skip all persistence (no streak, no leaderboard, no localStorage)
    if (isPractice) {
      setPhase('completed');
      return;
    }

    const gameLang = language as Language;
    const date = catchupDate || getDailyChallengeDate();
    // Completing today's daily advances the streak — mirror Word Hunt, which is
    // the only mode that used to call this. Without it a player whose daily is the
    // Word Wheel fills the progress strip but their streak stays pinned at 0.
    // Streak tracking is for authenticated users only; catch-up plays of past
    // puzzles must not rewrite the live streak's last-played date.
    const streak =
      isAuthenticated && !isCatchup ? updateDailyStreak(date) : getDailyStreak();

    saveWordWheelResult({
      puzzleNumber,
      puzzleDate: date,
      language: gameLang,
      centerLetter: puzzle?.centerLetter || '',
      wordsFound: result.wordsFound,
      totalPossible: 0,
      score: result.score,
      timeSeconds: result.timeSeconds,
      streakDays: streak.currentStreak,
      completedAt: new Date().toISOString(),
    });

    void submitWordWheelDailyResult({
      result,
      date,
      puzzleNumber,
      language: gameLang,
      centerLetter: puzzle?.centerLetter,
      isAuthenticated,
      profile,
      guestFingerprint,
      isCatchup,
      streakDays: streak.currentStreak,
      onReconciled: setGameResult,
      onSettled: () => setLeaderboardKey(k => k + 1),
    });

    // Results wait for the buzzer beat; the run is already saved above.
    if (shouldPlayFinishBeat(result.timeSeconds)) setFinishing(true);
    else setPhase('completed');
  }, [language, puzzle, puzzleNumber, setGameActive, setGameResult, setPhase, isAuthenticated, profile, isPractice, catchupDate, isCatchup, guestFingerprint]);

  // Practice dead-end fix: results screen offers "spin another wheel" — fresh
  // RANDOM puzzle (the mount path seeds by date, so re-entering would serve the
  // identical wheel) and back to the ready screen. Practice-only.
  const handlePracticeAgain = useCallback(() => {
    const seed = Math.random().toString(36).slice(2);
    setPuzzle(generateWordWheelPuzzle(seed, language as Language));
    setGameResult(null);
    setPhase('ready');
  }, [language, setPuzzle, setGameResult, setPhase]);

  const finishBeatDone = useCallback(() => {
    setFinishing(false);
    setPhase('completed');
  }, [setPhase]);

  const handleEffect = useCallback((effect: WordWheelEffect) => {
    setEffects(prev => [...prev, effect]);
  }, []);

  const handleEffectsConsumed = useCallback(() => {
    setEffects([]);
  }, []);

  // ==========================================
  // Render
  // ==========================================

  if (phase === 'loading') {
    return (
      <div
        className="flex-1 flex items-center justify-center bg-neo-navy"
        style={{ background: STAGE_AMBIENT_BG }}
      >
        <PageLoader size="lg" text={t('wordWheel.loading')} />
      </div>
    );
  }

  return (
    <div
      ref={attachContainer}
      data-testid="word-wheel-stage"
      // h-dvh/max-h-dvh pins the stage to exactly one viewport. (The SEO card
      // that used to sit as a sibling below this component was removed on
      // 2026-07-28 — this game shell is noIndex, so the copy earned nothing
      // and only clutters the board; SEO now lives only on the /daily hub.)
      // Keep the cap regardless: it bounds the flex-1 chain so the results
      // recap's overflow-y-auto engages instead of growing <body> past height.
      className="relative flex-1 flex flex-col bg-neo-navy min-h-0 h-dvh max-h-dvh w-full max-w-[100vw] overflow-hidden"
      // Layered, always-on ambient backdrop (see STAGE_AMBIENT_BG): a
      // depth-to-abyss vignette plus soft brand-colored glows. Replaces the
      // old navy-only gradient, whose elevated/radial center sat too close to
      // the navy edge to register on-device — so the stage kept reading as
      // flat black with no ambient feel regardless of which navy token it used.
      style={{ background: STAGE_AMBIENT_BG }}
    >
      {/* Subtle dot pattern — adds texture/depth over the gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--neo-black) 1px, transparent 1px)',
          backgroundSize: '10px 10px',
        }}
        aria-hidden
      />

      {/* PixiJS Effects Layer */}
      {phase === 'playing' && (
        <WordWheelEffectsCanvas
          width={canvasSize.width}
          height={canvasSize.height}
          effects={effects}
          onEffectsConsumed={handleEffectsConsumed}
        />
      )}

      {!isPractice && phase !== 'playing' && <DailyFlowChrome modeId="word-wheel" intro={false} inline />}

      {/* Phases swap with no exit tween: an opacity fade on these full-screen layers flashes on mobile,
          and the buzzer beat (WheelTimeUpStamp) already marks the play → results hand-off. */}
      {phase === 'ready' && puzzle && (
        <div className="flex-1 flex min-h-0">
          <WordWheelReadyCard
            t={t}
            isPractice={isPractice}
            autoShowHowTo={!isPractice && getDailyStreak().totalDailiesCompleted === 0}
            centerLetter={puzzle.centerLetter}
            outerLetters={puzzle.outerLetters}
            puzzleNumber={puzzleNumber}
            streakDays={isPractice ? 0 : getDailyStreak().currentStreak}
            onPlay={handleStart}
            wide={isDesktop || isTv}
          >
            <ReadyLeaderboardPeek t={t} defaultOpen={isDesktop || isTv}>
              <TabbedDailyLeaderboard
                puzzleDate={catchupDate || getDailyChallengeDate()}
                language={language as Language}
                currentPlayerId={isAuthenticated && profile ? profile.id : null}
                currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
                scope="word-wheel"
                defaultTab="today"
                t={t}
                maxVisible={5}
                compact
              />
            </ReadyLeaderboardPeek>
          </WordWheelReadyCard>
        </div>
      )}

      {phase === 'playing' && isPractice && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <PracticeBadge />
        </div>
      )}
      {phase === 'playing' && puzzle && (
        <WordWheelBoardEntrance
          settled={finishing}
          // No pb-bottom-stack: body.screen-fit-locked already reserves
          // --bottom-stack-height for this screen, and padding is additive.
          className="flex-1 flex flex-col items-center justify-start pt-3 sm:pt-4 shell:items-stretch shell:pt-0 shell:overflow-hidden relative z-20 overflow-y-auto overscroll-contain"
        >
          {(entranceDone) => (
            <WordWheelGame
              puzzle={puzzle}
              duration={WORD_WHEEL_DURATION}
              onComplete={handleComplete}
              onValidateWord={handleValidateWord}
              onQuickVerdict={handleQuickVerdict}
              onEffect={handleEffect}
              language={language}
              paused={!entranceDone}
              practice={isPractice}
              puzzleDate={catchupDate || getDailyChallengeDate()}
              currentPlayerId={isAuthenticated && profile ? profile.id : null}
              currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
              onExit={handleExitClick}
            />
          )}
        </WordWheelBoardEntrance>
      )}
      {finishing && gameResult && (
        <WheelTimeUpStamp wordsFound={gameResult.wordsFound.length} onDone={finishBeatDone} />
      )}

      {/* Completed / Already Played.
          The wrapper owns its scrollport (mirroring the ready/playing phases
          above): the stage root is `overflow-hidden`, so without this the
          recap had nowhere to scroll and the sticky primary CTA would have
          had no scrollport to pin to. `justify-start`, not `justify-center`
          — a centred flex column whose content overflows clips at BOTH ends
          and can't be scrolled back to the top. */}
      {(phase === 'completed' || phase === 'already-played') && gameResult && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-start overflow-y-auto overscroll-contain pb-bottom-stack">
          <WordWheelResults
            result={gameResult}
            puzzleNumber={puzzleNumber}
            puzzleDate={catchupDate || getDailyChallengeDate()}
            language={language as Language}
            hasPlayedWordHunt={hasPlayedWH}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            isAuthenticated={isAuthenticated}
            streakDays={getDailyStreak().currentStreak}
            isFirstCompletion={getDailyStreak().totalDailiesCompleted <= 1}
            alreadyPlayed={phase === 'already-played'}
            isCatchup={isCatchup}
            leaderboardKey={leaderboardKey}
            onPracticeAgain={isPractice ? handlePracticeAgain : undefined}
          />
        </div>
      )}

      {/* Mid-game exit confirmation. Rendered at the stage root (outside the
          phase branches) so it overlays the wheel; strings come from the shared
          defensive builder so a broken locale bundle can't crash render. */}
      <ConfirmationDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title={quitDialog.title}
        description={quitDialog.description}
        confirmText={quitDialog.confirmText}
        cancelText={quitDialog.cancelText}
        onConfirm={handleExitConfirm}
        variant="danger"
        analyticsId="word_wheel_quit_confirm"
      />
    </div>
  );
};

export default WordWheelChallenge;
