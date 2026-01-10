'use client';

import React, { useEffect, useState, lazy, Suspense, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { motion, useScroll, useTransform } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap, Brain, Sparkles, Star, Zap, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMouseParallax } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import ModeCard from './ModeCard';
import TutorialPrompt from './TutorialPrompt';
import Header from '@/components/Header';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';

/**
 * Parallax background layers - creates depth with scroll
 */
const ParallaxBackground = memo(function ParallaxBackground() {
  const { scrollY } = useScroll();
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // Parallax transforms for different layers
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, 100]);
  const y3 = useTransform(scrollY, [0, 500], [0, 50]);
  const rotate1 = useTransform(scrollY, [0, 500], [0, 15]);
  const rotate2 = useTransform(scrollY, [0, 500], [0, -10]);

  if (prefersReducedMotion || !enableComplexAnimations) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url('/textures/retro-grid.png')`,
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Gradient orbs - parallax layer 1 (slowest) */}
      <motion.div
        className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-neo-pink/20 blur-3xl"
        style={{ y: y1, rotate: rotate1 }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-neo-cyan/15 blur-3xl"
        style={{ y: y2, rotate: rotate2 }}
      />
      <motion.div
        className="absolute bottom-20 left-1/4 w-64 h-64 rounded-full bg-neo-yellow/10 blur-3xl"
        style={{ y: y3 }}
      />

      {/* Halftone pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url('/textures/halftone-pattern.png')`,
          backgroundSize: '300px 300px',
        }}
      />
    </div>
  );
});

/**
 * Floating decorative elements - MORE VISIBLE VERSION
 * Performance-gated - only renders on capable devices
 */
const FloatingDecorations = memo(function FloatingDecorations() {
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const mouseParallax = useMouseParallax(30);

  if (prefersReducedMotion || !enableComplexAnimations) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden="true">
      {/* Large floating stars - HIGH VISIBILITY */}
      <motion.div
        className="absolute top-[10%] left-[5%] text-neo-yellow drop-shadow-[0_0_10px_rgba(255,225,53,0.5)]"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 15, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ x: mouseParallax.x * 0.5, y: mouseParallax.y * 0.5 }}
      >
        <Star className="w-10 h-10 fill-current" />
      </motion.div>

      <motion.div
        className="absolute top-[20%] right-[10%] text-neo-pink drop-shadow-[0_0_10px_rgba(255,107,158,0.5)]"
        animate={{
          y: [0, -15, 0],
          rotate: [0, -20, 0],
          scale: [1, 1.15, 1]
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ x: mouseParallax.x * -0.3, y: mouseParallax.y * -0.3 }}
      >
        <Sparkles className="w-8 h-8" />
      </motion.div>

      <motion.div
        className="absolute top-[35%] left-[3%] text-neo-cyan drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]"
        animate={{
          y: [0, -25, 0],
          rotate: [0, 25, 0]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ x: mouseParallax.x * 0.7, y: mouseParallax.y * 0.7 }}
      >
        <Zap className="w-7 h-7 fill-current" />
      </motion.div>

      <motion.div
        className="absolute top-[50%] right-[5%] text-neo-yellow drop-shadow-[0_0_8px_rgba(255,225,53,0.4)]"
        animate={{
          y: [0, -12, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        style={{ x: mouseParallax.x * -0.6, y: mouseParallax.y * -0.6 }}
      >
        <Star className="w-6 h-6 fill-current" />
      </motion.div>

      <motion.div
        className="absolute bottom-[35%] left-[8%] text-neo-pink drop-shadow-[0_0_8px_rgba(255,107,158,0.4)]"
        animate={{
          y: [0, -18, 0],
          rotate: [0, -15, 0]
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{ x: mouseParallax.x * 0.4, y: mouseParallax.y * 0.4 }}
      >
        <Heart className="w-6 h-6 fill-current" />
      </motion.div>

      <motion.div
        className="absolute bottom-[25%] right-[15%] text-neo-cyan drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]"
        animate={{
          y: [0, -20, 0],
          rotate: [0, 20, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ x: mouseParallax.x * -0.5, y: mouseParallax.y * -0.5 }}
      >
        <Sparkles className="w-7 h-7" />
      </motion.div>

      {/* Small accent dots scattered around */}
      <motion.div
        className="absolute top-[15%] left-[30%] w-3 h-3 rounded-full bg-neo-yellow shadow-[0_0_10px_rgba(255,225,53,0.6)]"
        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[45%] left-[25%] w-2 h-2 rounded-full bg-neo-pink shadow-[0_0_8px_rgba(255,107,158,0.6)]"
        animate={{ scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute top-[60%] right-[30%] w-2 h-2 rounded-full bg-neo-cyan shadow-[0_0_8px_rgba(0,245,255,0.6)]"
        animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute bottom-[40%] left-[40%] w-2.5 h-2.5 rounded-full bg-neo-purple shadow-[0_0_8px_rgba(187,134,252,0.6)]"
        animate={{ scale: [1, 1.7, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
    </div>
  );
});

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
          className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
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
      {/* Parallax background layers */}
      {!isLandscape && <ParallaxBackground />}

      {/* Floating decorative elements */}
      {!isLandscape && <FloatingDecorations />}

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
              className="md:row-span-2"
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
