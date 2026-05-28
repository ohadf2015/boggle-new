'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, Target, UserCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import DailyIntroCarousel from './DailyIntroCarousel';
import { CreateChallengeModal } from './CreateChallengeModal';
import { UnauthenticatedCreateChallengeSection } from './UnauthenticatedCreateChallengeSection';
import { LanguageDropdown } from './LanguageDropdown';
import AuthModal from '../auth/AuthModal';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { useMusic } from '@/contexts/MusicContext';
import { MascotWithEntrance } from '@/components/ui/Mascot';
import type { Language } from '@/types';

export { LANGUAGE_OPTIONS } from './LanguageDropdown';

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

const DailyReadyScreenInner: React.FC<DailyReadyScreenProps> = ({
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCreateChallenge, setPendingCreateChallenge] = useState(false);
  const { isOnCrazyGamesPlatform } = useCrazyGames();

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

  // Auto-open CreateChallengeModal after successful authentication
  useEffect(() => {
    if (isAuthenticated && pendingCreateChallenge) {
      setPendingCreateChallenge(false);
      setShowCreateChallenge(true);
    }
  }, [isAuthenticated, pendingCreateChallenge]);

  // Handler for when unauthenticated user tries to create a challenge
  const handleAuthRequired = () => {
    setPendingCreateChallenge(true);
    setShowAuthModal(true);
  };

  // Preload game music tracks while on ready screen
  // This ensures music starts instantly when game begins (no loading delay)
  const { preloadMusicTrack, TRACKS } = useMusic();
  useEffect(() => {
    // Preload BOSSA_ARCADE (survival mode music) and IN_GAME (standard game music)
    // These are the most likely tracks needed when the game starts
    preloadMusicTrack(TRACKS.BOSSA_ARCADE);
    preloadMusicTrack(TRACKS.IN_GAME);
  }, [preloadMusicTrack, TRACKS]);

  // Check if this is a valid challenge (same puzzle number)
  const isValidChallenge = challengeData && challengeData.puzzleNumber === puzzleNumber;

  const formattedDate = useMemo(() => {
    try {
      return safeToLocaleDateString(new Date(puzzleDate + 'T00:00:00Z'), language, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return puzzleDate;
    }
  }, [puzzleDate, language]);

  return (
    <m.div
      key="ready"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-start pt-2 sm:pt-4 px-4 pb-bottom-stack sm:pb-10 min-h-0 overflow-y-auto"
    >
      {/* Top bar with back and language */}
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl flex items-center justify-between mb-2">
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

        <LanguageDropdown
          language={language}
          currentFlag={currentFlag}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Main content - COMPACT on mobile, two-column on desktop */}
      <div className="w-full max-w-md lg:max-w-5xl xl:max-w-6xl lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 xl:gap-12 lg:items-start">
      {/* Left column: primary content */}
      <div className="text-center space-y-3">
        {/* Explorer mascot — sets adventure tone before the word hunt */}
        <div className="flex justify-center">
          <MascotWithEntrance variant="explorer" size="sm" delay={0.1} />
        </div>

        {/* Guest Mode Notice - Show only for anonymous users */}
        {!isAuthenticated && !isOnCrazyGamesPlatform && (
          <m.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-sm mx-auto bg-amber-50 dark:bg-amber-900/20 rounded-neo border-2 border-amber-400 p-3 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            onClick={() => setShowAuthModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowAuthModal(true); }}
          >
            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-bold">
              <UserCircle2 className="w-4 h-4" />
              <span>{t('daily.guestModeNotice')}</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {t('daily.guestModeBenefits')}
            </p>
          </m.div>
        )}

        {/* Challenge Banner (when arriving via challenge link) */}
        {isValidChallenge && (
          <m.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 22 }}
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
                <div className="text-xs text-white">{t('wordHunt.results.attempts')}</div>
              </div>
              {challengeData.wordsDiscovered > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{challengeData.wordsDiscovered}</div>
                  <div className="text-xs text-white">{t('wordHunt.survival.wordsLabel')}</div>
                </div>
              )}
            </div>
            <div className="text-center mt-2 text-white text-sm font-bold">
              {t('wordHunt.results.beatTheirScore')}
            </div>
          </m.div>
        )}

        {/* Hero Section - Puzzle Number (LARGE) */}
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
          className="space-y-2"
        >
          {/* Daily Badge - Simple text, no box */}
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 22 }}
            className="inline-flex items-center gap-2"
          >
            <Target className="w-6 h-6 text-amber-500" />
            <span className="text-2xl font-black text-neo-black dark:text-white uppercase tracking-wide">
              {t('daily.badge')}
            </span>
          </m.div>

          {/* Challenge number and date - subtle styling */}
          <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
            <span className="text-lg font-bold">#{puzzleNumber}</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm">{formattedDate}</span>
          </div>
        </m.div>

        {/* PRIMARY PLAY BUTTON — inline on desktop, sticky on mobile */}
        {/* Desktop inline button */}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
          className="hidden sm:block w-full max-w-sm mx-auto"
        >
          <button
            onClick={onStart}
            className="group w-full py-4 text-lg font-black uppercase rounded-neo border-3 border-neo-black bg-linear-to-r from-emerald-400 to-neo-cyan text-neo-black shadow-hard transition-all duration-200 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed flex items-center justify-center gap-2 animate-breathing"
          >
            <Target className="w-6 h-6" />
            {t('daily.playButton')}
          </button>
        </m.div>

        {/* Animated Tutorial Carousel */}
        {targetWordLength > 0 && (
          <m.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
          >
            <DailyIntroCarousel targetWordLength={targetWordLength} />
          </m.div>
        )}

        {/* Secondary actions row — demoted from primary CTA, sits below carousel */}
        {isAuthenticated ? (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 280, damping: 26 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1"
          >
            <button
              onClick={() => setShowCreateChallenge(true)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-neo-pink hover:text-neo-pink-light transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {t('daily.createCustomChallenge')}
            </button>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              {t('daily.todaysPlayers')}
            </button>
          </m.div>
        ) : (
          <>
            {!isOnCrazyGamesPlatform && (
              <m.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 26 }}
              >
                <UnauthenticatedCreateChallengeSection language={language} t={t} onAuthRequired={handleAuthRequired} />
              </m.div>
            )}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 280, damping: 26 }}
              className="flex items-center justify-center gap-4 pt-2"
            >
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
              >
                <Trophy className="w-3 h-3" /> {t('daily.todaysPlayers')}
              </button>
            </m.div>
          </>
        )}

        {/* Collapsible Leaderboard */}
        <AnimatePresence>
          {showLeaderboard && (
            <m.div
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
            </m.div>
          )}
        </AnimatePresence>

        {/* Note */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 280, damping: 26 }}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          {t('daily.samePuzzle')}
        </m.p>

        {/* (desktop play button moved up to appear right after hero section) */}
      </div>

      {/* Right column: desktop-only persistent leaderboard sidebar */}
      <m.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 280, damping: 26 }}
        className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-4"
      >
        <div className="rounded-neo border-3 border-neo-black shadow-hard overflow-hidden bg-neo-cream">
          <div className="flex items-center gap-2 px-4 py-3 bg-neo-black">
            <Trophy className="w-4 h-4 text-neo-yellow" />
            <span className="font-black text-sm text-neo-white uppercase tracking-wide">
              {t('daily.todaysPlayers')}
            </span>
          </div>
          <div className="p-3">
            <TabbedDailyLeaderboard
              puzzleDate={puzzleDate}
              language={language}
              currentPlayerId={currentPlayerId}
              currentGuestFingerprint={guestFingerprint}
              maxVisible={8}
              compact
              t={t}
              defaultTab="today"
            />
          </div>
        </div>
      </m.div>

      </div>

      {/* Mobile sticky play button — sits above bottom nav, below cookie consent */}
      <div className="sm:hidden fixed bottom-[var(--bottom-stack-height,0px)] inset-x-0 z-[100] px-4 pb-2 pointer-events-none">
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
          className="max-w-sm mx-auto pointer-events-auto"
        >
          <button
            onClick={onStart}
            className="group w-full py-4 text-lg font-black uppercase rounded-neo border-3 border-neo-black bg-linear-to-r from-emerald-400 to-neo-cyan text-neo-black shadow-hard transition-all duration-200 active:translate-y-0.5 active:shadow-hard-pressed flex items-center justify-center gap-2 animate-breathing"
          >
            <Target className="w-6 h-6" />
            {t('daily.playButton')}
          </button>
        </m.div>
      </div>

      <CreateChallengeModal
        isOpen={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        language={language}
      />

      {!isOnCrazyGamesPlatform && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signup"
        />
      )}
    </m.div>
  );
};

const DailyReadyScreen: React.FC<DailyReadyScreenProps> = (props) => (
  <React.Suspense>
    <DailyReadyScreenInner {...props} />
  </React.Suspense>
);

export default DailyReadyScreen;
