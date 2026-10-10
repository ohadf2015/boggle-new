'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { buildQuitDialogConfig } from './survival/quitDialogConfig';
import logger from '@/utils/logger';
import WordWheelGame, { type WordWheelGameResult } from './WordWheelGame';
import WordWheelResults from './WordWheelResults';
import ReadyLeaderboardPeek from './ReadyLeaderboardPeek';
import WordWheelReadyCard from './WordWheelReadyCard';
const TabbedDailyLeaderboard = dynamic(() => import('./TabbedDailyLeaderboard'), {
  ssr: false,
});
import {
  generateWordWheelPuzzle,
  type WordWheelPuzzle,
} from '@/utils/dailyChallenge/wordWheelGeneration';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  hasPlayedWordWheelToday,
  getTodaysWordWheelResult,
  saveWordWheelResult,
  getDailyStreak,
  updateDailyStreak,
  hasPlayedWordWheel,
  getWordWheelResultForDate,
  hasEverPlayedWordWheel,
} from '@/utils/dailyChallenge';
import { getGuestFingerprint, getGuestDailyPlayer } from '@/utils/dailyChallenge/guestPlayer';
import { isCatchUpDate, shouldGateCatchUpBehindAd } from '@/utils/dailyChallenge/catchUp';
import type { Language } from '@/types';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fastValidateWord } from '@/hooks/fastValidateWord';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import { useDailyModePlayed } from '@/hooks/useDailyModePlayed';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { isNative } from '@/utils/platform';
import PracticeBadge from '@/components/practice/PracticeBadge';
import { useDesktopLayout } from '@/hooks/useDesktopLayout';

// Lazy-load PixiJS effects canvas (no SSR)
const WordWheelEffectsCanvas = dynamic(
  () => import('./WordWheelEffectsCanvas'),
  { ssr: false },
);

// ==========================================
// Types
// ==========================================

type WordWheelPhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

const WORD_WHEEL_DURATION = 120; // 2 minutes

