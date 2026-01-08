'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Globe, ChevronDown, Trophy, Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import AutoHideHeader from '@/components/AutoHideHeader';
import DailyWordHuntSurvival, { type SurvivalGameResult } from './DailyWordHuntSurvival';
import DailyWordHuntResults from './DailyWordHuntResults';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import GuestNameEditor from './GuestNameEditor';
import { DailyChallengeTutorial } from './DailyChallengeTutorial';
import DailyIntroCarousel from './DailyIntroCarousel';
import { TrainingGatewayModal } from '@/components/training';
import WordHuntLoginModal from '@/components/auth/WordHuntLoginModal';
import { shouldShowTrainingGateway, markGatewaySkipped } from '@/utils/trainingProgressStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  generateDailyPuzzle,
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  hasPlayedWordHuntToday,
  getTodaysWordHuntResult,
  saveWordHuntResult,
  getDailyStreak,
  parseChallengeParam,
  clearWordHuntResultForRetry,
  getGuestFingerprint,
  type WordHuntResult,
  type StoredWordHuntResult,
} from '@/utils/dailyChallenge';
import { neoSuccessToast, neoErrorToast } from '@/components/NeoToast';
import { useSearchParams } from 'next/navigation';
import {
  hasPlayedAnyGame,
} from '@/utils/playerProgressStorage';
import type { LetterGrid, Language } from '@/types';

// Retry token validation response type
interface RetryTokenValidation {
  valid: boolean;
  reason?: string;
  puzzleDate?: string;
  language?: string;
  todayDate?: string;
}

export type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

/**
 * DailyChallenge - Main container for the daily puzzle
 * Same puzzle for everyone worldwide each day
 */
// Challenge data from URL parameter
interface ChallengeData {
  puzzleNumber: number;
  attemptsUsed: number;
  solved: boolean;
  efficiencyScore: number;
  wordsDiscovered: number;
}

