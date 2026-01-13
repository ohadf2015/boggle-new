'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import AutoHideHeader from '@/components/AutoHideHeader';
import DailyWordHuntSurvival, { type SurvivalGameResult } from './DailyWordHuntSurvival';
import DailyWordHuntResults from './DailyWordHuntResults';
import DailyReadyScreen, { type ChallengeData } from './DailyReadyScreen';
import { DailyChallengeTutorial } from './DailyChallengeTutorial';
import { TrainingGatewayModal } from '@/components/training';
import { shouldShowTrainingGateway, markGatewaySkipped, markGatewaySeen } from '@/utils/trainingProgressStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { NeoLoader } from '@/components/ui/NeoLoader';
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
  mapServerResultToStoredResult,
  GAME_LANGUAGE_KEY,
  getWordHuntTutorialKey,
  getWordHuntResultKey,
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
    const saved = localStorage.getItem(GAME_LANGUAGE_KEY);
    if (saved && ['en', 'he', 'sv', 'ja', 'es'].includes(saved)) {
      setGameLanguage(saved as Language);
    }
    setIsLanguageInitialized(true);
  }, []);

  // Persist game language to localStorage (only after initial load to avoid overwriting saved value)
  useEffect(() => {
    if (isLanguageInitialized) {
      localStorage.setItem(GAME_LANGUAGE_KEY, gameLanguage);
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

  // Ref to track if we just completed a retry reset - survives re-renders
  // Used to skip "already played" checks immediately after a paid retry
  const justResetRef = useRef(false);

  // Guest fingerprint for leaderboard
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);

  // Training gateway modal for new players
  const [showTrainingGateway, setShowTrainingGateway] = useState(false);
  // Track if gateway was already shown this session to prevent re-showing
  const [gatewayShownThisSession, setGatewayShownThisSession] = useState(false);

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
        markGatewaySeen(); // Mark as seen in localStorage so it only shows once per user
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

  // Track previous values for smarter re-initialization
  const prevGameLanguageRef = React.useRef<Language | null>(null);
  const prevWasResetRef = React.useRef<boolean>(false);

  // Initialize Word Hunt daily challenge
  useEffect(() => {
    let isMounted = true;

    // Determine if we need a full reload (new puzzle) vs just a re-check (auth changed)
    const languageChanged = prevGameLanguageRef.current !== null && prevGameLanguageRef.current !== gameLanguage;
    const wasJustReset = wasReset && !prevWasResetRef.current;
    const needsFullReload = languageChanged || wasJustReset || prevGameLanguageRef.current === null;

    // Update refs for next comparison
    prevGameLanguageRef.current = gameLanguage;
    prevWasResetRef.current = wasReset;

    // Only set loading phase when we need a full puzzle reload
    // Skip setting loading when just auth state changes (prevents infinite loading)
    if (needsFullReload) {
      setPhase('loading');
    }

    const initializePuzzle = async () => {
      const date = getDailyChallengeDate();
      const number = getPuzzleNumber(date);

      if (!isMounted) return;

      setPuzzleDate(date);
      setPuzzleNumber(number);

      // Check if tutorial has been completed
      const tutorialKey = getWordHuntTutorialKey(gameLanguage);
      const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
      setTutorialCompleted(hasCompletedTutorial);

      // Skip "already played" checks if we just reset (paid retry)
      // The server reset may not have propagated yet, so we trust the reset action
      if (!wasJustReset) {
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
                const serverResult = mapServerResultToStoredResult(
                  checkData.result,
                  date,
                  number,
                  gameLanguage
                );

                // Sync localStorage with server data
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
          // Log but don't block - if server check fails, fall back to local-only check
          console.warn('Failed to check server for existing attempt:', checkError);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally using profile?.id instead of profile to prevent infinite re-init when profile object reference changes
  }, [gameLanguage, wasReset, isAuthenticated, profile?.id]); // Re-initialize when game language changes, admin reset, or auth state changes

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

    // Skip all checks if we just completed a paid retry reset
    // This prevents race condition where server check finds old record before deletion propagates
    if (justResetRef.current) {
      justResetRef.current = false; // Clear the flag
      setPhase('playing');
      return;
    }

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
              const serverResult = mapServerResultToStoredResult(
                checkData.result,
                date,
                number,
                gameLanguage
              );
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

    // Save result to localStorage and update streak (only for authenticated users)
    const updatedStreak = saveWordHuntResult(wordHuntResult, isAuthenticated);

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
  }, [puzzleNumber, puzzleDate, gameLanguage, isAuthenticated]);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    const tutorialKey = getWordHuntTutorialKey(gameLanguage);
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

      // Mark that we just reset - this prevents the "already played" check
      // from blocking the user when they click Play after a paid retry
      justResetRef.current = true;

      // Reset state for fresh start
      setStoredResult(null);
      setGameResult(null);

      // IMPORTANT: Set wasReset to trigger puzzle re-initialization
      // This ensures the init effect skips "already played" server checks
      setWasReset(true);

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
      className="flex flex-col min-h-full bg-gray-100 dark:bg-neo-navy relative overflow-hidden"
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
            <NeoLoader variant="mascot-letters" size="lg" text={t('daily.loading')} />
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
    </div>
  );
};

export default DailyChallenge;
