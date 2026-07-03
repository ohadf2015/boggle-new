'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCurrentSeasonDynamic } from '@/lib/seasons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInterval } from '@/hooks/useSafeTimeout';
import { m, AnimatePresence } from 'framer-motion';
import { isNative } from '@/utils/platform';
import { useRewardedAd } from '@/hooks/useRewardedAd';

import AutoHideHeader from '@/components/AutoHideHeader';
import DailyWordHuntSurvival, { type SurvivalGameResult } from './DailyWordHuntSurvival';
import DailyWordHuntResults from './DailyWordHuntResults';
import DailyReadyScreen, { type ChallengeData } from './DailyReadyScreen';
import { DailyChallengeTutorial } from './DailyChallengeTutorial';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

import { formatTimeHHMMSS } from '@/shared/utils/timeFormatting';
import { useWinStreak } from '@/hooks/useWinStreak';
import { PageLoader } from '@/components/ui/PageLoader';
import {
  generateDailyPuzzle,
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  hasPlayedWordHuntToday,
  getTodaysWordHuntResult,
  saveWordHuntResult,
  getGuestFingerprint,
  mapServerResultToStoredResult,
  getWordHuntTutorialKey,
  getWordHuntResultKey,
  markWordHuntForfeitToday,
  hasWordHuntForfeitToday,
  clearWordHuntForfeitToday,
  type WordHuntResult,
  type StoredWordHuntResult,
} from '@/utils/dailyChallenge';
import { neoErrorToast } from '@/components/NeoToast';
import { trackDailyPuzzle, trackFeatureFirstUse, trackGrowthEvent } from '@/utils/growthTracking';
import {
  buildDailyWordHuntCompletePayload,
  type WordHuntRescueMethod,
} from './analytics/wordHuntCompletePayload';
import { shouldAutoShowTutorial } from './tutorial/shouldAutoShowTutorial';
import { markWordHuntTutorialSeen } from './tutorial/markWordHuntTutorialSeen';
import { useDailyChallengeUrlParams } from './useDailyChallengeUrlParams';
import { isCatchUpDate, shouldGateCatchUpBehindAd } from '@/utils/dailyChallenge/catchUp';
import { isUsableDailyPuzzle } from '@/utils/dailyChallenge/puzzlePayload';
import { useRetryChallenge } from './useRetryChallenge';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import PracticeBadge from '@/components/practice/PracticeBadge';
import { useNetworkState } from '@/hooks/useNetworkState';
import { getOfflineStore } from '@/lib/offline';
import { getCachedDailyPuzzle } from '@/lib/offline/prefetchDaily';
import { usePrefetchDailyContent } from '@/hooks/usePrefetchDailyContent';
import DailyOfflineFallback from '@/components/offline/DailyOfflineFallback';
import type { LetterGrid, Language } from '@/types';

export type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played' | 'offline-miss';

