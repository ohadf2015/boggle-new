'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import ModeCard from './ModeCard';
import TutorialPrompt from './TutorialPrompt';
import Header from '@/components/Header';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';

// Dynamic import for OnboardingModal (not needed on initial page load)
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), {
  ssr: false,
});

// Dynamic import for ProfileCustomizationModal
const ProfileCustomizationModal = dynamic(() => import('@/components/ProfileCustomizationModal'), {
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
  const { isAuthenticated, needsProfileCustomization, profile, updateProfile } = useAuth();
  const isLandscape = useMobileLandscape();
  const liveRoomStats = useLiveRoomStats();

  // Pull-to-refresh for room stats
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      liveRoomStats.refresh();
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success(t('common.refreshed') || 'Refreshed', {
        duration: 2000,
        icon: '🔄',
      });
    },
    threshold: 60,
  });

  // Tutorial prompt state (non-intrusive banner for first-time visitors)
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  // Onboarding modal state (opened when user clicks to start tutorial)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Profile customization state (for authenticated users who haven't customized)
  const [showProfileCustomization, setShowProfileCustomization] = useState(false);

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

  // Show tutorial prompt for first-time visitors (non-intrusive approach)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only show if not completed and no room redirect in progress
    const urlParams = new URLSearchParams(window.location.search);
    const hasRoom = urlParams.get('room');

    // Skip tutorial prompt if user is authenticated or already completed onboarding
    if (hasRoom || isAuthenticated || hasCompletedOnboarding()) {
      return;
    }

    // Show prompt after a brief delay (lets the page settle)
    const timer = setTimeout(() => {
      setShowTutorialPrompt(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Handle tutorial prompt actions
  const handleStartTutorial = () => {
    setShowTutorialPrompt(false);
    setShowOnboarding(true);
  };

  const handleDismissTutorialPrompt = () => {
    setShowTutorialPrompt(false);
    markOnboardingSkipped(); // Mark as skipped so prompt won't show again
  };

  // Re-open tutorial (for the "Tutorial" button)
  const handleOpenTutorial = () => {
    setShowOnboarding(true);
  };

  // Show profile customization modal for authenticated users who haven't customized
  useEffect(() => {
    if (!needsProfileCustomization || showOnboarding) {
      return;
    }
    // Small delay to let the page settle after auth redirect
    const timer = setTimeout(() => {
      setShowProfileCustomization(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [needsProfileCustomization, showOnboarding]);

  // Handle profile customization save
  const handleProfileCustomizationSave = async (name: string, avatarId: string) => {
    await updateProfile({
      display_name: name,
      username: name,
      avatar_image: avatarId,
      has_customized_profile: true,
    });
  };

  // Play lobby music on landing page (same as multiplayer lobby)
  // Note: We always call playTrack even if audio isn't unlocked yet
  // The MusicContext will queue the request and play when user interacts
  useEffect(() => {
    playTrack(TRACKS.LOBBY);
  }, [playTrack, TRACKS]);

  return (
    <div
      className={`flex flex-col min-h-full bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative ${isLandscape ? 'landscape-full-height' : ''}`}
      {...pullToRefreshHandlers}
    >
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullState.pullDistance}
        isRefreshing={pullState.isRefreshing}
        threshold={60}
      />

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Profile Customization Modal (for authenticated users who haven't customized) */}
      <ProfileCustomizationModal
        isOpen={showProfileCustomization}
        onClose={() => setShowProfileCustomization(false)}
        defaultName={profile?.display_name || profile?.username || ''}
        profilePictureUrl={profile?.profile_picture_url ?? undefined}
        onSave={handleProfileCustomizationSave}
      />

      {/* Header - compact in landscape via CSS */}
      <Header />

      {/* Main content */}
      <main className={`w-full max-w-6xl mx-auto overflow-x-hidden ${isLandscape ? 'flex-1 flex flex-col justify-center px-4 py-2' : 'px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-4'}`}>
        {/* Hero section - compact (hidden in landscape) */}
        {!isLandscape && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-1 sm:mb-2 lg:mb-3"
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white mb-0.5 sm:mb-1 lg:mb-2">
              {t('landing.chooseMode') || 'Choose Your Mode'}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium text-neo-black/80 dark:text-neo-white/85">
              {t('landing.subtitleSimple') || 'Practice solo or challenge friends'}
            </p>
          </motion.div>
        )}

        {/* Tutorial Prompt - Non-intrusive banner for first-time visitors (hidden in landscape) */}
        {!isLandscape && (
          <TutorialPrompt
            isVisible={showTutorialPrompt}
            onStartTutorial={handleStartTutorial}
            onDismiss={handleDismissTutorialPrompt}
          />
        )}

        {/* Daily Challenge Banner - Compact inline placement */}
        {/* Reduced animation delay for faster perceived load time */}
        <motion.div
          initial={{ opacity: 0.3, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0 }}
          className={`w-full ${isLandscape ? 'mb-2' : 'mb-1 sm:mb-2 lg:mb-3'}`}
        >
          <DailyChallengeBanner compact={isLandscape} />
        </motion.div>

        {/* Mode cards grid - horizontal in landscape, vertical on portrait */}
        {/* Start with partial opacity for instant visibility, then animate to full */}
        <motion.div
          initial={{ opacity: 0.3, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className={`w-full ${isLandscape ? 'flex gap-3 flex-1 min-h-0' : 'grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2 lg:gap-3'}`}
        >
          {/* Multiplayer Card */}
          {isLandscape ? (
            <Link
              href={`/${language}/multiplayer`}
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-pink to-pink-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all min-h-[120px] max-h-[70vh]"
              aria-label={`${t('landing.multiplayer') || 'Multiplayer'} - ${t('landing.multiplayerDesc') || 'Compete with friends'}`}
            >
              <Users className="w-10 h-10 text-neo-black" aria-hidden="true" />
              <span className="text-lg font-black uppercase text-neo-black text-center">{t('landing.multiplayer') || 'Multiplayer'}</span>
              <div className="flex gap-2 text-xs" aria-hidden="true">
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><LayoutGrid className="inline w-3 h-3 mr-1" />Rooms</span>
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Crown className="inline w-3 h-3 mr-1" />Host</span>
              </div>
            </Link>
          ) : (
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
          )}

          {/* Single Player Card */}
          {isLandscape ? (
            <Link
              href={`/${language}/singleplayer`}
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-cyan to-cyan-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all min-h-[120px] max-h-[70vh]"
              aria-label={`${t('landing.singlePlayer') || 'Single Player'} - ${t('landing.singlePlayerDesc') || 'Practice at your own pace'}`}
            >
              <User className="w-10 h-10 text-neo-black" aria-hidden="true" />
              <span className="text-lg font-black uppercase text-neo-black text-center">{t('landing.singlePlayer') || 'Single Player'}</span>
              <div className="flex gap-2 text-xs" aria-hidden="true">
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Bot className="inline w-3 h-3 mr-1" />Bots</span>
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Trophy className="inline w-3 h-3 mr-1" />Challenges</span>
              </div>
            </Link>
          ) : (
            <ModeCard
              title={t('landing.singlePlayer') || 'Single Player'}
              description={t('landing.singlePlayerDesc') || 'Practice at your own pace or challenge yourself!'}
              href={`/${language}/singleplayer`}
              icon={<User className="w-6 h-6" />}
              variant="cyan"
            />
          )}
        </motion.div>

      </main>

      {/* Tutorial FAB - Fixed bottom corner button */}
      {/* Z-index 45 ensures it stays below mobile menu backdrop (z-9998) but above other content */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        onClick={handleOpenTutorial}
        className="
          fixed bottom-4 right-4 z-[45]
          flex items-center gap-2
          min-w-[48px] min-h-[48px]
          px-4 py-3
          bg-neo-purple text-neo-white
          font-bold text-sm
          border-3 border-neo-black
          rounded-neo shadow-hard-lg
          hover:scale-105 hover:shadow-hard-xl
          active:scale-95 active:shadow-hard
          transition-all duration-150
          mb-[max(env(safe-area-inset-bottom),16px)]
          mr-[max(env(safe-area-inset-right),0px)]
          rtl:right-auto rtl:left-4
          rtl:mr-0 rtl:ml-[max(env(safe-area-inset-left),0px)]
        "
        aria-label={t('landing.tutorial') || 'Tutorial'}
      >
        <GraduationCap className="w-5 h-5" />
        <span className="hidden sm:inline">{t('landing.tutorial') || 'Tutorial'}</span>
      </motion.button>
    </div>
  );
};

export default LandingView;
