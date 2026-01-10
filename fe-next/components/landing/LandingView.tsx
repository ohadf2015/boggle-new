'use client';

import React, { useEffect, useState, lazy, Suspense, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap, Brain, Sparkles, Star, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMouseParallax } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import ModeCard from './ModeCard';
import TutorialPrompt from './TutorialPrompt';
import Header from '@/components/Header';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';

/**
 * Mascot component for the hero section
 */
const HeroMascot = memo(function HeroMascot() {
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  return (
    <motion.div
      className="relative w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 mx-auto mb-2"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.div
        animate={!prefersReducedMotion && enableComplexAnimations ? {
          y: [0, -8, 0],
          rotate: [-2, 2, -2],
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/mascot/lexi-happy.png"
          alt="Lexi mascot"
          width={160}
          height={160}
          priority
        />
      </motion.div>

      {/* Sparkle accents around mascot */}
      {enableComplexAnimations && !prefersReducedMotion && (
        <>
          <motion.div
            className="absolute -top-2 -right-2 text-neo-yellow"
            animate={{ scale: [0, 1, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <motion.div
            className="absolute top-1/2 -left-4 text-neo-pink"
            animate={{ scale: [0, 1, 0], rotate: [0, -180, -360] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          >
            <Star className="w-4 h-4 fill-current" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 right-1/4 text-neo-cyan"
            animate={{ scale: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          >
            <Zap className="w-4 h-4 fill-current" />
          </motion.div>
        </>
      )}
    </motion.div>
  );
});

// Lazy load DailyChallengeBanner - not critical for initial paint
const DailyChallengeBanner = lazy(() => import('@/components/daily/DailyChallengeBanner'));

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

  // Mouse-based parallax for hero section
  const mouseParallax = useMouseParallax(15);

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
      className={`flex flex-col min-h-full bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative overflow-hidden ${isLandscape ? 'landscape-full-height' : ''}`}
      {...pullToRefreshHandlers}
    >
      {/* Playful background with parallax and floating elements */}
      {!isLandscape && <PlayfulBackground intensity="high" colorScheme="default" />}

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
      <main className={`w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 ${isLandscape ? 'flex-1 flex flex-col justify-center px-4 py-2' : 'px-2 sm:px-3 lg:px-6 xl:px-8 py-2 sm:py-3 lg:py-6 pb-40 lg:pb-6'}`}>
        {/* Hero section with mascot - dramatic parallax effect */}
        {!isLandscape && (
          <motion.div
            className="text-center mb-2 sm:mb-3 lg:mb-6 xl:mb-8 animate-fade-in-fast relative z-10"
            style={{
              transform: `translate(${mouseParallax.x * 1.2}px, ${mouseParallax.y * 1.2}px)`,
            }}
          >
            {/* Mascot */}
            <HeroMascot />

            <motion.h1
              className="text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white mb-1 sm:mb-2 lg:mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('landing.chooseMode') || 'Choose Your Mode'}
            </motion.h1>
            <motion.p
              className="text-sm sm:text-base lg:text-xl xl:text-2xl font-medium text-neo-black/80 dark:text-neo-white/85"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('landing.subtitleSimple') || 'Practice solo or challenge friends'}
            </motion.p>
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

        {/* Daily Challenge Banner - Lazy loaded with skeleton fallback */}
        <div className={`w-full ${isLandscape ? 'mb-2' : 'mb-2 sm:mb-3 lg:mb-4 xl:mb-6'}`}>
          <Suspense fallback={
            <div className="w-full p-3 rounded-neo border-3 border-neo-black shadow-hard bg-neo-yellow animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-neo bg-neo-black/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-neo-black/20 rounded" />
                  <div className="h-3 w-20 bg-neo-black/10 rounded" />
                </div>
              </div>
            </div>
          }>
            <DailyChallengeBanner compact={isLandscape} />
          </Suspense>
        </div>

        {/* Mode cards grid - horizontal in landscape, balanced 2-column layout on desktop */}
        {/* Using CSS animation for instant paint without JS overhead */}
        <div className={`w-full animate-fade-in-fast ${isLandscape ? 'flex gap-3 flex-1 min-h-0' : 'grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-2 sm:gap-3 lg:gap-4 xl:gap-5 md:min-h-[320px] lg:min-h-[420px] xl:min-h-[480px]'}`}>
          {/* Multiplayer Card - Featured (spans 2 rows on desktop, 50% width) */}
          {isLandscape ? (
            <Link
              href={`/${language}/multiplayer`}
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-pink to-pink-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all min-h-[120px] max-h-[70vh] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy"
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
              className="md:row-span-2"
            />
          )}

          {/* Single Player Card */}
          {isLandscape ? (
            <Link
              href={`/${language}/singleplayer`}
              className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-neo-cyan to-cyan-400 border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all min-h-[120px] max-h-[70vh] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy"
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

          {/* Brain Training Card - Only on non-landscape */}
          {!isLandscape && (
            <ModeCard
              title={t('landing.brainTraining') || 'Brain Training'}
              description={t('landing.brainTrainingDesc') || 'Track cognitive growth'}
              href={`/${language}/brain`}
              icon={<Brain className="w-6 h-6" />}
              variant="purple"
            />
          )}
        </div>

      </main>

      {/* Tutorial FAB - Fixed bottom corner button */}
      {/* Z-index 45 ensures it stays below mobile menu backdrop (z-9998) but above other content */}
      {/* On desktop, positioned above Footer to avoid overlap with "Buy us a coffee" button */}
      <button
        onClick={handleOpenTutorial}
        className="
          fixed bottom-[calc(6rem+max(env(safe-area-inset-bottom),1rem))] lg:bottom-[calc(8.5rem+max(env(safe-area-inset-bottom),1rem))] right-4 z-[45]
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
          rtl:right-auto rtl:left-4
          rtl:ml-[max(env(safe-area-inset-left),0px)]
          animate-fade-in-up
        "
        aria-label={t('landing.tutorial') || 'Tutorial'}
      >
        <GraduationCap className="w-5 h-5" />
        <span className="hidden sm:inline">{t('landing.tutorial') || 'Tutorial'}</span>
      </button>
    </div>
  );
};

export default LandingView;
