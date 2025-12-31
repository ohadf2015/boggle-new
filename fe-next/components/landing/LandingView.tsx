'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, CircleHelp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import ModeCard from './ModeCard';
import Header from '@/components/Header';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';

// Dynamic import for OnboardingModal (not needed on initial page load)
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), {
  ssr: false,
});

/**
 * LandingView - Main landing page with game mode selection
 * Two prominent cards: Single Player and Multiplayer
 */
const LandingView: React.FC = () => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { playTrack, TRACKS } = useMusic();
  const { isAuthenticated } = useAuth();
  const isLandscape = useMobileLandscape();
  const liveRoomStats = useLiveRoomStats();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check for room parameter and redirect to multiplayer page
  // This handles shared links (WhatsApp, barcode scan, copy link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
      // Redirect to multiplayer page with all query params preserved (room, utm_source, etc.)
      router.replace(`/${language}/multiplayer${window.location.search}`);
    }
  }, [language, router]);

  // Show onboarding modal for first-time visitors (delayed for better UX)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only show if not completed and no room redirect in progress
    const urlParams = new URLSearchParams(window.location.search);
    const hasRoom = urlParams.get('room');

    // Skip onboarding if user is authenticated or already completed
    if (hasRoom || isAuthenticated || hasCompletedOnboarding()) {
      return;
    }

    // Show onboarding quickly after page renders (300ms feels responsive, not jarring)
    const timer = setTimeout(() => {
      setShowOnboarding(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Play lobby music on landing page (same as multiplayer lobby)
  // Note: We always call playTrack even if audio isn't unlocked yet
  // The MusicContext will queue the request and play when user interacts
  useEffect(() => {
    playTrack(TRACKS.LOBBY);
  }, [playTrack, TRACKS]);

  // Landscape mode - optimized horizontal layout
  if (isLandscape) {
    return (
      <main
        className="flex flex-col h-screen w-full bg-slate-900 p-3 gap-2 overflow-x-hidden landscape-full-height"
        role="main"
        aria-label="Game mode selection"
      >
        {/* Daily Challenge Banner - Top of landscape view */}
        <div className="w-full max-w-4xl mx-auto">
          <DailyChallengeBanner compact />
        </div>

        {/* Mode cards row */}
        <div className="flex-1 flex items-center justify-center gap-3 min-h-0">
          {/* Multiplayer */}
          <Link
            href={`/${language}/multiplayer`}
            className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-neo-pink to-pink-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all h-full max-h-[80vh] min-h-[200px]"
            aria-label={`${t('landing.multiplayer') || 'Multiplayer'} - ${t('landing.multiplayerDesc') || 'Compete with friends'}`}
          >
            <Users className="w-12 h-12 text-neo-black" aria-hidden="true" />
            <span className="text-xl font-black uppercase text-neo-black text-center">{t('landing.multiplayer') || 'Multiplayer'}</span>
            <div className="flex flex-col gap-2 text-sm" aria-hidden="true">
              <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><LayoutGrid className="inline w-4 h-4 mr-1" />Rooms</span>
              <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><Crown className="inline w-4 h-4 mr-1" />Host</span>
            </div>
          </Link>

          {/* Single Player */}
          <Link
            href={`/${language}/singleplayer`}
            className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-neo-cyan to-cyan-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all h-full max-h-[80vh] min-h-[200px]"
            aria-label={`${t('landing.singlePlayer') || 'Single Player'} - ${t('landing.singlePlayerDesc') || 'Practice at your own pace'}`}
          >
            <User className="w-12 h-12 text-neo-black" aria-hidden="true" />
            <span className="text-xl font-black uppercase text-neo-black text-center">{t('landing.singlePlayer') || 'Single Player'}</span>
            <div className="flex flex-col gap-2 text-sm" aria-hidden="true">
              <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><Bot className="inline w-4 h-4 mr-1" />Bots</span>
              <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><Trophy className="inline w-4 h-4 mr-1" />Challenges</span>
            </div>
          </Link>
        </div>

        {/* How to Play - compact, always visible */}
        <Link
          href={`/${language}/rules`}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-neo-yellow text-neo-black font-bold text-lg border-3 border-neo-black rounded-neo min-h-[48px] shadow-hard hover:shadow-hard-lg hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm transition-all z-10"
          aria-label={t('joinView.howToPlay') || 'How to Play'}
        >
          <CircleHelp className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
          <span className="hidden sm:inline">{t('joinView.howToPlay') || 'How to Play'}</span>
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="max-w-6xl lg:max-w-7xl mx-auto px-2 xs:px-4 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-4 lg:py-8 xl:py-12 overflow-x-hidden">
        {/* Hero section - compact */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-2 sm:mb-3 lg:mb-6 xl:mb-8"
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white mb-0.5 sm:mb-1 lg:mb-2">
            {t('landing.chooseMode') || 'Choose Your Mode'}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium text-neo-black/80 dark:text-neo-white/85">
            {t('landing.subtitleSimple') || 'Practice solo or challenge friends'}
          </p>
        </motion.div>

        {/* Daily Challenge Banner - Compact inline placement */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto mb-2 sm:mb-3 lg:mb-6 xl:mb-8"
        >
          <DailyChallengeBanner />
        </motion.div>

        {/* Mode cards grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 lg:gap-6 xl:gap-8 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto"
        >
          {/* Multiplayer Card */}
          <ModeCard
            title={t('landing.multiplayer') || 'Multiplayer'}
            description={t('landing.multiplayerDesc') || 'Compete with friends in real-time!'}
            href={`/${language}/multiplayer`}
            icon={<Users className="w-6 h-6" />}
            variant="pink"
            liveBadge={{
              openRooms: liveRoomStats.openRooms,
              totalPlayers: liveRoomStats.totalPlayers,
              roomsLabel: t('landing.openRooms') || 'open rooms',
              playersLabel: t('landing.playersLive') || 'playing now',
            }}
          />

          {/* Single Player Card */}
          <ModeCard
            title={t('landing.singlePlayer') || 'Single Player'}
            description={t('landing.singlePlayerDesc') || 'Practice at your own pace or challenge yourself!'}
            href={`/${language}/singleplayer`}
            icon={<User className="w-6 h-6" />}
            variant="cyan"
          />
        </motion.div>

        {/* How to Play Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex justify-center mt-2 sm:mt-3 lg:mt-8 xl:mt-10"
        >
          <Link
            href={`/${language}/rules`}
            className="
              inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3
              px-3 sm:px-4 lg:px-6 xl:px-8 py-1.5 sm:py-2 lg:py-3 xl:py-4
              bg-neo-yellow text-neo-black
              font-bold text-sm sm:text-base lg:text-lg xl:text-xl
              border-2 lg:border-3 border-neo-black
              rounded-neo shadow-hard lg:shadow-hard-lg
              hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
              active:translate-x-[1px] active:translate-y-[1px] active:shadow-none
              transition-all duration-100
            "
          >
            <CircleHelp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
            {t('joinView.howToPlay') || 'How to Play?'}
          </Link>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingView;
