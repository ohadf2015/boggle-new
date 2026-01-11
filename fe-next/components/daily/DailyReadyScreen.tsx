'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Globe, ChevronDown, Trophy, Target, Check, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import DailyIntroCarousel from './DailyIntroCarousel';
import { CreateChallengeModal } from './CreateChallengeModal';
import { UnauthenticatedCreateChallengeSection } from './UnauthenticatedCreateChallengeSection';
import { hasPlayedWordHuntToday } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

// ==========================================
// Constants
// ==========================================

export const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
];

// ==========================================
// Types
// ==========================================

// Challenge data from URL parameter
export interface ChallengeData {
  puzzleNumber: number;
  attemptsUsed: number;
  solved: boolean;
  efficiencyScore: number;
  wordsDiscovered: number;
}

export interface DailyReadyScreenProps {
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

// ==========================================
// Component
// ==========================================

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
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);

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
        {/* Guest Mode Notice - Show only for anonymous users */}
        {!isAuthenticated && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="w-full max-w-sm mx-auto bg-amber-50 dark:bg-amber-900/20 rounded-neo border-2 border-amber-400 p-3 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-bold">
              <UserCircle2 className="w-4 h-4" />
              <span>{t('daily.guestModeNotice')}</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {t('daily.guestModeBenefits')}
            </p>
          </motion.div>
        )}

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

        {/* Create Challenge Section - Different UI for authenticated vs unauthenticated */}
        {isAuthenticated ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, type: 'spring' }}
          >
            <Button
              onClick={() => setShowCreateChallenge(true)}
              variant="outline"
              className="w-full py-3 text-lg font-bold bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:bg-neo-yellow/20 hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">🛠️</span>
              {t('daily.createCustomChallenge')}
            </Button>
          </motion.div>
        ) : (
          <UnauthenticatedCreateChallengeSection language={language} t={t} />
        )}

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
                <span className="absolute inline-flex h-full w-full rounded-full bg-neo-pink opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-pink" />
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

      <CreateChallengeModal
        isOpen={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        language={language}
      />
    </motion.div>
  );
};

export default DailyReadyScreen;
