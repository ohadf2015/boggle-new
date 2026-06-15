'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { Star, Type, Timer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import WordWheelGame, { type WordWheelGameResult } from './WordWheelGame';
import WordWheelResults from './WordWheelResults';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
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
  hasPlayedWordWheel,
  getWordWheelResultForDate,
} from '@/utils/dailyChallenge';
import { isCatchUpDate, shouldGateCatchUpBehindAd } from '@/utils/dailyChallenge/catchUp';
import type { Language } from '@/types';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fastValidateWord } from '@/hooks/fastValidateWord';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { getGuestFingerprint } from '@/utils/guestManager';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import { useDailyModePlayed } from '@/hooks/useDailyModePlayed';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { isNative } from '@/utils/platform';
import PracticeBadge from '@/components/practice/PracticeBadge';

// Lazy-load PixiJS effects canvas (no SSR)
const WordWheelEffectsCanvas = dynamic(
  () => import('./WordWheelEffectsCanvas'),
  { ssr: false },
);

// ==========================================
// Types
// ==========================================

type WordWheelPhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

// Deterministic 4×4 pixel mosaic that fills an outer letter tile in the
// ready-screen preview wheel. Seed-based so SSR + client render the same
// pattern (no hydration mismatch) and each tile gets a different splatter.
const CENSOR_BUCKETS = ['bg-neo-navy', 'bg-neo-navy-light', 'bg-neo-cream/30'] as const;
function CensorTile({ seed }: { seed: number }) {
  const cells = Array.from({ length: 16 }, (_, i) => (seed * 31 + i * 7 + 3) % 3);
  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-4" aria-hidden>
      {cells.map((b, i) => <span key={i} className={CENSOR_BUCKETS[b]} />)}
    </div>
  );
}

const WORD_WHEEL_DURATION = 120; // 2 minutes

// ==========================================
// Word Wheel Challenge Orchestrator
// ==========================================

