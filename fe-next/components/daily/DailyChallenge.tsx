'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from '@/hooks/useSafeTimeout';
import { motion, AnimatePresence } from 'framer-motion';

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
  type WordHuntResult,
  type StoredWordHuntResult,
} from '@/utils/dailyChallenge';
import { neoErrorToast } from '@/components/NeoToast';
import { trackDailyPuzzle, trackFeatureFirstUse } from '@/utils/growthTracking';
import { useDailyChallengeUrlParams } from './useDailyChallengeUrlParams';
import { useRetryChallenge } from './useRetryChallenge';
import type { LetterGrid, Language } from '@/types';

export type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

const DailyChallenge: React.FC = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const { unlockAudio } = useMusic();
  const { recordWin: recordStreak } = useWinStreak();

  // Game language state
  const urlLocale = language as Language;
  const defaultLanguage = urlLocale && ['en', 'he', 'sv', 'ja', 'es'].includes(urlLocale)
    ? urlLocale
    : 'en';
  const [gameLanguage, setGameLanguage] = useState<Language>(defaultLanguage);

  const getCurrentFlag = (lang: Language) => {
    const flags: Record<string, string> = { en: '🇺🇸', he: '🇮🇱', sv: '🇸🇪', ja: '🇯🇵', es: '🇪🇸' };
    return flags[lang] || '🌐';
  };

  // Challenge state
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
  const [phase, setPhase] = useState<DailyChallengePhase>('loading');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [puzzleDate, setPuzzleDate] = useState<string>('');
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [targetWord, setTargetWord] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');
  const [storedResult, setStoredResult] = useState<StoredWordHuntResult | null>(null);
  const [, setGameResult] = useState<SurvivalGameResult | null>(null);
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
      const date = getDailyChallengeDate();
      const number = getPuzzleNumber(date);
      if (!isMounted) return;
      setPuzzleDate(date);
      setPuzzleNumber(number);

      const tutorialKey = getWordHuntTutorialKey(gameLanguage);
      const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
      setTutorialCompleted(hasCompletedTutorial);

      if (!wasJustReset) {
        const localResult = getTodaysWordHuntResult(gameLanguage);
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

      try {
        const response = await fetch(`/api/daily-challenge/puzzle/${date}/${gameLanguage}`);
        if (!isMounted) return;
        if (response.ok) {
          const puzzleData = await response.json();
          if (!isMounted) return;
          setGrid(puzzleData.grid);
          setTargetWord(puzzleData.targetWord);
        } else {
          const puzzle = generateDailyPuzzle(date, gameLanguage);
          if (!isMounted) return;
          setGrid(puzzle.grid);
          setTargetWord(puzzle.targetWord);
        }
      } catch {
        if (!isMounted) return;
        const puzzle = generateDailyPuzzle(date, gameLanguage);
        setGrid(puzzle.grid);
        setTargetWord(puzzle.targetWord);
      }

      if (!isMounted) return;
      setPhase('ready');
    };

    initializePuzzle();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLanguage, wasReset, isAuthenticated, profile?.id]);

  // Countdown timer
  useInterval(() => {
    const seconds = getSecondsUntilNextDaily();
    setCountdown(formatTimeHHMMSS(seconds));
  }, 1000);

  // Handle game start with safety checks
  const handleStartGame = useCallback(async () => {
    unlockAudio();

    if (justResetRef.current) {
      justResetRef.current = false;
      setPhase('playing');
      return;
    }

    if (hasPlayedWordHuntToday(gameLanguage)) {
      const result = getTodaysWordHuntResult(gameLanguage);
      if (result) {
        setStoredResult(result);
        setPhase('already-played');
        return;
      }
    }

    try {
      const date = getDailyChallengeDate();
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

    trackDailyPuzzle('opened', 'word_hunt');
    trackFeatureFirstUse('daily_word_hunt');
    setPhase('playing');
  }, [gameLanguage, isAuthenticated, profile, t, unlockAudio, justResetRef]);

  // Handle game completion
  const handleGameComplete = useCallback((result: SurvivalGameResult) => {
    const wordHuntResult: WordHuntResult = {
      puzzleNumber,
      puzzleDate,
      language: gameLanguage,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
      targetWord: result.targetWord,
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
                t,
              });
            });
          }
        })
        .catch(() => { /* non-critical */ });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from LanguageContext
}, [puzzleNumber, puzzleDate, gameLanguage, isAuthenticated, recordStreak]);

  const handleTutorialComplete = useCallback(() => {
    const tutorialKey = getWordHuntTutorialKey(gameLanguage);
    if (typeof window !== 'undefined') localStorage.setItem(tutorialKey, 'true');
    setTutorialCompleted(true);
    setShowTutorial(false);
  }, [gameLanguage]);

  const handleTutorialSkip = useCallback(() => setShowTutorial(false), []);
  const handleShowTutorial = useCallback(() => setShowTutorial(true), []);
  const handleBack = useCallback(() => { window.location.href = `/${language}`; }, [language]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 h-dvh max-h-dvh bg-gray-100 dark:bg-neo-navy relative overflow-x-clip overflow-hidden"
    >
      <AutoHideHeader />

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center">
            <PageLoader size="lg" text={t('daily.loading')} />
          </motion.div>
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

        {phase === 'playing' && grid && targetWord && (
          <DailyWordHuntSurvival
            grid={grid}
            puzzleNumber={puzzleNumber}
            language={gameLanguage}
            targetWord={targetWord}
            onComplete={handleGameComplete}
            onQuit={handleBack}
            puzzleDate={puzzleDate}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
          />
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
