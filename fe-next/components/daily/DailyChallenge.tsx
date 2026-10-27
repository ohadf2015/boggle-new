'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCurrentSeasonDynamic } from '@/lib/seasons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInterval } from '@/hooks/useSafeTimeout';
import { m, AnimatePresence } from 'framer-motion';
import { isNative } from '@/utils/platform';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';

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
  getGuestFingerprint,
  mapServerResultToStoredResult,
  markWordHuntForfeitToday,
  clearWordHuntForfeitToday,
  hasEverPlayedWordHunt,
  type StoredWordHuntResult,
} from '@/utils/dailyChallenge';
import { neoErrorToast } from '@/components/NeoToast';
import { trackDailyPuzzle, trackFeatureFirstUse } from '@/utils/growthTracking';
import { useWordHuntCompletion } from './survival/useWordHuntCompletion';
import { useWordHuntPuzzleInit } from './survival/useWordHuntPuzzleInit';
import { COACH_VERSION, hasSeenCoach, markCoachSeen } from '@/lib/tutorial/modeCoachStore';
import { useDailyChallengeUrlParams } from './useDailyChallengeUrlParams';
import { isCatchUpDate, shouldGateCatchUpBehindAd } from '@/utils/dailyChallenge/catchUp';
import { useRetryChallenge } from './useRetryChallenge';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import PracticeBadge from '@/components/practice/PracticeBadge';
import { useNetworkState } from '@/hooks/useNetworkState';
import { usePrefetchDailyContent } from '@/hooks/usePrefetchDailyContent';
import DailyOfflineFallback from '@/components/offline/DailyOfflineFallback';
import type { LetterGrid, Language } from '@/types';
import SessionRevealHost from '@/components/avatar/reveal/SessionRevealHost';

export type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played' | 'offline-miss';

const DailyChallenge: React.FC = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const { unlockAudio, stopMusic } = useMusic();
  // Survival starts the game music and fades to BOSSA at game over; the results
  // screen keeps it. Leaving the route is the only stop — without it the track
  // looped on the hub and every page after.
  useEffect(() => () => stopMusic(500), [stopMusic]);
  const { recordWin: recordStreak } = useWinStreak();
  const isPractice = usePracticeFlag();
  const { showInterstitial } = useInterstitialAd();
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
  const [puzzleDate, setPuzzleDate] = useState<string>('');
  const [puzzleNumber, setPuzzleNumber] = useState<number>(() => getPuzzleNumber());
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
  const gameStartedAtRef = useRef<number>(0);
  // One rewarded ad unlocks one catch-up date; reset when the date changes so
  // each missed day is its own watch (and today's daily is never gated).
  const catchupAdUnlockedRef = useRef<boolean>(false);
  useEffect(() => {
    catchupAdUnlockedRef.current = false;
  }, [catchupDate]);

  useWordHuntPuzzleInit({
    gameLanguage, wasReset, isAuthenticated, profileId: profile?.id ?? null, catchupDate, isPractice, online,
    setPhase, setPuzzleDate, setPuzzleNumber, setForfeitedToday, setStoredResult, setGrid, setTargetWord, setMeaning,
  });

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

  // Returning players ("already play this kind of challenge") don't need the
  // intro/ready page — jump straight into gameplay. First-time players and
  // incoming friend-challenge deep links still see the ready screen (the
  // challenge banner needs to render). Guarded by a ref so it only fires once
  // per puzzle load, not on every re-render while phase stays 'ready'.
  const autoSkippedReadyRef = useRef(false);
  useEffect(() => {
    autoSkippedReadyRef.current = false;
  }, [gameLanguage, catchupDate]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (isPractice || isCatchup) return;
    if (autoSkippedReadyRef.current) return;
    const isValidChallenge = challengeData && challengeData.puzzleNumber === puzzleNumber;
    if (isValidChallenge) return;
    if (!hasEverPlayedWordHunt(gameLanguage)) return;

    autoSkippedReadyRef.current = true;
    handleStartGame();
  }, [phase, isPractice, isCatchup, challengeData, puzzleNumber, gameLanguage, handleStartGame]);

  const showResults = useCallback(() => setPhase('completed'), []);
  const handleGameComplete = useWordHuntCompletion({
    isPractice, isCatchup, puzzleNumber, puzzleDate, gameLanguage, meaning, extraTries, isAuthenticated,
    gameStartedAtRef, recordStreak, showInterstitial, setGameResult, setStoredResult, onShowResults: showResults, t,
  });

  // First visit: the interactive how-to-play opens once and replaces the in-game coach card.
  const [onboardedThisVisit, setOnboardedThisVisit] = useState(false);
  useEffect(() => {
    if (phase !== 'ready' || onboardedThisVisit || hasEverPlayedWordHunt(gameLanguage)) return;
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage || hasSeenCoach('wordHunt', COACH_VERSION, storage)) return;
    markCoachSeen('wordHunt', COACH_VERSION, storage);
    setOnboardedThisVisit(true);
    setShowTutorial(true);
  }, [phase, onboardedThisVisit, gameLanguage]);

  const closeTutorial = useCallback(() => setShowTutorial(false), []);
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
      className={`flex-1 flex flex-col min-h-0 h-dvh max-h-dvh w-full max-w-[100vw] bg-neo-navy relative overflow-x-clip overflow-hidden ${seasonSkin}`}
    >
      {/* Collapse the in-game header spacer so the focused Word Hunt screen has no
          empty band at the top (the header is hidden during play anyway). */}
      <AutoHideHeader collapseSpacerWhenHidden />
      <SessionRevealHost />

      {phase === 'playing' && isPractice && (
        <div className="absolute top-3 end-3 z-30 pointer-events-none">
          <PracticeBadge />
        </div>
      )}

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
            onLanguageChange={setGameLanguage}
            onStart={handleStartGame}
            onBack={handleBack}
            onShowTutorial={handleShowTutorial}
            t={t}
          />
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
            hideModeCoach={onboardedThisVisit}
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
        <DailyChallengeTutorial onComplete={closeTutorial} onSkip={closeTutorial} />
      )}
    </div>
  );
};

export default DailyChallenge;