const WordWheelChallenge: React.FC = () => {
  const { t, language } = useLanguage();
  const isPractice = usePracticeFlag();
  const { setGameActive } = useSoundEffects();
  const { profile, isAuthenticated } = useAuth();
  const setIsInGame = useHideNavigation();

  // Catch-up: `?date=YYYY-MM-DD` launches a past daily within the 3-day window.
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const catchupDate = dateParam && isCatchUpDate(getDailyChallengeDate(), dateParam) ? dateParam : null;
  const isCatchup = !!catchupDate;

  const [phase, setPhase] = useState<WordWheelPhase>('loading');
  const [puzzle, setPuzzle] = useState<WordWheelPuzzle | null>(null);
  const [gameResult, setGameResult] = useState<WordWheelGameResult | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [effects, setEffects] = useState<WordWheelEffect[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);

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

  useEffect(() => {
    setGuestFingerprint(getGuestFingerprint());
  }, []);

  useEffect(() => {
    setIsInGame(phase === 'playing');
    return () => setIsInGame(false);
  }, [phase, setIsInGame]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container for effects canvas
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
          const fp = guestFingerprint ?? getGuestFingerprint();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isAuthenticated, profile?.id, guestFingerprint, isPractice, catchupDate, isCatchup]);

  const handleValidateWord = useCallback(
    (word: string) => fastValidateWord(word, language as Language),
    [language]
  );

  // Core start — shared by direct play and post-ad-reward callback.
  const startPlaying = useCallback(() => {
    setGameActive(true);
    setPhase('playing');
  }, [setGameActive]);

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
    const streak = getDailyStreak();

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
    const submitBody = {
      puzzleDate: date,
      puzzleNumber,
      language: gameLang,
      playerId: isAuthenticated && profile ? profile.id : undefined,
      guestFingerprint: !isAuthenticated ? (getGuestFingerprint() || undefined) : undefined,
      displayName: profile?.display_name || 'Guest',
      avatarEmoji: profile?.avatar_emoji || '🎯',
      avatarColor: profile?.avatar_color || '#6366f1',
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

    void (async () => {
      try {
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
      }
    })();

    setPhase('completed');
  }, [language, puzzle, puzzleNumber, setGameActive, isAuthenticated, profile, isPractice, catchupDate, isCatchup]);

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
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('wordWheel.loading')} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 flex flex-col bg-neo-navy min-h-0 overflow-hidden">
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
        {/* Ready screen */}
        {phase === 'ready' && puzzle && (
          <m.div
            key="ready"
            className="flex-1 flex flex-col items-center gap-6 px-4 pt-4 pb-bottom-stack sm:pb-6 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <h1 className="font-neo-display font-black text-3xl sm:text-4xl text-neo-white mb-2">
                {t('wordWheel.title')}
              </h1>
              <span className="text-neo-white text-sm">
                {t('daily.puzzleNumber', { number: puzzleNumber })}
              </span>
            </div>

            {/* Instruction cards — icon-driven, color-coded per rule */}
            <div className="flex flex-col gap-2 max-w-xs lg:max-w-md xl:max-w-lg w-full">
              <div className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-neo-lime/60 bg-neo-lime/15 text-neo-lime">
                  <Star className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-neo-white text-sm">{t('wordWheel.centerLetterRule')}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cyan/60 bg-neo-cyan/15 text-neo-cyan">
                  <Type className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-neo-white text-sm">{t('wordWheel.minLetters', { min: '3' })}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-neo-pink/60 bg-neo-pink/15 text-neo-pink">
                  <Timer className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-neo-white text-sm">{t('wordWheel.timeLimit')}</span>
              </div>
            </div>

            {/* Preview wheel — outer letters censored before play to keep the
                pre-game scout from cheating (you only see the center letter,
                everything else is a deterministic pixel mosaic). */}
            <div className="relative w-44 h-44 lg:w-56 lg:h-56 xl:w-64 xl:h-64 flex items-center justify-center my-4">
              {/* Glow ring */}
              <m.div
                className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
                style={{ boxShadow: '0 0 30px rgba(191,255,0,0.15)' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <m.div
                className="w-16 h-16 rounded-full border-3 border-neo-black bg-neo-lime flex items-center justify-center font-neo-display font-black text-2xl text-neo-black shadow-[3px_3px_0px_black,0_0_20px_rgba(191,255,0,0.5)]"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {puzzle.centerLetter}
              </m.div>
              {puzzle.outerLetters.map((letter, i) => {
                const angle = i * 60;
                const rad = (angle * Math.PI) / 180;
                const x = Math.sin(rad) * 60;
                const y = -Math.cos(rad) * 60;
                return (
                  <m.div
                    key={`outer-${i}`}
                    data-testid="preview-outer-letter"
                    className="absolute inset-0 m-auto w-10 h-10 rounded-full border-2 border-neo-black bg-neo-white overflow-hidden shadow-[2px_2px_0px_black,0_0_6px_rgba(191,255,0,0.12)]"
                    initial={{ scale: 0, x, y }}
                    animate={{ scale: 1, x, y }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 400 }}
                    aria-label="hidden letter"
                  >
                    <CensorTile seed={i + 1} />
                  </m.div>
                );
              })}
            </div>

            <m.button
              type="button"
              onClick={handleStart}
              className="px-8 py-3 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black font-neo-display font-black text-lg shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)] active:shadow-hard-pressed active:translate-x-px active:translate-y-px transition-all"
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t('daily.play')}
            </m.button>

            {/* Tabbed leaderboard — parity with Word Hunt ready screen */}
            <div className="w-full max-w-md lg:max-w-lg xl:max-w-2xl mt-2">
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
            </div>
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
            className="flex-1 flex flex-col items-center justify-start pt-3 sm:pt-4 pb-bottom-stack lg:pt-6 relative z-20 overflow-y-auto overscroll-contain"
            initial={{ opacity: 0, scale: 0.95 }}
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
            />
          </m.div>
        )}

        {/* Completed / Already Played */}
        {(phase === 'completed' || phase === 'already-played') && gameResult && (
          <m.div
            key="results"
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WordWheelResults
              result={gameResult}
              puzzleNumber={puzzleNumber}
              puzzleDate={catchupDate || getDailyChallengeDate()}
              language={language as Language}
              hasPlayedWordHunt={hasPlayedWH}
              currentPlayerId={isAuthenticated && profile ? profile.id : null}
              currentGuestFingerprint={!isAuthenticated ? (getGuestFingerprint() || null) : null}
              isAuthenticated={isAuthenticated}
              streakDays={getDailyStreak().currentStreak}
              isFirstCompletion={getDailyStreak().totalDailiesCompleted <= 1}
              alreadyPlayed={phase === 'already-played'}
              isCatchup={isCatchup}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordWheelChallenge;
