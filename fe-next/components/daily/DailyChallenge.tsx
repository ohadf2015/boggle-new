'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaGlobe, FaChevronDown } from 'react-icons/fa';
import { Trophy, Timer, Flame, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AutoHideHeader from '@/components/AutoHideHeader';
import DailyWordHuntSurvival from './DailyWordHuntSurvival';
import DailyWordHuntResults from './DailyWordHuntResults';
import DailyLeaderboard from './DailyLeaderboard';
import { DailyChallengeTutorial } from './DailyChallengeTutorial';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import {
  generateDailyGrid,
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  hasPlayedWordHuntToday,
  getTodaysWordHuntResult,
  saveWordHuntResult,
  selectDailyTargetWord,
  type WordHuntResult,
  type StoredWordHuntResult,
} from '@/utils/dailyChallenge';
import type { LetterGrid, Language } from '@/types';
import type { SurvivalGameResult } from './DailyWordHuntSurvival';

export type DailyChallengePhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

/**
 * DailyChallenge - Main container for the daily puzzle
 * Same puzzle for everyone worldwide each day
 */
const DailyChallenge: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

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

  // Initialize Word Hunt daily challenge
  useEffect(() => {
    const date = getDailyChallengeDate();
    const number = getPuzzleNumber(date);

    setPuzzleDate(date);
    setPuzzleNumber(number);

    // Check if tutorial has been completed
    const tutorialKey = `lexiclash_wordHunt_tutorial_completed_${language}`;
    const hasCompletedTutorial = typeof window !== 'undefined' && localStorage.getItem(tutorialKey) === 'true';
    setTutorialCompleted(hasCompletedTutorial);

    // Check if already played today
    if (hasPlayedWordHuntToday(language as Language)) {
      const result = getTodaysWordHuntResult(language as Language);
      setStoredResult(result);
      setPhase('already-played');
    } else {
      // Generate the grid for today
      const dailyGrid = generateDailyGrid(date, language as Language);
      setGrid(dailyGrid);

      // Select target word for today
      const target = selectDailyTargetWord(dailyGrid, date, language as Language);
      setTargetWord(target.word);

      // Show tutorial if not completed, otherwise go to ready screen
      if (!hasCompletedTutorial) {
        setShowTutorial(true);
        setPhase('ready');
      } else {
        setPhase('ready');
      }
    }
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

  // Handle Word Hunt game completion
  const handleGameComplete = useCallback((result: SurvivalGameResult) => {
    // Create the Word Hunt result object
    const wordHuntResult: WordHuntResult = {
      puzzleNumber,
      puzzleDate,
      language: language as Language,
      solved: result.solved,
      attemptsUsed: result.attemptsUsed,
      targetWord: result.targetWord,
      attempts: result.attempts,
      streakDays: 0, // TODO: Implement streak tracking for Word Hunt
      completedAt: new Date().toISOString(),
    };

    // Save result to localStorage
    saveWordHuntResult(wordHuntResult);

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
            countdown={countdown}
            language={language as Language}
            currentFlag={getCurrentFlag(language as Language)}
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

        {(phase === 'completed' || phase === 'already-played') && storedResult && (
          <DailyWordHuntResults
            result={storedResult.result}
            puzzleNumber={puzzleNumber}
            puzzleDate={puzzleDate}
            language={language as Language}
            countdown={countdown}
            isNewCompletion={phase === 'completed'}
            onBack={handleBack}
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
  countdown: string;
  language: Language;
  currentFlag: string;
  onLanguageChange: (lang: Language) => void;
  onStart: () => void;
  onBack: () => void;
  onShowTutorial: () => void;
  t: (key: string) => string;
}

const DailyReadyScreen: React.FC<DailyReadyScreenProps> = ({
  puzzleNumber,
  puzzleDate,
  countdown,
  language,
  currentFlag,
  onLanguageChange,
  onStart,
  onBack,
  onShowTutorial,
  t,
}) => {
  const [showLangDropdown, setShowLangDropdown] = useState(false);

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
      <motion.div className="absolute top-24 sm:top-28 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <FaArrowLeft className="mr-2" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Language Selector */}
      <motion.div
        className="absolute top-20 right-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            onBlur={() => setTimeout(() => setShowLangDropdown(false), 200)}
            className="flex items-center gap-2 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all"
          >
            <span className="text-lg">{currentFlag}</span>
            <FaGlobe className="w-4 h-4 text-neo-black" />
            <FaChevronDown className={`w-3 h-3 text-neo-black transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
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
                {LANGUAGE_OPTIONS.map((option) => (
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
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
            {formattedDate}
          </p>
        </motion.div>

        {/* Info Cards - Word Hunt specific */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white text-neo-black dark:bg-neo-navy-light dark:text-white rounded-neo border-3 border-neo-black dark:border-white/20 p-4 shadow-hard-sm max-w-xs mx-auto"
        >
          <Target className="w-8 h-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
          <div className="text-3xl font-black text-neo-black dark:text-white">
            10
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 uppercase font-bold">
            {t('wordHunt.title')} - Max Attempts
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Hunt for the hidden word using color-coded feedback!
          </div>
        </motion.div>

        {/* Important Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-600 dark:text-gray-300"
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
          className="text-xs text-gray-600 dark:text-gray-300"
        >
          {t('daily.nextPuzzleIn')} {countdown}
        </motion.div>

        {/* Today's Players Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <DailyLeaderboard
            puzzleDate={puzzleDate}
            language={language}
            maxVisible={5}
            compact
            t={t}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DailyChallenge;
