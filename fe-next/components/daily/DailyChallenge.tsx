'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, ChevronDown, Trophy, Target, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import DailyWordHuntSurvival from './DailyWordHuntSurvival';
import DailyWordHuntResults from './DailyWordHuntResults';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import GuestNameEditor from './GuestNameEditor';
import { DailyChallengeTutorial } from './DailyChallengeTutorial';
import DailyIntroCarousel from './DailyIntroCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
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
import type { LetterGrid, Language } from '@/types';
import type { SurvivalGameResult } from './DailyWordHuntSurvival';

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
  const { t, language, setLanguage } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const searchParams = useSearchParams();

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
  const isLandscape = useMobileLandscape();

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

  // Fetch guest fingerprint on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
  }, []);

  // Parse challenge parameter and handle admin reset from URL
  useEffect(() => {
    const challengeParam = searchParams.get('challenge');
    if (challengeParam) {
      const parsed = parseChallengeParam(challengeParam);
      if (parsed) {
        setChallengeData(parsed);
      }
    }

    // Handle admin reset: ?reset=true clears localStorage so player can replay
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true' && typeof window !== 'undefined') {
      // Clear the localStorage for this language
      const cleared = clearWordHuntResultForRetry(language as Language);
      if (cleared) {
        setWasReset(true);
        // Show success toast
        neoSuccessToast(t('daily.attemptReset'), { icon: '🔄', duration: 4000 });
        // Clean up URL by removing the reset parameter
        const url = new URL(window.location.href);
        url.searchParams.delete('reset');
        window.history.replaceState({}, '', url.toString());
      }
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
            // Token is valid - clear localStorage and allow replay
            const cleared = clearWordHuntResultForRetry(language as Language);
            if (cleared) {
              setWasReset(true);
              neoSuccessToast(t('daily.retryLinkUsed'), { icon: '🔓', duration: 4000 });
            } else {
              // No previous attempt to clear, but still allow playing
              neoSuccessToast(t('daily.retryLinkReady'), { icon: '🎯', duration: 3000 });
            }

            // Record token usage
            fetch('/api/daily/validate-retry-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: retryToken }),
            }).catch(() => {
              // Ignore errors - token usage tracking is non-critical
            });
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
  }, [searchParams, language, t]);

  // Initialize Word Hunt daily challenge
  useEffect(() => {
    let isMounted = true;

    const initializePuzzle = async () => {
      const date = getDailyChallengeDate();
      const number = getPuzzleNumber(date);

      if (!isMounted) return;

      setPuzzleDate(date);
      setPuzzleNumber(number);

      // Check if tutorial has been completed
      const tutorialKey = `lexiclash_wordHunt_tutorial_completed_${language}`;
      const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
      setTutorialCompleted(hasCompletedTutorial);

      // Check if already played today
      if (hasPlayedWordHuntToday(language as Language)) {
        const result = getTodaysWordHuntResult(language as Language);
        if (!isMounted) return;
        setStoredResult(result);
        setPhase('already-played');
        return;
      }

      // Try to fetch puzzle from API (includes AI-selected word if available)
      try {
        const response = await fetch(`/api/daily-challenge/puzzle/${date}/${language}`);
        if (!isMounted) return;

        if (response.ok) {
          const puzzleData = await response.json();
          if (!isMounted) return;
          setGrid(puzzleData.grid);
          setTargetWord(puzzleData.targetWord);
        } else {
          // Fall back to local generation
          const puzzle = generateDailyPuzzle(date, language as Language);
          if (!isMounted) return;
          setGrid(puzzle.grid);
          setTargetWord(puzzle.targetWord);
        }
      } catch {
        // Fall back to local generation on network error
        if (!isMounted) return;
        const puzzle = generateDailyPuzzle(date, language as Language);
        setGrid(puzzle.grid);
        setTargetWord(puzzle.targetWord);
      }

      // Show tutorial if not completed, otherwise go to ready screen
      if (!isMounted) return;
      if (!hasCompletedTutorial) {
        setShowTutorial(true);
        setPhase('ready');
      } else {
        setPhase('ready');
      }
    };

    initializePuzzle();

    return () => {
      isMounted = false;
    };
  }, [language, wasReset]); // Re-initialize when language changes or admin reset clears localStorage

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

  // Handle game start
  const handleStartGame = useCallback(() => {
    setPhase('playing');
  }, []);

  // Handle Word Hunt game completion
  const handleGameComplete = useCallback((result: SurvivalGameResult) => {
    // Create the Word Hunt result object (streak will be updated by saveWordHuntResult)
    const wordHuntResult: WordHuntResult = {
      puzzleNumber,
      puzzleDate,
      language: language as Language,
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
  }, [puzzleNumber, puzzleDate, language]);

  // Handle tutorial completion
  const handleTutorialComplete = useCallback(() => {
    const tutorialKey = `lexiclash_wordHunt_tutorial_completed_${language}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(tutorialKey, 'true');
    }
    setTutorialCompleted(true);
    setShowTutorial(false);
  }, [language]);

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
  const handleRetryChallenge = useCallback(() => {
    // Clear the stored result for today
    const cleared = clearWordHuntResultForRetry(language as Language);
    if (!cleared) {
      console.error('Failed to clear Word Hunt result for retry');
      return;
    }

    // Reset state for fresh start
    setStoredResult(null);
    setGameResult(null);
    setPhase('ready');
  }, [language]);

  // Hide header completely in landscape mode during gameplay (not just auto-hide)
  const showHeader = !(phase === 'playing' && isLandscape);

  // Render based on phase
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      {showHeader && <AutoHideHeader />}

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
            language={language as Language}
            currentFlag={getCurrentFlag(language as Language)}
            challengeData={challengeData}
            isAuthenticated={isAuthenticated}
            targetWordLength={targetWord?.length || 0}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            guestFingerprint={!isAuthenticated ? guestFingerprint : null}
            onLanguageChange={(lang) => setLanguage(lang)}
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
            language={language as Language}
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
            language={language as Language}
            countdown={countdown}
            isNewCompletion={phase === 'completed'}
            onBack={handleBack}
            onRetry={handleRetryChallenge}
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
      return new Date(puzzleDate + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return puzzleDate;
    }
  }, [puzzleDate]);

  return (
    <motion.div
      key="ready"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center p-4"
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
            className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            <span>?</span> {t('daily.howToPlay')}
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