const DailyChallenge: React.FC = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const searchParams = useSearchParams();

  // Game language state - separate from UI language
  // This controls only the puzzle/dictionary language, not the UI
  // User can switch languages via the dropdown during the session
  // Initialize with URL locale to avoid hydration mismatch (localStorage is read in useEffect)
  const urlLocale = language as Language;
  const defaultLanguage = urlLocale && ['en', 'he', 'sv', 'ja', 'es'].includes(urlLocale)
    ? urlLocale
    : 'en';
  const [gameLanguage, setGameLanguage] = useState<Language>(defaultLanguage);
  const [isLanguageInitialized, setIsLanguageInitialized] = useState(false);

  // Load saved game language from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('lexiclash_daily_game_language');
    if (saved && ['en', 'he', 'sv', 'ja', 'es'].includes(saved)) {
      setGameLanguage(saved as Language);
    }
    setIsLanguageInitialized(true);
  }, []);

  // Persist game language to localStorage (only after initial load to avoid overwriting saved value)
  useEffect(() => {
    if (isLanguageInitialized) {
      localStorage.setItem('lexiclash_daily_game_language', gameLanguage);
    }
  }, [gameLanguage, isLanguageInitialized]);

  // Get current language flag
  const getCurrentFlag = (lang: Language) => {
    const flags: Record<string, string> = {
      en: '🇺🇸',
      he: '🇮🇱',
      sv: '🇸🇪',
      ja: '🇯🇵',
      es: '🇪🇸',
    };
    return flags[lang] || '🌐';
  };

  // Challenge state (from URL parameter)
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);

  // Phase management
  const [phase, setPhase] = useState<DailyChallengePhase>('loading');

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  // Daily challenge state
  const [puzzleDate, setPuzzleDate] = useState<string>('');
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [targetWord, setTargetWord] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');

  // Results
  const [storedResult, setStoredResult] = useState<StoredWordHuntResult | null>(null);
  const [gameResult, setGameResult] = useState<SurvivalGameResult | null>(null);

  // State to track if we just reset
  const [wasReset, setWasReset] = useState(false);

  // Guest fingerprint for leaderboard
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);

  // Training gateway modal for new players
  const [showTrainingGateway, setShowTrainingGateway] = useState(false);
  // Track if gateway was already shown this session to prevent re-showing
  const [gatewayShownThisSession, setGatewayShownThisSession] = useState(false);

  // Word hunt login modal for unauthenticated players
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fetch guest fingerprint on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
  }, []);

  // Check if we should show training gateway for new players
  useEffect(() => {
    // Only show when page loads in ready phase (not during game or results)
    if (phase !== 'ready') return;

    // Don't show again if already shown this session
    if (gatewayShownThisSession) return;

    // Check if player should see training gateway
    const shouldShow = shouldShowTrainingGateway();

    // Show modal if new player and hasn't passed/skipped
    if (shouldShow) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setShowTrainingGateway(true);
        setGatewayShownThisSession(true); // Mark as shown this session
      }, 500);
      return () => clearTimeout(timer);
    }
    return;
  }, [phase, gatewayShownThisSession]);

  // Handle skipping training gateway
  const handleSkipTrainingGateway = useCallback(() => {
    markGatewaySkipped();
    setShowTrainingGateway(false);
  }, []);

  // Show login modal for unauthenticated users when ready phase is reached
  useEffect(() => {
    if (phase === 'ready' && !isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [phase, isAuthenticated]);

  // Pull-to-refresh - disabled during gameplay
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 60,
    enabled: phase !== 'playing', // Disable during gameplay
  });

  // Parse challenge parameter and handle admin reset from URL
  useEffect(() => {
    const challengeParam = searchParams.get('challenge');
    if (challengeParam) {
      const parsed = parseChallengeParam(challengeParam);
      if (parsed) {
        setChallengeData(parsed);
      }
    }

    // Handle admin reset: ?reset=true clears both localStorage AND server-side attempt
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true' && typeof window !== 'undefined') {
      let isMounted = true;

      const performReset = async () => {
        try {
          // Get today's date for the API call
          const today = new Date().toISOString().split('T')[0];

          // Build reset request body with player credentials
          const resetBody: { puzzleDate: string; language: string; playerId?: string; guestFingerprint?: string } = {
            puzzleDate: today,
            language: gameLanguage,
          };

          if (isAuthenticated && profile) {
            resetBody.playerId = profile.id;
          } else {
            const fp = await getGuestFingerprint();
            if (fp) {
              resetBody.guestFingerprint = fp;
            }
          }

          // Delete server-side attempt record
          let serverReset = false;
          if (resetBody.playerId || resetBody.guestFingerprint) {
            try {
              const resetResponse = await fetch('/api/daily/reset-attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetBody),
              });
              const resetResult = await resetResponse.json();
              serverReset = resetResult.success && (resetResult.deleted > 0);
            } catch (serverError) {
              console.warn('Failed to reset server attempt:', serverError);
            }
          }

          if (!isMounted) return;

          // Clear the localStorage for this game language
          const localCleared = clearWordHuntResultForRetry(gameLanguage);

          if (localCleared || serverReset) {
            setWasReset(true);
            // Show success toast
            neoSuccessToast(t('daily.attemptReset'), { icon: '🔄', duration: 4000 });
          }
        } catch (error) {
          console.error('Reset error:', error);
        }

        // Clean up URL by removing the reset parameter (always, even on error)
        if (isMounted && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('reset');
          window.history.replaceState({}, '', url.toString());
        }
      };

      performReset();

      return () => {
        isMounted = false;
      };
    }

    // Handle retry token: ?retryToken={token} validates and clears localStorage
    const retryToken = searchParams.get('retryToken');
    if (retryToken && typeof window !== 'undefined') {
      let isMounted = true;

      // Validate the token via API
      const validateRetryToken = async () => {
        try {
          const response = await fetch(`/api/daily/validate-retry-token?token=${encodeURIComponent(retryToken)}`);
          const data: RetryTokenValidation = await response.json();

          // Check if component is still mounted before updating state
          if (!isMounted) return;

          if (data.valid) {
            // Token is valid - reset both localStorage and server-side attempts
            // IMPORTANT: Must await server reset before allowing puzzle to initialize
            // to prevent race condition where server check finds existing attempt

            // Record token usage and reset server-side attempts first
            const resetBody: { token: string; playerId?: string; guestFingerprint?: string } = { token: retryToken };
            if (isAuthenticated && profile) {
              resetBody.playerId = profile.id;
            } else {
              const fp = await getGuestFingerprint();
              if (fp) {
                resetBody.guestFingerprint = fp;
              }
            }

            try {
              const resetResponse = await fetch('/api/daily/validate-retry-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetBody),
              });
              const resetResult = await resetResponse.json();

              if (!isMounted) return;

              // Now clear localStorage after server reset succeeded
              const cleared = clearWordHuntResultForRetry(gameLanguage);

              // Set wasReset to trigger puzzle re-initialization
              setWasReset(true);

              if (resetResult.attemptsReset > 0 || cleared) {
                neoSuccessToast(t('daily.retryLinkUsed'), { icon: '🔓', duration: 4000 });
              } else {
                // No previous attempt to clear, but still allow playing
                neoSuccessToast(t('daily.retryLinkReady'), { icon: '🎯', duration: 3000 });
              }
            } catch (resetError) {
              console.warn('Failed to reset server attempt:', resetError);
              // Still try to proceed with localStorage clear
              if (!isMounted) return;
              clearWordHuntResultForRetry(gameLanguage);
              setWasReset(true);
              neoSuccessToast(t('daily.retryLinkReady'), { icon: '🎯', duration: 3000 });
            }
          } else {
            // Token is invalid - show appropriate error message
            if (data.reason === 'expired') {
              neoErrorToast(t('daily.retryLinkExpired'), { icon: '⏰', duration: 5000 });
            } else if (data.reason === 'wrong_date') {
              neoErrorToast(t('daily.retryLinkWrongDate'), { icon: '📅', duration: 5000 });
            } else {
              neoErrorToast(t('daily.retryLinkInvalid'), { icon: '❌', duration: 5000 });
            }
          }
        } catch (error) {
          console.error('Failed to validate retry token:', error);
          if (isMounted) {
            neoErrorToast(t('daily.retryLinkError'), { icon: '⚠️', duration: 5000 });
          }
        }

        // Clean up URL by removing the retryToken parameter (only if mounted)
        if (isMounted && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('retryToken');
          window.history.replaceState({}, '', url.toString());
        }
      };

      validateRetryToken();

      return () => {
        isMounted = false;
      };
    }
    return undefined;
  }, [searchParams, gameLanguage, t, isAuthenticated, profile]);

  // Initialize Word Hunt daily challenge
  useEffect(() => {
    let isMounted = true;

    // Set loading phase to ensure clean transition when language changes
    // This forces React to re-render and show the correct screen for the new language
    setPhase('loading');

    const initializePuzzle = async () => {
      const date = getDailyChallengeDate();
      const number = getPuzzleNumber(date);

      if (!isMounted) return;

      setPuzzleDate(date);
      setPuzzleNumber(number);

      // Check if tutorial has been completed
      const tutorialKey = `lexiclash_wordHunt_tutorial_completed_${gameLanguage}`;
      const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
      setTutorialCompleted(hasCompletedTutorial);

      // Quick check: If localStorage says already played, show results immediately
      // (Server check below will catch cases where localStorage was cleared)
      const localResult = getTodaysWordHuntResult(gameLanguage);
      if (localResult) {
        if (!isMounted) return;
        setStoredResult(localResult);
        setPhase('already-played');
        return;
      }

      // Server-side check: Verify with Supabase if player has already played
      // This catches cases where localStorage was cleared but player already submitted
      try {
        const fp = await getGuestFingerprint();
        const checkParams = new URLSearchParams();
        if (isAuthenticated && profile) {
          checkParams.set('playerId', profile.id);
        } else if (fp) {
          checkParams.set('guestFingerprint', fp);
        }

        if (checkParams.toString()) {
          const checkResponse = await fetch(
            `/api/daily-challenge/word-hunt/check-played/${date}/${gameLanguage}?${checkParams.toString()}`
          );

          if (!isMounted) return;

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.hasPlayed && checkData.result) {
              // Player already played - reconstruct stored result from server data
              const serverResult: StoredWordHuntResult = {
                date,
                puzzleNumber: number,
                result: {
                  puzzleNumber: number,
                  puzzleDate: date,
                  language: gameLanguage,
                  solved: checkData.result.solved,
                  attemptsUsed: checkData.result.attemptsUsed,
                  targetWord: checkData.result.targetWord,
                  attempts: checkData.result.attempts || [],
                  wordsDiscovered: checkData.result.wordsDiscovered || [],
                  lifeRemaining: checkData.result.lifeRemaining || 0,
                  clueTokensEarned: 0,
                  clueTokensSpent: 0,
                  hintsUnlocked: 0,
                  efficiencyScore: checkData.result.efficiencyScore || 0,
                  streakDays: 0,
                  completedAt: checkData.result.completedAt || new Date().toISOString(),
                },
                completedAt: checkData.result.completedAt || new Date().toISOString(),
                submittedToServer: true,
              };

              // Sync localStorage with server data
              if (typeof window !== 'undefined') {
                const storageKey = `lexiclash_word_hunt_${gameLanguage}_${date}`;
                localStorage.setItem(storageKey, JSON.stringify(serverResult));
              }

              setStoredResult(serverResult);
              setPhase('already-played');
              return;
            }
          }
        }
      } catch (checkError) {
        // Log but don't block - if server check fails, fall back to local-only check
        console.warn('Failed to check server for existing attempt:', checkError);
      }

      // Player has not played yet - fetch the puzzle
      // Try to fetch puzzle from API (includes AI-selected word if available)
      try {
        const response = await fetch(`/api/daily-challenge/puzzle/${date}/${gameLanguage}`);
        if (!isMounted) return;

        if (response.ok) {
          const puzzleData = await response.json();
          if (!isMounted) return;
          setGrid(puzzleData.grid);
          setTargetWord(puzzleData.targetWord);
        } else {
          // Fall back to local generation
          const puzzle = generateDailyPuzzle(date, gameLanguage);
          if (!isMounted) return;
          setGrid(puzzle.grid);
          setTargetWord(puzzle.targetWord);
        }
      } catch {
        // Fall back to local generation on network error
        if (!isMounted) return;
        const puzzle = generateDailyPuzzle(date, gameLanguage);
        setGrid(puzzle.grid);
        setTargetWord(puzzle.targetWord);
      }

      // Go to ready screen - tutorial is available via "How to Play" button
      if (!isMounted) return;
      setPhase('ready');
    };

    initializePuzzle();

    return () => {
      isMounted = false;
    };
  }, [gameLanguage, wasReset, isAuthenticated, profile]); // Re-initialize when game language changes or admin reset clears localStorage

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const seconds = getSecondsUntilNextDaily();
      setCountdown(formatCountdown(seconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle game start - with safety check to prevent replay
  const handleStartGame = useCallback(async () => {
    // Safety check: verify user hasn't already played today
    // This prevents replay if phase state somehow becomes 'ready' when it shouldn't

    // First check localStorage (quick)
    if (hasPlayedWordHuntToday(gameLanguage)) {
      const result = getTodaysWordHuntResult(gameLanguage);
      if (result) {
        setStoredResult(result);
        setPhase('already-played');
        return;
      }
    }

    // Additional server-side check to prevent replay after localStorage clear
    try {
      const date = getDailyChallengeDate();
      const fp = await getGuestFingerprint();
      const checkParams = new URLSearchParams();
      if (isAuthenticated && profile) {
        checkParams.set('playerId', profile.id);
      } else if (fp) {
        checkParams.set('guestFingerprint', fp);
      }

      if (checkParams.toString()) {
        const checkResponse = await fetch(
          `/api/daily-challenge/word-hunt/check-played/${date}/${gameLanguage}?${checkParams.toString()}`
        );

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.hasPlayed) {
            // Player already played - redirect to results
            neoErrorToast(t('daily.alreadyPlayed') || 'You have already played today!', { icon: '🔒', duration: 3000 });

            if (checkData.result) {
              const number = getPuzzleNumber(date);
              const serverResult: StoredWordHuntResult = {
                date,
                puzzleNumber: number,
                result: {
                  puzzleNumber: number,
                  puzzleDate: date,
                  language: gameLanguage,
                  solved: checkData.result.solved,
                  attemptsUsed: checkData.result.attemptsUsed,
                  targetWord: checkData.result.targetWord,
                  attempts: checkData.result.attempts || [],
                  wordsDiscovered: checkData.result.wordsDiscovered || [],
                  lifeRemaining: checkData.result.lifeRemaining || 0,
                  clueTokensEarned: 0,
                  clueTokensSpent: 0,
                  hintsUnlocked: 0,
                  efficiencyScore: checkData.result.efficiencyScore || 0,
                  streakDays: 0,
                  completedAt: checkData.result.completedAt || new Date().toISOString(),
                },
                completedAt: checkData.result.completedAt || new Date().toISOString(),
                submittedToServer: true,
              };
              setStoredResult(serverResult);
            }

            setPhase('already-played');
            return;
          }
        }
      }
    } catch (error) {
      // If server check fails, allow playing (server will reject duplicate submissions anyway)
      console.warn('Failed to check server before game start:', error);
    }

    setPhase('playing');
  }, [gameLanguage, isAuthenticated, profile, t]);

  // Handle Word Hunt game completion
  const handleGameComplete = useCallback((result: SurvivalGameResult) => {
    // Create the Word Hunt result object (streak will be updated by saveWordHuntResult)
    const wordHuntResult: WordHuntResult = {
      puzzleNumber,
      puzzleDate,
      language: gameLanguage,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
      targetWord: result.targetWord,
      attempts: result.attempts,
      // Include survival mode fields
      wordsDiscovered: result.wordsDiscovered,
      lifeRemaining: result.lifeRemaining,
      clueTokensEarned: result.clueTokensEarned,
      clueTokensSpent: result.clueTokensSpent,
      hintsUnlocked: result.hintsUnlocked,
      efficiencyScore: result.efficiencyScore,
      streakDays: 0, // Placeholder - will be updated after save
      completedAt: new Date().toISOString(),
    };

    // Save result to localStorage and update streak
    const updatedStreak = saveWordHuntResult(wordHuntResult);

    // Update the result with the actual streak
    wordHuntResult.streakDays = updatedStreak.currentStreak;

    // Store result for display
    setGameResult(result);
    setStoredResult({
      date: puzzleDate,
      puzzleNumber,
      result: wordHuntResult,
      completedAt: new Date().toISOString(),
    });

    setPhase('completed');
  }, [puzzleNumber, puzzleDate, gameLanguage]);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    const tutorialKey = `lexiclash_wordHunt_tutorial_completed_${gameLanguage}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(tutorialKey, 'true');
    }
    setTutorialCompleted(true);
    setShowTutorial(false);
  }, [gameLanguage]);

  // Handle tutorial skip
  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // Handle showing tutorial manually
  const handleShowTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // Handle going back
  const handleBack = useCallback(() => {
    window.location.href = `/${language}`;
  }, [language]);

  // Handle retry challenge (paid with coins)
  const handleRetryChallenge = useCallback(async () => {
    try {
      const today = getDailyChallengeDate();

      // Build reset request body with player credentials
      const resetBody: { puzzleDate: string; language: string; playerId?: string; guestFingerprint?: string } = {
        puzzleDate: today,
        language: gameLanguage,
      };

      if (isAuthenticated && profile) {
        resetBody.playerId = profile.id;
      } else {
        const fp = await getGuestFingerprint();
        if (fp) {
          resetBody.guestFingerprint = fp;
        }
      }

      // Delete server-side attempt record
      if (resetBody.playerId || resetBody.guestFingerprint) {
        try {
          const resetResponse = await fetch('/api/daily/reset-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resetBody),
          });
          const resetResult = await resetResponse.json();
          if (!resetResult.success) {
            console.warn('Server reset returned failure:', resetResult);
          }
        } catch (serverError) {
          console.warn('Failed to reset server attempt:', serverError);
          // Continue anyway - local reset is more important
        }
      }

      // Clear the stored result for today
      const cleared = clearWordHuntResultForRetry(gameLanguage);
      if (!cleared) {
        console.error('Failed to clear Word Hunt result for retry');
        neoErrorToast(t('daily.retryFailed') || 'Failed to reset. Please try again.', { icon: '❌', duration: 4000 });
        return;
      }

      // Reset state for fresh start
      setStoredResult(null);
      setGameResult(null);
      setPhase('ready');

      // Show success feedback
      neoSuccessToast(t('daily.attemptReset') || 'Challenge reset! Good luck!', { icon: '🔄', duration: 3000 });
    } catch (error) {
      console.error('Retry challenge error:', error);
      neoErrorToast(t('daily.retryFailed') || 'Failed to reset. Please try again.', { icon: '❌', duration: 4000 });
    }
  }, [gameLanguage, isAuthenticated, profile, t]);

  // Render based on phase
  return (
    <div
      className="flex flex-col min-h-full bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative"
      {...pullToRefreshHandlers}
    >
      {/* Pull-to-refresh indicator - only show when not playing */}
      {phase !== 'playing' && (
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />
      )}

      <AutoHideHeader />

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-3">
                <div className="absolute inset-0 border-4 border-neo-yellow/30 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-neo-yellow rounded-full animate-spin" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">{t('daily.loading')}</p>
            </div>
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

      {/* Tutorial Modal */}
      {showTutorial && (
        <DailyChallengeTutorial
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* Training Gateway Modal for New Players */}
      <TrainingGatewayModal
        isOpen={showTrainingGateway}
        onClose={() => setShowTrainingGateway(false)}
        onSkip={handleSkipTrainingGateway}
        returnTo="daily"
      />

      {/* Word Hunt Login Modal for Unauthenticated Players */}
      <WordHuntLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

// ==========================================
// Ready Screen Component
// ==========================================

// Language options
const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
];

interface DailyReadyScreenProps {
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  currentFlag: string;
  challengeData: ChallengeData | null;
  isAuthenticated: boolean;
  targetWordLength: number;
  currentPlayerId: string | null;
  guestFingerprint: string | null;
  tutorialCompleted: boolean;
  onLanguageChange: (lang: Language) => void;
  onStart: () => void;
  onBack: () => void;
  onShowTutorial: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const DailyReadyScreen: React.FC<DailyReadyScreenProps> = ({
  puzzleNumber,
  puzzleDate,
  language,
  currentFlag,
  challengeData,
  isAuthenticated,
  targetWordLength,
  currentPlayerId,
  guestFingerprint,
  tutorialCompleted,
  onLanguageChange,
  onStart,
  onBack,
  onShowTutorial,
  t,
}) => {
  const searchParams = useSearchParams();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Auto-open leaderboard if showLeaderboard query param is present
  useEffect(() => {
    const shouldShowLeaderboard = searchParams.get('showLeaderboard');
    if (shouldShowLeaderboard === 'true') {
      setShowLeaderboard(true);
      // Clean up URL by removing the query parameter after opening
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('showLeaderboard');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

  // Check if this is a valid challenge (same puzzle number)
  const isValidChallenge = challengeData && challengeData.puzzleNumber === puzzleNumber;

  // Calculate how many languages have been completed today
  const completedLanguagesCount = useMemo(() => {
    return LANGUAGE_OPTIONS.filter(option => hasPlayedWordHuntToday(option.code)).length;
  }, []);

  const formattedDate = useMemo(() => {
    try {
      return new Date(puzzleDate + 'T00:00:00Z').toLocaleDateString(language, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return puzzleDate;
    }
  }, [puzzleDate, language]);

  return (
    <motion.div
      key="ready"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-start pt-28 sm:pt-32 pb-24 lg:pb-4 px-4"
    >
      {/* Top bar with back and language */}
      <div className="absolute top-20 sm:top-24 left-4 right-4 flex items-center justify-between">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>

        {/* Language Selector */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            onBlur={() => setTimeout(() => setShowLangDropdown(false), 200)}
            className="relative flex items-center gap-2 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all min-w-[44px] min-h-[44px]"
          >
            <span className="text-lg">{currentFlag}</span>
            <Globe className="w-4 h-4 text-neo-black" />
            <ChevronDown className={`w-3 h-3 text-neo-black transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
            {completedLanguagesCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-neo-lime text-neo-black rounded-full border-2 border-neo-black flex items-center justify-center text-xs font-black">
                {completedLanguagesCount}
              </span>
            )}
          </Button>

          <AnimatePresence>
            {showLangDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 z-[100] bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-lg overflow-hidden min-w-[140px]"
                onMouseDown={(e) => e.preventDefault()}
              >
                {LANGUAGE_OPTIONS.map((option) => {
                  const hasPlayed = hasPlayedWordHuntToday(option.code);
                  return (
                    <button
                      key={option.code}
                      onClick={() => {
                        onLanguageChange(option.code);
                        setShowLangDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neo-cyan/30 transition-colors ${
                        language === option.code ? 'bg-neo-cyan/50 font-bold' : ''
                      }`}
                    >
                      <span className="text-lg">{option.flag}</span>
                      <span className="text-sm text-neo-black">{option.name}</span>
                      {hasPlayed && (
                        <Check className="w-4 h-4 ml-auto text-neo-lime" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main content - SIMPLIFIED */}
      <div className="max-w-md w-full text-center space-y-5">
        {/* Challenge Banner (when arriving via challenge link) */}
        {isValidChallenge && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring' }}
            className="w-full max-w-sm mx-auto bg-indigo-600 rounded-neo border-3 border-neo-black shadow-hard p-4"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🎯</span>
              <span className="font-black text-white text-lg">{t('wordHunt.results.challengeTitle')}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-black text-white">
                  {challengeData.solved ? challengeData.attemptsUsed : 'X'}/10
                </div>
                <div className="text-xs text-white/80">{t('wordHunt.results.attempts')}</div>
              </div>
              {challengeData.wordsDiscovered > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{challengeData.wordsDiscovered}</div>
                  <div className="text-xs text-white/80">{t('wordHunt.survival.wordsLabel')}</div>
                </div>
              )}
            </div>
            <div className="text-center mt-2 text-white/90 text-sm font-bold">
              {t('wordHunt.results.beatTheirScore')}
            </div>
          </motion.div>
        )}

        {/* Hero Section - Puzzle Number (LARGE) */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {/* Daily Badge - Simple text, no box */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: 'spring' }}
            className="inline-flex items-center gap-2"
          >
            <Target className="w-6 h-6 text-amber-500" />
            <span className="text-2xl font-black text-neo-black dark:text-white uppercase tracking-wide">
              {t('daily.badge')}
            </span>
          </motion.div>

          {/* Challenge number and date - subtle styling */}
          <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
            <span className="text-lg font-bold">#{puzzleNumber}</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm">{formattedDate}</span>
          </div>
        </motion.div>

        {/* Animated Tutorial Carousel */}
        {targetWordLength > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <DailyIntroCarousel targetWordLength={targetWordLength} />
          </motion.div>
        )}

        {/* START BUTTON - PROMINENT */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          <Button
            onClick={onStart}
            className="w-full py-7 text-2xl font-black uppercase bg-emerald-500 text-white border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-sm transition-all"
          >
            {t('daily.playButton')}
          </Button>
        </motion.div>

        {/* Secondary Actions - Collapsed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={onShowTutorial}
            className={`text-sm font-bold transition-colors flex items-center gap-1 ${
              !tutorialCompleted
                ? 'text-neo-pink dark:text-neo-pink-light hover:text-neo-pink-dark'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>?</span> {t('daily.howToPlay')}
            {!tutorialCompleted && (
              <span className="relative flex h-2 w-2 ml-1">
                <span className="absolute inline-flex h-full w-full rounded-full bg-neo-pink opacity-75 animate-ping text-neo-white" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-pink text-neo-white" />
              </span>
            )}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            <Trophy className="w-3 h-3" /> {t('daily.todaysPlayers')}
          </button>
        </motion.div>

        {/* Collapsible Leaderboard */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <TabbedDailyLeaderboard
                puzzleDate={puzzleDate}
                language={language}
                currentPlayerId={currentPlayerId}
                currentGuestFingerprint={guestFingerprint}
                maxVisible={5}
                compact
                t={t}
                defaultTab="today"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {t('daily.samePuzzle')}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default DailyChallenge;
