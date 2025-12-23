'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import { Trophy, Timer, Flame, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import DailyChallengeGame from './DailyChallengeGame';
import DailyChallengeResults from './DailyChallengeResults';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  generateDailyGrid,
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  hasPlayedToday,
  getTodaysResult,
  saveDailyResult,
  getDailyStreak,
  updateDailyStreak,
  getStreakMilestone,
  DAILY_CHALLENGE_DURATION,
  type DailyChallengeResult,
  type StoredDailyResult,
  type DailyStreak,
} from '@/utils/dailyChallenge';
import type { LetterGrid, Language } from '@/types';

export type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

interface DailyChallengeGameResult {
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>;
  timeSeconds: number;
  words: string[];
  longestWord: string;
}

/**
 * DailyChallenge - Main container for the daily puzzle
 * Same puzzle for everyone worldwide each day
 */
const DailyChallenge: React.FC = () => {
  const { t, language } = useLanguage();

  // Phase management
  const [phase, setPhase] = useState<DailyChallengePhase>('loading');

  // Daily challenge state
  const [puzzleDate, setPuzzleDate] = useState<string>('');
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [grid, setGrid] = useState<LetterGrid | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  // Results
  const [storedResult, setStoredResult] = useState<StoredDailyResult | null>(null);
  const [gameResult, setGameResult] = useState<DailyChallengeGameResult | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [streakMilestone, setStreakMilestone] = useState<number | null>(null);

  // Initialize daily challenge
  useEffect(() => {
    const date = getDailyChallengeDate();
    const number = getPuzzleNumber(date);

    setPuzzleDate(date);
    setPuzzleNumber(number);

    // Check if already played today
    if (hasPlayedToday(language as Language)) {
      const result = getTodaysResult(language as Language);
      setStoredResult(result);
      setPhase('already-played');
    } else {
      // Generate the grid for today
      const dailyGrid = generateDailyGrid(date, language as Language);
      setGrid(dailyGrid);
      setPhase('ready');
    }

    // Get current streak
    setStreak(getDailyStreak());
  }, [language]);

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

  // Handle game completion
  const handleGameComplete = useCallback((result: DailyChallengeGameResult) => {
    // Calculate words by length
    const wordsByLength: Record<number, number> = {};
    result.words.forEach(word => {
      const len = word.length;
      wordsByLength[len] = (wordsByLength[len] || 0) + 1;
    });

    // Create the result object
    const dailyResult: DailyChallengeResult = {
      puzzleNumber,
      puzzleDate,
      score: result.score,
      wordCount: result.wordCount,
      wordsByLength,
      timeSeconds: result.timeSeconds,
      streakDays: streak?.currentStreak ?? 0,
      language: language as Language,
    };

    // Save result to localStorage
    saveDailyResult(dailyResult);

    // Update streak
    const updatedStreak = updateDailyStreak();
    setStreak(updatedStreak);

    // Check for streak milestone
    const milestone = getStreakMilestone(updatedStreak.currentStreak);
    setStreakMilestone(milestone);

    // Store result for display
    setGameResult(result);
    setStoredResult({
      date: puzzleDate,
      puzzleNumber,
      result: dailyResult,
      completedAt: new Date().toISOString(),
    });

    setPhase('completed');
  }, [puzzleNumber, puzzleDate, streak, language]);

  // Handle going back
  const handleBack = useCallback(() => {
    window.location.href = `/${language}`;
  }, [language]);

  // Render based on phase
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
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
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t('daily.loading')}</p>
            </div>
          </motion.div>
        )}

        {phase === 'ready' && (
          <DailyReadyScreen
            puzzleNumber={puzzleNumber}
            puzzleDate={puzzleDate}
            streak={streak}
            countdown={countdown}
            onStart={handleStartGame}
            onBack={handleBack}
            t={t}
          />
        )}

        {phase === 'playing' && grid && (
          <DailyChallengeGame
            grid={grid}
            puzzleNumber={puzzleNumber}
            language={language as Language}
            duration={DAILY_CHALLENGE_DURATION}
            onComplete={handleGameComplete}
            onQuit={handleBack}
          />
        )}

        {(phase === 'completed' || phase === 'already-played') && storedResult && (
          <DailyChallengeResults
            result={storedResult.result}
            streak={streak}
            streakMilestone={streakMilestone}
            words={gameResult?.words ?? []}
            longestWord={gameResult?.longestWord ?? ''}
            countdown={countdown}
            isNewCompletion={phase === 'completed'}
            onBack={handleBack}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// Ready Screen Component
// ==========================================

interface DailyReadyScreenProps {
  puzzleNumber: number;
  puzzleDate: string;
  streak: DailyStreak | null;
  countdown: string;
  onStart: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

const DailyReadyScreen: React.FC<DailyReadyScreenProps> = ({
  puzzleNumber,
  puzzleDate,
  streak,
  countdown,
  onStart,
  onBack,
  t,
}) => {
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
      {/* Back button */}
      <motion.div className="absolute top-20 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <FaArrowLeft className="mr-2" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-md w-full text-center space-y-6">
        {/* Daily Challenge Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neo-yellow to-neo-orange rounded-neo border-3 border-neo-black shadow-hard"
        >
          <Target className="w-5 h-5 text-neo-black" />
          <span className="font-black text-neo-black uppercase tracking-wide">
            {t('daily.badge')}
          </span>
        </motion.div>

        {/* Puzzle Number */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-6xl md:text-7xl font-black text-neo-black dark:text-white">
            #{puzzleNumber}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            {formattedDate}
          </p>
        </motion.div>

        {/* Streak Display */}
        {streak && streak.currentStreak > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 text-neo-orange"
          >
            <Flame className="w-6 h-6 animate-pulse" />
            <span className="text-xl font-bold">
              {t('daily.streakDays').replace('{count}', String(streak.currentStreak))}
            </span>
          </motion.div>
        )}

        {/* Info Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="bg-white dark:bg-neo-navy-light rounded-neo border-3 border-neo-black dark:border-white/20 p-4 shadow-hard-sm">
            <Timer className="w-6 h-6 mx-auto mb-2 text-neo-cyan" />
            <div className="text-2xl font-black text-neo-black dark:text-white">
              {Math.floor(DAILY_CHALLENGE_DURATION / 60)}:{(DAILY_CHALLENGE_DURATION % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {t('daily.timeLimit')}
            </div>
          </div>

          <div className="bg-white dark:bg-neo-navy-light rounded-neo border-3 border-neo-black dark:border-white/20 p-4 shadow-hard-sm">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-neo-yellow" />
            <div className="text-2xl font-black text-neo-black dark:text-white">
              1
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {t('daily.attempt')}
            </div>
          </div>
        </motion.div>

        {/* Important Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-500 dark:text-gray-400"
        >
          {t('daily.samePuzzle')}
        </motion.p>

        {/* Start Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
        >
          <Button
            onClick={onStart}
            className="w-full py-6 text-xl font-black uppercase bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
          >
            {t('daily.playButton')}
          </Button>
        </motion.div>

        {/* Next puzzle countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xs text-gray-400 dark:text-gray-500"
        >
          {t('daily.nextPuzzleIn')} {countdown}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DailyChallenge;