const DailyChallenge: React.FC = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const { unlockAudio } = useMusic();
  const { recordWin: recordStreak } = useWinStreak();
  const isPractice = usePracticeFlag();
  const { online } = useNetworkState();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Cache today's (+ tomorrow's, late in the day) daily puzzle for offline play.
  // Runs once per session for whoever opens Daily, independent of the
  // offline-mode flag — see usePrefetchDailyContent.
  usePrefetchDailyContent({ language });

  // Catch-up: `?date=YYYY-MM-DD` launches a past daily within the last-3-days
  // window. Validated against today so only a genuine catch-up date is honored
  // (anything else falls through to today's puzzle).
  const dateParam = searchParams.get('date');
  const catchupDate = dateParam && isCatchUpDate(getDailyChallengeDate(), dateParam) ? dateParam : null;
  const isCatchup = !!catchupDate;

  // Game language state
  const urlLocale = language as Language;
  const defaultLanguage = urlLocale && ['en', 'he', 'sv', 'ja', 'es', 'ru'].includes(urlLocale)
    ? urlLocale
    : 'en';
  const [gameLanguage, setGameLanguage] = useState<Language>(defaultLanguage);

  const getCurrentFlag = (lang: Language) => {
    const flags: Record<string, string> = { en: '🇺🇸', he: '🇮🇱', sv: '🇸🇪', ja: '🇯🇵', es: '🇪🇸', ru: '🇷🇺' };
    return flags[lang] || '🌐';
  };

  // Challenge state
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [phase, setPhase] = useState<DailyChallengePhase>('loading');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  useEffect(() => {
    if (shouldAutoShowTutorial({ phase, tutorialCompleted, showTutorial })) {
      setShowTutorial(true);
    }
  }, [phase, tutorialCompleted, showTutorial]);
  const [puzzleDate, setPuzzleDate] = useState<string>('');
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [targetWord, setTargetWord] = useState<string>('');
  const [meaning, setMeaning] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [storedResult, setStoredResult] = useState<StoredWordHuntResult | null>(null);
  const [, setGameResult] = useState<SurvivalGameResult | null>(null);
  // True when the player bailed mid-game today (no saved result). Re-entry is
  // ad-gated on native; on web it degrades to a free replay.
  const [forfeitedToday, setForfeitedToday] = useState(false);
  const [wasReset, setWasReset] = useState(false);
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);

  // Retry challenge hook
  const { handleRetryChallenge, justResetRef, extraTries } = useRetryChallenge({
    gameLanguage,
    isAuthenticated,
    profile: isAuthenticated && profile ? { id: profile.id } : null,
    t,
    setStoredResult: () => setStoredResult(null),
    setGameResult: () => setGameResult(null),
    setWasReset,
    setPhase,
  });

  // URL parameter handling
  useDailyChallengeUrlParams({
    gameLanguage,
    isAuthenticated,
    profile: isAuthenticated && profile ? { id: profile.id } : null,
    t,
    setChallengeData,
    setWasReset,
  });

  // Fetch guest fingerprint on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
  }, []);

  // Set initial countdown value immediately on mount
  useEffect(() => {
    const seconds = getSecondsUntilNextDaily();
    setCountdown(formatTimeHHMMSS(seconds));
  }, []);



  // Track previous values for smarter re-initialization
  const prevGameLanguageRef = useRef<Language | null>(null);
  const prevWasResetRef = useRef<boolean>(false);
  const gameStartedAtRef = useRef<number>(0);
  // One rewarded ad unlocks one catch-up date; reset when the date changes so
  // each missed day is its own watch (and today's daily is never gated).
  const catchupAdUnlockedRef = useRef<boolean>(false);
  useEffect(() => {
    catchupAdUnlockedRef.current = false;
  }, [catchupDate]);

  // Initialize Word Hunt daily challenge
  useEffect(() => {
    let isMounted = true;

    const languageChanged = prevGameLanguageRef.current !== null && prevGameLanguageRef.current !== gameLanguage;
    const wasJustReset = wasReset && !prevWasResetRef.current;
    const needsFullReload = languageChanged || wasJustReset || prevGameLanguageRef.current === null;

    prevGameLanguageRef.current = gameLanguage;
    prevWasResetRef.current = wasReset;

    if (needsFullReload) setPhase('loading');

    const initializePuzzle = async () => {
      const date = catchupDate || getDailyChallengeDate();
      const number = getPuzzleNumber(date);
      if (!isMounted) return;
      setPuzzleDate(date);
      setPuzzleNumber(number);

      const tutorialKey = getWordHuntTutorialKey(gameLanguage);
      const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
      setTutorialCompleted(hasCompletedTutorial);

      // Mid-game forfeit today (no saved result) → gate re-entry behind a
      // rewarded ad on native. Skipped for practice + post-retry replays.
      setForfeitedToday(!isPractice && !wasJustReset && hasWordHuntForfeitToday(gameLanguage));

      // Practice mode: bypass already-played gates so the player can replay safely.
      // Catch-up skips the today-only local cache (it's keyed to today) but still
      // runs the server check below, which gates by the catch-up `date`.
      if (!wasJustReset && !isPractice) {
        const localResult = isCatchup ? null : getTodaysWordHuntResult(gameLanguage);
        if (localResult) {
          if (!isMounted) return;
          setStoredResult(localResult);
          setPhase('already-played');
          return;
        }

        try {
          const fp = await getGuestFingerprint();
          const checkParams = new URLSearchParams();
          if (isAuthenticated && profile) checkParams.set('playerId', profile.id);
          else if (fp) checkParams.set('guestFingerprint', fp);

          if (checkParams.toString()) {
            const checkResponse = await fetch(
              `/api/daily-challenge/word-hunt/check-played/${date}/${gameLanguage}?${checkParams.toString()}`
            );
            if (!isMounted) return;
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.hasPlayed && checkData.result) {
                const serverResult = mapServerResultToStoredResult(
                  checkData.result, date, number, gameLanguage, checkData.streak?.currentStreak || 0
                );
                if (typeof window !== 'undefined') {
                  const storageKey = getWordHuntResultKey(gameLanguage, date);
                  localStorage.setItem(storageKey, JSON.stringify(serverResult));
                }
                setStoredResult(serverResult);
                setPhase('already-played');
                return;
              }
            }
          }
        } catch (checkError) {
          console.warn('Failed to check server for existing attempt:', checkError);
        }
      }

      if (!online) {
        const store = await getOfflineStore();
        const cached = await getCachedDailyPuzzle<{ grid: LetterGrid; targetWord: string; meaning?: string | null }>(
          store, date, gameLanguage, 'wordhunt',
        );
        if (cached && isMounted) {
          setGrid(cached.grid);
          setTargetWord(cached.targetWord);
          setMeaning(cached.meaning ?? null);
          setPhase('ready');
          return;
        }
        if (isMounted) setPhase('offline-miss');
        return;
      }

      try {
        const response = await fetch(`/api/daily-challenge/puzzle/${date}/${gameLanguage}`);
        if (!isMounted) return;
        const puzzleData = response.ok ? await response.json().catch(() => null) : null;
        if (!isMounted) return;
        if (isUsableDailyPuzzle(puzzleData)) {
          setGrid(puzzleData.grid);
          setTargetWord(puzzleData.targetWord);
          setMeaning(puzzleData.meaning ?? null);
        } else {
          // ok-but-empty body, non-ok status, or unparseable JSON → generate locally
          const puzzle = generateDailyPuzzle(date, gameLanguage);
          if (!isMounted) return;
          setGrid(puzzle.grid);
          setTargetWord(puzzle.targetWord);
          setMeaning(null);
        }
      } catch {
        if (!isMounted) return;
        const puzzle = generateDailyPuzzle(date, gameLanguage);
        setGrid(puzzle.grid);
        setTargetWord(puzzle.targetWord);
        setMeaning(null);
      }

      if (!isMounted) return;
      setPhase('ready');
    };

    initializePuzzle();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLanguage, wasReset, isAuthenticated, profile?.id, catchupDate]);

  // Safety net: the only render branch for `playing` requires both grid AND
  // targetWord; entering `playing` without them renders nothing (blank screen).
  // If that ever happens (empty payload that slipped through, offline cache miss,
  // an ad-callback start before data settled), self-heal by generating locally
  // so the player always gets a real puzzle instead of a blank screen.
  useEffect(() => {
    if (phase === 'playing' && (!grid || !targetWord)) {
      const puzzle = generateDailyPuzzle(puzzleDate || getDailyChallengeDate(), gameLanguage);
      setGrid(puzzle.grid);
      setTargetWord(puzzle.targetWord);
    }
  }, [phase, grid, targetWord, puzzleDate, gameLanguage]);

  // Countdown timer
  useInterval(() => {
    const seconds = getSecondsUntilNextDaily();
    setCountdown(formatTimeHHMMSS(seconds));
  }, 1000);

  // Common "enter the game" tail: unlock audio + analytics + flip to playing.
  // Shared by the normal start path, the forfeit replay, and the catch-up unlock
  // (unlockAudio is idempotent, so calling it again from here is harmless).
  const startPlaying = useCallback(() => {
    unlockAudio();
    trackDailyPuzzle('opened', 'word_hunt');
    trackFeatureFirstUse('daily_word_hunt');
    gameStartedAtRef.current = Date.now();
    setPhase('playing');
  }, [unlockAudio]);

  // Minimal "go to playing" used after a forfeit replay is granted (skips the
  // already-played check — a forfeit never saves a result, so it always passes).
  const beginPlaying = useCallback(() => {
    clearWordHuntForfeitToday(gameLanguage);
    setForfeitedToday(false);
    startPlaying();
  }, [gameLanguage, startPlaying]);

  // Rewarded ad that unlocks a replay after a mid-game forfeit (native only;
  // reward arrives via onRewardEarned, not a return value).
  const { showAd, isAdAvailable, isPlaceholderCooldown } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'retry',
    warm: forfeitedToday,
    onRewardEarned: () => beginPlaying(),
    // The ad is a best-effort speed bump, not a hard wall. On ANY non-reward
    // outcome (user skip, no-fill, a stalled show that hits the safety timeout)
    // degrade to a free replay — same contract as web (which never gates) and
    // the only way the player isn't stranded on the ready screen after the ad
    // Activity tore down. sessionSettled in useRewardedAd guarantees exactly one
    // of these fires, so this can't double-start.
    onAdError: () => beginPlaying(),
  });

  // Rewarded ad that unlocks playing a past day's daily (catch-up). Native only;
  // web degrades to a free play. Reward → mark this date unlocked + start.
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
    // Degrade to free play on any non-reward outcome so a stalled/skipped ad
    // can't strand the player on the ready screen (the "tapped play, button
    // vanished, nothing happened" report). No unlock flag — no reward was
    // granted; we just let this one play through.
    onAdError: () => startPlaying(),
  });

  // Handle game start with safety checks
  const handleStartGame = useCallback(async () => {
    // Forfeit ad-gate: bailed mid-game today → watch a rewarded ad to replay on
    // native. On web / when no ad is available, degrade to a free replay.
    if (forfeitedToday) {
      if (isNative() && isAdAvailable && !isPlaceholderCooldown) {
        showAd();
        return;
      }
      clearWordHuntForfeitToday(gameLanguage);
      setForfeitedToday(false);
    }

    unlockAudio();

    if (justResetRef.current) {
      justResetRef.current = false;
      gameStartedAtRef.current = Date.now();
      setPhase('playing');
      return;
    }

    // Practice mode: bypass already-played gates so the player can replay safely.
    // Catch-up uses its own date (below), so the today-only cache gate is skipped.
    if (!isPractice && !isCatchup && hasPlayedWordHuntToday(gameLanguage)) {
      const result = getTodaysWordHuntResult(gameLanguage);
      if (result) {
        setStoredResult(result);
        setPhase('already-played');
        return;
      }
    }

    if (!isPractice) {
      try {
        const date = catchupDate || getDailyChallengeDate();
        const fp = await getGuestFingerprint();
        const checkParams = new URLSearchParams();
        if (isAuthenticated && profile) checkParams.set('playerId', profile.id);
        else if (fp) checkParams.set('guestFingerprint', fp);

        if (checkParams.toString()) {
          const checkResponse = await fetch(
            `/api/daily-challenge/word-hunt/check-played/${date}/${gameLanguage}?${checkParams.toString()}`
          );
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.hasPlayed) {
              neoErrorToast(t('daily.alreadyPlayed'), { icon: '🔒', duration: 3000 });
              if (checkData.result) {
                const number = getPuzzleNumber(date);
                const serverResult = mapServerResultToStoredResult(
                  checkData.result, date, number, gameLanguage, checkData.streak?.currentStreak || 0
                );
                setStoredResult(serverResult);
              }
              setPhase('already-played');
              return;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to check server before game start:', error);
      }
    }

    // Catch-up ad gate (last gate): playing a past day's daily costs a rewarded
    // ad on native. Placed AFTER the already-played check so we never burn an ad
    // only to hit an "already played" wall on a deep-linked completed day.
    // Web / no ad / placeholder cooldown → gate is false → free play.
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
  }, [gameLanguage, isAuthenticated, profile, t, unlockAudio, justResetRef, isPractice, isCatchup, catchupDate, forfeitedToday, isAdAvailable, isPlaceholderCooldown, showAd, isCatchUpAdAvailable, isCatchUpPlaceholderCooldown, showCatchUpAd, startPlaying]);

  // Handle game completion
  const handleGameComplete = useCallback((result: SurvivalGameResult, rescueMethod?: WordHuntRescueMethod) => {
    // Practice mode: skip all persistence (no streak, no leaderboard, no analytics).
    // Show transient results only and let player replay freely.
    if (isPractice) {
      setGameResult(result);
      setPhase('completed');
      return;
    }
    const wordHuntResult: WordHuntResult = {
      puzzleNumber,
      puzzleDate,
      language: gameLanguage,
      isCatchup,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
      targetWord: result.targetWord,
      meaning: meaning ?? null,
      attempts: result.attempts,
      wordsDiscovered: result.wordsDiscovered,
      lifeRemaining: result.lifeRemaining,
      clueTokensEarned: result.clueTokensEarned,
      clueTokensSpent: result.clueTokensSpent,
      hintsUnlocked: result.hintsUnlocked,
      efficiencyScore: result.efficiencyScore,
      extraTries,
      streakDays: 0,
      completedAt: new Date().toISOString(),
    };

    const updatedStreak = saveWordHuntResult(wordHuntResult, isAuthenticated);
    wordHuntResult.streakDays = updatedStreak.currentStreak;

    // Record to universal play streak (tracks consecutive days across all game modes)
    recordStreak();

    trackDailyPuzzle('completed', 'word_hunt', {
      solved: result.solved,
      attempts: result.attemptsUsed,
    });

    // First-class daily-challenge funnel event (was registered with 0 call sites).
    // Distinct from daily_puzzle_completed: it's the mode-agnostic "the daily was
    // finished" signal the retention funnel is built on. Fires once per real
    // completion — never in practice (early-returned above).
    trackGrowthEvent('daily_challenge_completed', {
      puzzleNumber,
      language: gameLanguage,
      isCatchup,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
    });

    trackGrowthEvent('daily_word_hunt_complete', {
      ...buildDailyWordHuntCompletePayload({
        result,
        puzzleNumber,
        language: gameLanguage,
        startedAt: gameStartedAtRef.current,
        completedAt: Date.now(),
        rescueMethod: rescueMethod ?? null,
      }),
    });

    setGameResult(result);
    setStoredResult({
      date: puzzleDate,
      puzzleNumber,
      result: wordHuntResult,
      completedAt: new Date().toISOString(),
    });
    setPhase('completed');

    // Update weekly quest progress for daily challenge completion
    if (isAuthenticated && result.solved) {
      fetch('/api/stats/record-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: result.efficiencyScore ?? 0,
          wordCount: result.wordsDiscovered?.length ?? 0,
          longWordsFound: result.wordsDiscovered?.filter(w => (w.word?.length ?? 0) >= 6).length ?? 0,
          mode: 'daily-challenge',
          isDailyChallenge: true,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.questUpdate?.completed) {
            import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
              showQuestCompletionToast({
                questName: t(data.questUpdate.description),
                xpReward: data.questUpdate.xpReward,
                dedupKey: `weekly:${data.questUpdate.questType ?? data.questUpdate.description}`,
                t,
              });
            });
          }
        })
        .catch(() => { /* non-critical */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from LanguageContext
}, [puzzleNumber, puzzleDate, gameLanguage, isAuthenticated, recordStreak, isPractice, isCatchup]);

  const handleTutorialComplete = useCallback(() => {
    markWordHuntTutorialSeen(gameLanguage);
    setTutorialCompleted(true);
    setShowTutorial(false);
  }, [gameLanguage]);

  // Skip persists the seen flag too — otherwise the auto-show effect re-fires
  // immediately (X button bug) and the tutorial re-appears next session.
  const handleTutorialSkip = useCallback(() => {
    markWordHuntTutorialSeen(gameLanguage);
    setTutorialCompleted(true);
    setShowTutorial(false);
  }, [gameLanguage]);
  const handleShowTutorial = useCallback(() => setShowTutorial(true), []);
  // Client-side nav (no hard reload) — a hard nav while the game-active
  // beforeunload guard is armed can blank a Capacitor WebView (black screen).
  const handleBack = useCallback(() => { router.push(`/${language}/daily`); }, [router, language]);

  // Mid-game exit: record a forfeit (no result saved) so re-entry is ad-gated,
  // then leave. Practice runs are exempt.
  const handleQuitMidGame = useCallback(() => {
    if (!isPractice) markWordHuntForfeitToday(gameLanguage);
    router.push(`/${language}/daily`);
  }, [isPractice, gameLanguage, router, language]);

  // Subtle seasonal ambience washes the whole daily screen — atmosphere only,
  // behind all content (relative wrapper), no readability impact.
  const seasonSkin = useMemo(() => getCurrentSeasonDynamic().gridSkinClass, []);

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 h-dvh max-h-dvh w-full max-w-[100vw] bg-gray-100 dark:bg-neo-navy relative overflow-x-clip overflow-hidden ${seasonSkin}`}
    >
      {/* Collapse the in-game header spacer so the focused Word Hunt screen has no
          empty band at the top (the header is hidden during play anyway). */}
      <AutoHideHeader collapseSpacerWhenHidden />

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <m.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
            <PageLoader size="lg" text={t('daily.loading')} />
          </m.div>
        )}

        {phase === 'ready' && (
          <DailyReadyScreen
            puzzleNumber={puzzleNumber}
            puzzleDate={puzzleDate}
            language={gameLanguage}
            currentFlag={getCurrentFlag(gameLanguage)}
            challengeData={challengeData}
            isAuthenticated={isAuthenticated}
            targetWordLength={targetWord?.length || 0}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            guestFingerprint={!isAuthenticated ? guestFingerprint : null}
            tutorialCompleted={tutorialCompleted}
            onLanguageChange={setGameLanguage}
            onStart={handleStartGame}
            onBack={handleBack}
            onShowTutorial={handleShowTutorial}
            t={t}
          />
        )}

        {phase === 'playing' && isPractice && (
          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <PracticeBadge />
          </div>
        )}

        {phase === 'playing' && grid && targetWord && (
          <DailyWordHuntSurvival
            key="playing"
            grid={grid}
            puzzleNumber={puzzleNumber}
            language={gameLanguage}
            targetWord={targetWord}
            onComplete={handleGameComplete}
            onQuit={handleQuitMidGame}
            puzzleDate={puzzleDate}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            practice={isPractice}
          />
        )}

        {phase === 'offline-miss' && (
          <m.div key="offline-miss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            <DailyOfflineFallback onRetry={() => setPhase('loading')} />
          </m.div>
        )}

        {(phase === 'completed' || phase === 'already-played') && storedResult && puzzleDate && (
          <DailyWordHuntResults
            result={storedResult.result}
            puzzleNumber={puzzleNumber}
            puzzleDate={puzzleDate}
            language={gameLanguage}
            countdown={countdown}
            isNewCompletion={phase === 'completed'}
            onBack={handleBack}
            onRetry={handleRetryChallenge}
            onGameLanguageChange={setGameLanguage}
          />
        )}
      </AnimatePresence>

      {showTutorial && (
        <DailyChallengeTutorial onComplete={handleTutorialComplete} onSkip={handleTutorialSkip} />
      )}

    </div>
  );
};

export default DailyChallenge;
