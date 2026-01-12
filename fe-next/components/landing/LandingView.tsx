'use client';

import React, { useEffect, useState, lazy, Suspense, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap, Brain, Sparkles, Star, Zap, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { cn } from '@/lib/utils';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMouseParallax } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { InteractiveMascotWithEntrance } from '@/components/ui/InteractiveMascot';
import ModeCard from './ModeCard';
import TutorialPrompt from './TutorialPrompt';
import Header from '@/components/Header';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';
import AuthModal from '@/components/auth/AuthModal';

/**
 * Interactive Mascot component for the hero section
 * Responds to hover and click with mood changes
 * Uses responsive sizing - smaller on mobile for better proportions
 */
const HeroMascot = memo(function HeroMascot() {
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  return (
    <div className="relative mx-auto mb-1">
      {/* Interactive Mascot - happy by default, excited on hover, celebrating on click */}
      {/* Responsive: sm (64px) on mobile, md (96px) on tablet, lg (128px) on desktop */}
      <div className="block sm:hidden">
        <InteractiveMascotWithEntrance
          variant="happy"
          size="sm"
          enableHover
          enableClick
          hoverVariant="excited"
          clickVariant="celebrating"
          clickAnimation="bounce"
          priority
          delay={0.1}
        />
      </div>
      <div className="hidden sm:block lg:hidden">
        <InteractiveMascotWithEntrance
          variant="happy"
          size="md"
          enableHover
          enableClick
          hoverVariant="excited"
          clickVariant="celebrating"
          clickAnimation="bounce"
          priority
          delay={0.1}
        />
      </div>
      <div className="hidden lg:block">
        <InteractiveMascotWithEntrance
          variant="happy"
          size="lg"
          enableHover
          enableClick
          hoverVariant="excited"
          clickVariant="celebrating"
          clickAnimation="bounce"
          priority
          delay={0.1}
        />
      </div>

      {/* Sparkle accents around mascot - lime family unified */}
      {enableComplexAnimations && !prefersReducedMotion && (
        <>
          <motion.div
            className="absolute -top-2 -right-2 text-neo-lime"
            animate={{ scale: [0, 1, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <motion.div
            className="absolute top-1/2 -left-4 text-neo-lime-light"
            animate={{ scale: [0, 1, 0], rotate: [0, -180, -360] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          >
            <Star className="w-4 h-4 fill-current" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 right-1/4 text-neo-lime-muted"
            animate={{ scale: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          >
            <Zap className="w-4 h-4 fill-current" />
          </motion.div>
        </>
      )}
    </div>
  );
});

// Lazy load DailyChallengeBanner - not critical for initial paint
const DailyChallengeBanner = lazy(() => import('@/components/daily/DailyChallengeBanner'));

// Dynamic import for OnboardingModal (not needed on initial page load)
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), {
  ssr: false,
});

// Note: ProfileCustomizationModal is now handled globally in ProfileCustomizationWrapper
// (see app/components/ProfileCustomizationWrapper.tsx)

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
  const isMobilePortrait = useMobilePortrait();
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
      });
    },
    threshold: 60,
  });

  // Tutorial prompt state (non-intrusive banner for first-time visitors)
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);

  // Onboarding modal state (opened when user clicks to start tutorial)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auth modal state (opened when user clicks locked feature)
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Note: Profile customization is now handled globally in ProfileCustomizationWrapper

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

  // Play lobby music on landing page (same as multiplayer lobby)
  // Note: We always call playTrack even if audio isn't unlocked yet
  // The MusicContext will queue the request and play when user interacts
  useEffect(() => {
    playTrack(TRACKS.LOBBY);
  }, [playTrack, TRACKS]);

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-100 dark:bg-neo-navy relative overflow-hidden page-content-safe',
        isLandscape && 'landscape-full-height',
        isMobilePortrait && 'h-[100dvh] max-h-[100dvh]',
        !isLandscape && !isMobilePortrait && 'h-full'
      )}
      {...pullToRefreshHandlers}
    >
      {/* Playful background with parallax and floating elements - hidden on mobile portrait for performance */}
      {!isLandscape && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullState.pullDistance}
        isRefreshing={pullState.isRefreshing}
        threshold={60}
      />

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Auth Modal - for locked features */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Note: ProfileCustomizationModal is now rendered globally by ProfileCustomizationWrapper */}

      {/* Header - compact in landscape via CSS */}
      <Header />

      {/* Main content */}
      <main className={cn(
        'w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 flex-1 flex flex-col',
        (isLandscape || isMobilePortrait) && 'justify-center px-2 sm:px-4 py-2',
        !isLandscape && !isMobilePortrait && 'justify-center px-2 sm:px-3 lg:px-6 xl:px-8 py-2 sm:py-3 lg:py-4'
      )}>
        {/* Hero section with mascot - hidden on mobile portrait and landscape */}
        {!isLandscape && !isMobilePortrait && (
          <motion.div
            className="text-center mb-2 sm:mb-3 lg:mb-4 animate-fade-in-fast relative z-10"
            style={{
              transform: `translate(${mouseParallax.x * 1.2}px, ${mouseParallax.y * 1.2}px)`,
            }}
          >
            {/* Mascot - smaller on desktop */}
            <HeroMascot />

            <motion.h1
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white mb-1 sm:mb-1.5 lg:mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('landing.chooseMode') || 'Choose Your Mode'}
            </motion.h1>
            <motion.p
              className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium text-neo-black/80 dark:text-neo-white/85"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('landing.subtitleSimple') || 'Practice solo or challenge friends'}
            </motion.p>
          </motion.div>
        )}

        {/* Tutorial Prompt - Non-intrusive banner for first-time visitors (hidden in landscape and mobile portrait) */}
        {!isLandscape && !isMobilePortrait && (
          <TutorialPrompt
            isVisible={showTutorialPrompt}
            onStartTutorial={handleStartTutorial}
            onDismiss={handleDismissTutorialPrompt}
          />
        )}

        {/* Daily Challenge Banner - Lazy loaded with skeleton fallback */}
        {/* Fixed dimensions prevent CLS - matches DailyChallengeBanner actual height */}
        <div className={`w-full ${isLandscape ? 'mb-2' : 'mb-2 sm:mb-3 lg:mb-4 xl:mb-6'}`}>
          <Suspense fallback={
            <div
              className="w-full p-2 sm:p-3 rounded-neo border-3 border-neo-black shadow-hard bg-neo-yellow"
              style={{ minHeight: isLandscape ? '52px' : '62px' }}
            >
              <div className="flex items-center gap-3 animate-pulse">
                <div className={`${isLandscape ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} rounded-neo bg-neo-black/20 shrink-0`} />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-5 w-32 bg-neo-black/20 rounded" />
                  <div className="h-3 w-20 bg-neo-black/10 rounded" />
                </div>
              </div>
            </div>
          }>
            <DailyChallengeBanner
              compact={isLandscape || isMobilePortrait}
              mascot={isMobilePortrait ? (
                <InteractiveMascotWithEntrance
                  variant="happy"
                  size="xs"
                  enableClick
                  clickVariant="celebrating"
                  clickAnimation="bounce"
                />
              ) : undefined}
            />
          </Suspense>
        </div>

        {/* Mode cards - horizontal in landscape/mobile portrait, centered grid on desktop */}
        {/* Using CSS animation for instant paint without JS overhead */}
        {(isLandscape || isMobilePortrait) ? (
          /* Landscape/Mobile Portrait: Horizontal layout */
          <div className="w-full animate-fade-in-fast flex gap-2 sm:gap-3 flex-1 min-h-0">
            {/* Multiplayer Card - Compact */}
            <Link
              href={`/${language}/multiplayer`}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                'bg-gradient-to-br from-neo-pink to-pink-400',
                'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                'hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm',
                'transition-all min-h-[100px] sm:min-h-[120px]',
                isMobilePortrait && 'max-h-[30dvh]',
                isLandscape && 'max-h-[70dvh]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
              )}
              aria-label={`${t('landing.multiplayer') || 'Multiplayer'} - ${t('landing.multiplayerDesc') || 'Compete with friends'}`}
            >
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" aria-hidden="true" />
              <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.multiplayer') || 'Multiplayer'}</span>
              {!isMobilePortrait && (
                <div className="flex gap-2 text-xs" aria-hidden="true">
                  <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><LayoutGrid className="inline w-3 h-3 mr-1" />Rooms</span>
                  <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Crown className="inline w-3 h-3 mr-1" />Host</span>
                </div>
              )}
            </Link>

            {/* Single Player Card - Compact */}
            <Link
              href={`/${language}/singleplayer`}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                'bg-gradient-to-br from-neo-cyan to-cyan-400',
                'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                'hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm',
                'transition-all min-h-[100px] sm:min-h-[120px]',
                isMobilePortrait && 'max-h-[30dvh]',
                isLandscape && 'max-h-[70dvh]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
              )}
              aria-label={`${t('landing.singlePlayer') || 'Single Player'} - ${t('landing.singlePlayerDesc') || 'Practice at your own pace'}`}
            >
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" aria-hidden="true" />
              <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.singlePlayer') || 'Single Player'}</span>
              {!isMobilePortrait && (
                <div className="flex gap-2 text-xs" aria-hidden="true">
                  <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Bot className="inline w-3 h-3 mr-1" />Bots</span>
                  <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Trophy className="inline w-3 h-3 mr-1" />Challenges</span>
                </div>
              )}
            </Link>
          </div>
        ) : (
          /* Desktop: Centered grid layout */
          <div className="w-full animate-fade-in-fast flex flex-col items-center gap-4 sm:gap-5 lg:gap-6">
            {/* Primary cards - 2 columns, centered */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
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
              <ModeCard
                title={t('landing.singlePlayer') || 'Single Player'}
                description={t('landing.singlePlayerDesc') || 'Practice at your own pace or challenge yourself!'}
                href={`/${language}/singleplayer`}
                icon={<User className="w-6 h-6" />}
                variant="cyan"
              />
            </div>

            {/* Secondary cards - 2 columns, centered, smaller */}
            <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <ModeCard
                title={t('landing.brainTraining') || 'Brain Training'}
                description={t('landing.brainTrainingDesc') || 'Track cognitive growth'}
                href={`/${language}/brain`}
                icon={<Brain className="w-5 h-5" />}
                variant="purple"
                secondary
              />
              <ModeCard
                title={t('landing.brainDrills') || 'Quick Drills'}
                description={t('landing.brainDrillsDesc') || 'Focused mini-games'}
                href={`/${language}/brain#drills`}
                icon={<Target className="w-5 h-5" />}
                variant="orange"
                secondary
                locked={!isAuthenticated}
                lockedMessage={t('landing.signInToUnlock') || 'Sign in to unlock'}
                onLockedClick={() => setShowAuthModal(true)}
              />
            </div>
          </div>
        )}

      </main>

      {/* Tutorial FAB - Fixed bottom corner button */}
      {/* Z-index 45 on mobile, higher on desktop to clear any overlapping elements */}
      {/* Position uses max() to ensure button clears safe area on devices with home indicators */}
      <button
        onClick={handleOpenTutorial}
        className="
          fixed bottom-[max(env(safe-area-inset-bottom,0px),1rem)] right-4 z-[45] lg:bottom-8 lg:right-8 lg:z-[100]
          flex items-center justify-center gap-2
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
