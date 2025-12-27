'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaUser, FaUsers, FaRobot, FaBullseye, FaTrophy, FaDoorOpen, FaCrown, FaMedal, FaQuestionCircle } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import ModeCard from './ModeCard';
import Header from '@/components/Header';
import OnboardingModal from '@/components/OnboardingModal';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';

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

  // Show onboarding modal for first-time visitors
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only show if not completed and no room redirect in progress
    const urlParams = new URLSearchParams(window.location.search);
    const hasRoom = urlParams.get('room');

    // Skip onboarding if user is authenticated
    if (!hasRoom && !isAuthenticated && !hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
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
        className="flex h-screen w-full items-center justify-center bg-slate-900 p-3 gap-3 overflow-x-hidden landscape-full-height"
        role="main"
        aria-label="Game mode selection"
      >
        {/* Multiplayer */}
        <Link
          href={`/${language}/multiplayer`}
          className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-neo-pink to-pink-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all h-full max-h-[90vh] min-h-[300px]"
          aria-label={`${t('landing.multiplayer') || 'Multiplayer'} - ${t('landing.multiplayerDesc') || 'Compete with friends'}`}
        >
          <FaUsers className="text-5xl text-neo-black" aria-hidden="true" />
          <span className="text-xl font-black uppercase text-neo-black text-center">{t('landing.multiplayer') || 'Multiplayer'}</span>
          <div className="flex flex-col gap-2 text-sm" aria-hidden="true">
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaDoorOpen className="inline mr-1" />Rooms</span>
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaCrown className="inline mr-1" />Host</span>
          </div>
        </Link>

        {/* Single Player */}
        <Link
          href={`/${language}/singleplayer`}
          className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-neo-cyan to-cyan-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all h-full max-h-[90vh] min-h-[300px]"
          aria-label={`${t('landing.singlePlayer') || 'Single Player'} - ${t('landing.singlePlayerDesc') || 'Practice at your own pace'}`}
        >
          <FaUser className="text-5xl text-neo-black" aria-hidden="true" />
          <span className="text-xl font-black uppercase text-neo-black text-center">{t('landing.singlePlayer') || 'Single Player'}</span>
          <div className="flex flex-col gap-2 text-sm" aria-hidden="true">
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaRobot className="inline mr-1" />Bots</span>
            <span className="bg-neo-black/20 px-3 py-1.5 rounded-neo font-bold text-center"><FaTrophy className="inline mr-1" />Challenges</span>
          </div>
        </Link>

        {/* How to Play - compact, always visible */}
        <Link
          href={`/${language}/rules`}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-neo-yellow text-neo-black font-bold text-lg border-3 border-neo-black rounded-neo min-h-[48px] shadow-hard hover:shadow-hard-lg hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-sm transition-all z-10"
          aria-label={t('joinView.howToPlay') || 'How to Play'}
        >
          <FaQuestionCircle className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
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
      <main className="max-w-6xl mx-auto px-2 xs:px-4 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-4 sm:mb-5"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white mb-2">
            {t('landing.chooseMode') || 'Choose Your Mode'}
          </h1>
          <p className="text-base sm:text-lg font-medium text-neo-black/80 dark:text-neo-white/85">
            {t('landing.subtitleSimple') || 'Practice solo or challenge friends'}
          </p>
        </motion.div>

        {/* Mode cards grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-4xl mx-auto"
        >
          {/* Multiplayer Card */}
          <ModeCard
            title={t('landing.multiplayer') || 'Multiplayer'}
            description={t('landing.multiplayerDesc') || 'Compete with friends in real-time!'}
            features={[
              { icon: <FaDoorOpen />, label: t('landing.feature.joinRooms') || 'Join Rooms' },
              { icon: <FaCrown />, label: t('landing.feature.hostGames') || 'Host Games' },
              { icon: <FaMedal />, label: t('landing.feature.tournaments') || 'Tournaments' },
            ]}
            href={`/${language}/multiplayer`}
            icon={<FaUsers />}
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
            features={[
              { icon: <FaRobot />, label: t('landing.feature.soloVsBots') || 'Solo vs Bots' },
              { icon: <FaBullseye />, label: t('landing.feature.practiceMode') || 'Practice Mode' },
              { icon: <FaTrophy />, label: t('landing.feature.challenges') || 'Challenges & High Scores' },
            ]}
            href={`/${language}/singleplayer`}
            icon={<FaUser />}
            variant="cyan"
          />
        </motion.div>

        {/* How to Play Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex justify-center mt-4 sm:mt-5"
        >
          <Link
            href={`/${language}/rules`}
            className="
              inline-flex items-center gap-2 sm:gap-3
              px-5 sm:px-6 py-2.5 sm:py-3
              bg-neo-yellow text-neo-black
              font-bold text-base sm:text-lg
              border-3 border-neo-black
              rounded-neo shadow-hard
              hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              transition-all duration-100
            "
          >
            <FaQuestionCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            {t('joinView.howToPlay') || 'How to Play?'}
          </Link>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingView;