// Always-on ambient backdrop for the Word Wheel stage.
//
// Root cause this replaces: depth used to lean on (a) a navy-only radial
// gradient whose center sat only ~16 luminance above the edge — imperceptible
// on-device, so it read as flat black no matter which navy token was the
// center; and (b) the pixi bokeh, which only paints during `phase==='playing'`
// and is faint. Neither delivered perceptible, phase-independent ambient depth,
// so the stage kept regressing to "black".
//
// This is a layered CSS backdrop, painted top-most layer first:
//   1. lime glow blooming from the top (brand primary)
//   2. cyan glow rising from the bottom
//   3. soft violet glow lower-right for color depth
//   4. depth gradient: elevated-navy center → navy → abyss (#0a0a1a) at the
//      edges, a real vignette that makes the board pop.
// Always-on + phase-independent → genuine ambient feel on ready/playing/results
// without depending on the pixi layer.
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
  const { profile, isAuthenticated } = useAuth();
  const setIsInGame = useHideNavigation();
  const { isDesktop, isTv } = useDesktopLayout();

  // Catch-up: `?date=YYYY-MM-DD` launches a past daily within the 3-day window.
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const catchupDate = dateParam && isCatchUpDate(getDailyChallengeDate(), dateParam) ? dateParam : null;
  const isCatchup = !!catchupDate;

  const [phase, setPhase] = useState<WordWheelPhase>('loading');
  const [puzzle, setPuzzle] = useState<WordWheelPuzzle | null>(null);
  const [gameResult, setGameResult] = useState<WordWheelGameResult | null>(null);
  /**
   * Bumped once the submit POST lands, to remount the results leaderboard.
   * The results screen shows immediately (the submit is deliberately not
   * awaited), so its first fetch races the write and comes back without this
   * player. Same pattern Word Hunt uses via `onSubmitSuccess`.
   */
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [effects, setEffects] = useState<WordWheelEffect[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  // Catch-up ad gate — mirrors DailyChallenge pattern. Per-date unlock so a
  // single ad watch covers the whole session for that date.
  const catchupAdUnlockedRef = useRef(false);

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

  // Measure the stage for the Pixi effects canvas.
  //
  // This used to be a `useEffect([])` reading `containerRef.current`. That
  // effect runs while the component is still in its `loading` early-return
  // branch — a DIFFERENT element that never carries this ref — so the ref was
  // null, the measurement silently no-opped, and nothing re-measured once the
  // stage mounted. The canvas stayed at its 400×600 seed pinned to the stage's
  // top-left, so every effect spawned at wheel coordinates fell outside it and
  // no bubbles/particles were ever visible (measured: 1440×813 stage, 400×600
  // canvas). A callback ref fires when the node actually mounts, and the
  // observer keeps it correct across resize/orientation changes.
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

  // Initialize puzzle
  useEffect(() => {
    let isMounted = true;
    const date = catchupDate || getDailyChallengeDate();
    const number = getPuzzleNumber(date);
    setPuzzleNumber(number);

    // Reset ad unlock when catch-up date changes
    catchupAdUnlockedRef.current = false;

    const gameLang = language as Language;

    const init = async () => {
      // Practice mode: bypass already-played gates so the player can replay safely
      if (isPractice) {
        const generated = generateWordWheelPuzzle(date, gameLang);
        if (!isMounted) return;
        setPuzzle(generated);
        setPhase('ready');
        return;
      }

      // Fast-path: localStorage already has this date's result.
      const hasPlayed = isCatchup
        ? hasPlayedWordWheel(gameLang, date)
        : hasPlayedWordWheelToday(gameLang);

      if (hasPlayed) {
        const stored = isCatchup
          ? getWordWheelResultForDate(gameLang, date)
          : getTodaysWordWheelResult(gameLang);
        if (!isMounted) return;
        if (stored) {
          setGameResult({
            wordsFound: stored.result.wordsFound,
            score: stored.result.score,
            timeSeconds: stored.result.timeSeconds,
          });
        } else {
          setGameResult({ wordsFound: [], score: 0, timeSeconds: 0 });
        }
        setPhase('already-played');
        return;
      }

      // Cross-device sync: ask the server whether this player already
      // submitted today's result on another device. localStorage on this
      // device is empty but the canonical record lives in Supabase.
      try {
        const params = new URLSearchParams();
        if (isAuthenticated && profile) params.set('playerId', profile.id);
        else {
          const fp = guestFingerprint ?? (await getGuestFingerprint());
          if (fp) params.set('guestFingerprint', fp);
        }

        if (params.toString()) {
          const resp = await fetch(
            `/api/daily-challenge/word-wheel/check-played/${date}/${gameLang}?${params.toString()}`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (!isMounted) return;
          if (resp.ok) {
            const data = (await resp.json()) as {
              hasPlayed: boolean;
              result?: {
                score: number;
                wordsFound: string[];
                longestWord: string | null;
                timeSeconds: number;
                centerLetter: string | null;
                completedAt: string | null;
              };
            };
            if (data.hasPlayed && data.result) {
              const r = data.result;
              // Hydrate localStorage so subsequent loads on this device are
              // instant and offline-safe. saveWordWheelResult also marks this
              // as the user's record for streak/share UI.
              saveWordWheelResult({
                puzzleNumber: number,
                puzzleDate: date,
                language: gameLang,
                centerLetter: r.centerLetter || '',
                wordsFound: r.wordsFound,
                totalPossible: 0,
                score: r.score,
                timeSeconds: r.timeSeconds,
                streakDays: getDailyStreak().currentStreak,
                completedAt: r.completedAt || new Date().toISOString(),
              });
              if (!isMounted) return;
              setGameResult({
                wordsFound: r.wordsFound,
                score: r.score,
                timeSeconds: r.timeSeconds,
              });
              setPhase('already-played');
              return;
            }
          }
        }
      } catch {
        // Network error / timeout — fall through to ready phase. Worst case
        // is the user can replay; submit will be deduped server-side via the
        // unique (player_id, puzzle_date, language) constraint (error 23505).
      }

      if (!isMounted) return;
      const generatedPuzzle = generateWordWheelPuzzle(date, gameLang);
      setPuzzle(generatedPuzzle);
      setPhase('ready');
    };

    init();
    return () => { isMounted = false; };
    // `guestFingerprint` is deliberately NOT a dependency: init resolves the
    // daily fingerprint itself when it needs one, and re-running on the async
    // state landing would double the server sync (and its saveWordWheelResult).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isAuthenticated, profile?.id, isPractice, catchupDate, isCatchup]);

  const handleValidateWord = useCallback(
    (word: string) => fastValidateWord(word, language as Language),
    [language]
  );

  // Core start — shared by direct play and post-ad-reward callback.
  const startPlaying = useCallback(() => {
    // Fullscreen game paths skip the global prewarm (PSI window); PLAY is past it,
    // and without the dictionary every word waits on a server round-trip.
    void prewarmDictionary(language as Language);
    setGameActive(true);
    setPhase('playing');
  }, [setGameActive, language]);

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

  // Returning players ("already play this kind of challenge") don't need the
  // intro/ready page — jump straight into gameplay. Guarded by a ref so it
  // only fires once per puzzle load, not on every re-render while phase stays
  // 'ready'.
  const autoSkippedReadyRef = useRef(false);
  useEffect(() => {
    autoSkippedReadyRef.current = false;
  }, [language, catchupDate]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (isPractice || isCatchup) return;
    if (autoSkippedReadyRef.current) return;
    if (!hasEverPlayedWordWheel(language as Language)) return;

    autoSkippedReadyRef.current = true;
    handleStart();
  }, [phase, isPractice, isCatchup, language, handleStart]);

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

    // Submit to server for leaderboard. If the server reports the player
    // already submitted today (cross-device replay or post-timeout retry),
    // reconcile localStorage + UI to the canonical row instead of leaving the
    // wasted-replay score in place.
    const longestWord = result.wordsFound.reduce((a, b) => b.length > a.length ? b : a, '');

    void (async () => {
      try {
        // Guests submit under the daily guest identity (stable fingerprint +
        // the generated display name/avatar every other daily surface shows),
        // so the board lists "Curious Otter", not a wall of "Guest".
        const guest = isAuthenticated ? null : await getGuestDailyPlayer();
        const guestFp = isAuthenticated ? undefined : (guestFingerprint ?? (await getGuestFingerprint()) ?? undefined);
        const submitBody = {
          puzzleDate: date,
          puzzleNumber,
          language: gameLang,
          playerId: isAuthenticated && profile ? profile.id : undefined,
          guestFingerprint: guestFp || undefined,
          displayName: profile?.display_name || guest?.displayName || 'Guest',
          avatarEmoji: profile?.avatar_emoji || guest?.avatarEmoji || '🎯',
          avatarColor: profile?.avatar_color || guest?.avatarColor || '#6366f1',
          avatarImage: profile?.avatar_image || undefined,
          countryCode: profile?.country_code || undefined,
          score: result.score,
          wordCount: result.wordsFound.length,
          wordsFound: result.wordsFound,
          longestWord: longestWord || undefined,
          timeSeconds: result.timeSeconds,
          centerLetter: puzzle?.centerLetter || undefined,
          isCatchup,
        };
        const resp = await fetch('/api/daily-challenge/word-wheel/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitBody),
        });
        if (!resp.ok) return;
        const json = (await resp.json()) as {
          alreadySubmitted?: boolean;
          result?: {
            score: number;
            wordCount: number;
            wordsFound: string[];
            longestWord: string | null;
            timeSeconds: number;
            centerLetter: string | null;
            completedAt: string | null;
          } | null;
        };
        if (json?.alreadySubmitted && json.result) {
          const c = json.result;
          saveWordWheelResult({
            puzzleNumber,
            puzzleDate: date,
            language: gameLang,
            centerLetter: c.centerLetter || '',
            wordsFound: c.wordsFound,
            totalPossible: 0,
            score: c.score,
            timeSeconds: c.timeSeconds,
            streakDays: streak.currentStreak,
            completedAt: c.completedAt || new Date().toISOString(),
          });
          setGameResult({
            wordsFound: c.wordsFound,
            score: c.score,
            timeSeconds: c.timeSeconds,
          });
        }
      } catch {
        /* leaderboard submission is best-effort */
      } finally {
        // The row (if any) exists server-side now — let the board refetch.
        // In `finally` so a failed submit still refreshes rather than leaving
        // the player looking at a board that silently excludes them.
        setLeaderboardKey(k => k + 1);
      }
    })();

    setPhase('completed');
  }, [language, puzzle, puzzleNumber, setGameActive, isAuthenticated, profile, isPractice, catchupDate, isCatchup, guestFingerprint]);

  // Practice dead-end fix: results screen offers "spin another wheel" — fresh
  // RANDOM puzzle (the mount path seeds by date, so re-entering would serve the
  // identical wheel) and back to the ready screen. Practice-only.
  const handlePracticeAgain = useCallback(() => {
    const seed = Math.random().toString(36).slice(2);
    setPuzzle(generateWordWheelPuzzle(seed, language as Language));
    setGameResult(null);
    setPhase('ready');
  }, [language]);

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

      <AnimatePresence mode="wait">
        {/* Ready screen. Static appear: an opacity tween on this full-screen layer flashes on mobile. */}
        {phase === 'ready' && puzzle && (
          <m.div key="ready" className="flex-1 flex min-h-0" exit={{ opacity: 0 }}>
            <WordWheelReadyCard
              t={t}
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
          </m.div>
        )}

        {/* Playing */}
        {phase === 'playing' && isPractice && (
          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <PracticeBadge />
          </div>
        )}
        {phase === 'playing' && puzzle && (
          <m.div
            key="playing"
            // No pb-bottom-stack: body.screen-fit-locked already reserves
            // --bottom-stack-height for this screen, and padding is additive.
            className="flex-1 flex flex-col items-center justify-start pt-3 sm:pt-4 lg:items-stretch lg:pt-0 relative z-20 overflow-y-auto overscroll-contain"
            // Paint the board INSTANTLY on mount. With AnimatePresence mode="wait"
            // the playing layer only mounts after the ready layer finishes exiting;
            // a fade-in-from-opacity-0 here then leaves the bg-neo-navy parent fully
            // exposed for the enter duration — a black-screen flash after the coach
            // on slower / native devices. initial={false} renders at the animate
            // state immediately, so the wheel + HUD are visible the moment the
            // ready screen clears. (Exit stays animated for a smooth out.)
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <WordWheelGame
              puzzle={puzzle}
              duration={WORD_WHEEL_DURATION}
              onComplete={handleComplete}
              onValidateWord={handleValidateWord}
              onEffect={handleEffect}
              language={language}
              practice={isPractice}
              isDesktop={isDesktop || isTv}
              puzzleDate={catchupDate || getDailyChallengeDate()}
              currentPlayerId={isAuthenticated && profile ? profile.id : null}
              currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
              onExit={handleExitClick}
            />
          </m.div>
        )}

        {/* Completed / Already Played.
            The wrapper owns its scrollport (mirroring the ready/playing phases
            above): the stage root is `overflow-hidden`, so without this the
            recap had nowhere to scroll and the sticky primary CTA would have
            had no scrollport to pin to. `justify-start`, not `justify-center`
            — a centred flex column whose content overflows clips at BOTH ends
            and can't be scrolled back to the top. */}
        {(phase === 'completed' || phase === 'already-played') && gameResult && (
          <m.div
            key="results"
            className="flex-1 min-h-0 flex flex-col items-center justify-start overflow-y-auto overscroll-contain pb-bottom-stack"
            exit={{ opacity: 0 }}
          >
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
          </m.div>
        )}
      </AnimatePresence>

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
