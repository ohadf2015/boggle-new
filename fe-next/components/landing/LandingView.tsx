'use client';

import React, { useEffect, useState, lazy, Suspense, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap, Brain, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { cn } from '@/lib/utils';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMouseParallax } from '@/hooks/useTiltEffect';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import ModeCard from './ModeCard';
import TutorialPrompt from './TutorialPrompt';
import Header from '@/components/Header';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';
import { getPerfVariant } from '@/utils/perfVariant';
import AuthModal from '@/components/auth/AuthModal';

interface HeroMascotProps {
  /** Whether in mobile portrait mode - uses smaller size */
  isMobilePortrait?: boolean;
}

/**
 * Interactive Mascot component for the hero section
 * Responds to hover and click with mood changes
 * Uses responsive sizing - xs on mobile portrait, sm/md/lg on other viewports
 */
const HeroMascot = memo(function HeroMascot({ isMobilePortrait = false }: HeroMascotProps) {
  // Mobile portrait: use sm size (64px) with tap interaction
  if (isMobilePortrait) {
    return (
      <div className="relative mx-auto mb-0">
        <IdleMascotWithEntrance
          baseVariant="happy"
          size="sm"
          enableHover={false}
          enableClick
          clickVariant="celebrating"
          clickAnimation="bounce"
          priority
          delay={0.1}
        />
      </div>
    );
  }

  // Desktop/tablet: responsive sizes with hover+click
  return (
    <div className="relative mx-auto mb-1">
      {/* sm (64px) on small screens */}
      <div className="block sm:hidden">
        <IdleMascotWithEntrance
          baseVariant="happy"
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
      {/* md (96px) on tablet */}
      <div className="hidden sm:block lg:hidden">
        <IdleMascotWithEntrance
          baseVariant="happy"
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
      {/* lg (128px) on desktop */}
      <div className="hidden lg:block">
        <IdleMascotWithEntrance
          baseVariant="happy"
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
    </div>
  );
});

// Lazy load DailyChallengeBanner - not critical for initial paint
const DailyChallengeBanner = lazy(() => import('@/components/daily/DailyChallengeBanner'));

// Dynamic import for OnboardingModal (not needed on initial page load)
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), {
  ssr: false,
});

const PlayfulBackground = dynamic(
  () => import('@/components/ui/PlayfulBackground').then((m) => m.PlayfulBackground),
  { ssr: false }
);

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
  const { isAuthenticated, loading: authLoading } = useAuth();
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
      const { default: toast } = await import('react-hot-toast');
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

  const [enableHeavyBackground, setEnableHeavyBackground] = useState(false);

  useEffect(() => {
    setEnableHeavyBackground(getPerfVariant() === 'control');
  }, []);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      {enableHeavyBackground && !isLandscape && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

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
        <>
            {/* Hero section with mascot - hidden in landscape only, shown on mobile portrait and desktop */}
            {!isLandscape && (
          <motion.div
            className={cn(
              "text-center animate-fade-in-fast relative z-10",
              isMobilePortrait ? "mb-2" : "mb-4 sm:mb-6 lg:mb-8"
            )}
            style={!isMobilePortrait ? {
              transform: `translate(${mouseParallax.x * 1.2}px, ${mouseParallax.y * 1.2}px)`,
            } : undefined}
          >
            {/* Mascot - responsive sizing: xs on mobile portrait, sm on small screens, md on tablet, lg on desktop */}
            <HeroMascot isMobilePortrait={isMobilePortrait} />

            <motion.h1
              className={cn(
                "font-black uppercase tracking-tight text-neo-black dark:text-neo-white",
                isMobilePortrait
                  ? "text-lg mb-0.5"
                  : "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1 sm:mb-1.5 lg:mb-2"
              )}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('landing.welcomeTitle') || 'Ready to Play?'}
            </motion.h1>
            <motion.p
              className={cn(
                "font-medium text-neo-black/80 dark:text-neo-white/85",
                isMobilePortrait ? "text-xs" : "text-sm sm:text-base lg:text-lg xl:text-xl"
              )}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('landing.welcomeSubtitle') || 'Pick your challenge!'}
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

        {/* Daily Challenge Banner for mobile/landscape - Lazy loaded with skeleton fallback */}
        {/* On desktop, the banner is inside the cards container for tighter spacing */}
        {/* Mode cards - horizontal in landscape/mobile portrait, centered grid on desktop */}
        {/* Using CSS animation for instant paint without JS overhead */}
        {/* Wrapper ensures cards are vertically centered in remaining viewport space */}
        <div className={cn(
          "flex items-center gap-2 sm:gap-4 justify-center min-h-0",
          !isMobilePortrait && "flex-1"
        )}>
        {(isLandscape || isMobilePortrait) ? (
          <div className='flex flex-col w-full'>
            {/* Landscape-only: Show compact welcome text (mobile portrait shows hero section above) */}
            {isLandscape && (
              <div className="text-center mb-2 animate-fade-in-fast">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white">
                  {t('landing.welcomeTitle') || 'Ready to Play?'}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-neo-black/80 dark:text-neo-white/85">
                  {t('landing.welcomeSubtitle') || 'Pick your challenge!'}
                </p>
              </div>
            )}
            <div className="w-full mb-4">
            <Suspense fallback={
              <div
                className="w-full p-2 sm:p-3 rounded-neo border-3 border-neo-black shadow-hard bg-gradient-to-r from-neo-lime via-lime-300 to-yellow-300"
                style={{ minHeight: '52px' }}
              >
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-neo bg-neo-black/20 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-32 bg-neo-black/20 rounded" />
                    <div className="h-3 w-20 bg-neo-black/10 rounded" />
                  </div>
                </div>
              </div>
            }>
              <DailyChallengeBanner compact />
            </Suspense>
          </div>
          {/* Landscape/Mobile Portrait: 2-column grid layout */}
          <div className="w-full animate-fade-in-fast grid grid-cols-2 gap-2 sm:gap-3 min-h-0 auto-rows-fr content-center">
            {/* Multiplayer Card - Compact with glow */}
            <motion.div
              whileHover={{
                scale: 1.03,
                boxShadow: '0 0 25px rgba(255, 20, 147, 0.5), 0 0 50px rgba(255, 20, 147, 0.3), 6px 6px 0px black'
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={`/${language}/multiplayer`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                  'bg-gradient-to-br from-neo-pink to-pink-400',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
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
            </motion.div>

            {/* Single Player Card - Compact with glow */}
            <motion.div
              whileHover={{
                scale: 1.03,
                boxShadow: '0 0 25px rgba(0, 255, 255, 0.5), 0 0 50px rgba(0, 255, 255, 0.3), 6px 6px 0px black'
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={`/${language}/singleplayer`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                  'bg-gradient-to-br from-neo-cyan to-cyan-400',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
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
            </motion.div>

            {/* Brain Training Card - Compact, spans both columns */}
            {/* Show loading state during auth check to prevent UI flicker */}
            {authLoading ? (
              <div
                className={cn(
                  'col-span-2 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                  'bg-gradient-to-br from-neo-purple to-purple-400',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                  'transition-all min-h-[80px] sm:min-h-[100px]',
                  isMobilePortrait && 'max-h-[20dvh]',
                  isLandscape && 'max-h-[50dvh]',
                  'cursor-wait'
                )}
                aria-label={`${t('landing.brainTraining') || 'Brain Training'} - Loading`}
                aria-busy="true"
              >
                <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black animate-pulse" aria-hidden="true" />
                <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.brainTraining') || 'Brain Training'}</span>
              </div>
            ) : isAuthenticated ? (
              <motion.div
                className="col-span-2"
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 0 25px rgba(139, 92, 246, 0.5), 0 0 50px rgba(139, 92, 246, 0.3), 6px 6px 0px black'
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href={`/${language}/brain`}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                    'bg-gradient-to-br from-neo-purple to-purple-400',
                    'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                    'transition-all min-h-[80px] sm:min-h-[100px]',
                    isMobilePortrait && 'max-h-[20dvh]',
                    isLandscape && 'max-h-[50dvh]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
                  )}
                  aria-label={`${t('landing.brainTraining') || 'Brain Training'} - ${t('landing.brainTrainingDesc') || 'Track cognitive growth'}`}
                >
                  <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" aria-hidden="true" />
                  <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.brainTraining') || 'Brain Training'}</span>
                </Link>
              </motion.div>
            ) : (
              <motion.button
                onClick={() => setShowAuthModal(true)}
                className={cn(
                  'col-span-2 flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4 relative',
                  'bg-gradient-to-br from-neo-purple to-purple-400 grayscale',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                  'transition-all min-h-[80px] sm:min-h-[100px]',
                  isMobilePortrait && 'max-h-[20dvh]',
                  isLandscape && 'max-h-[50dvh]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`${t('landing.brainTraining') || 'Brain Training'} - ${t('landing.signInToUnlock') || 'Sign in to unlock'}`}
              >
                {/* Centered lock badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-neo-navy text-neo-white font-bold rounded-neo border-3 border-neo-black shadow-hard text-sm transform -rotate-3">
                    <Lock className="w-4 h-4" />
                    {t('landing.signInToUnlock') || 'Sign in to unlock'}
                  </span>
                </div>
                <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" aria-hidden="true" />
                <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.brainTraining') || 'Brain Training'}</span>
              </motion.button>
            )}
          </div>
          </div>
        ) : (
          /* Desktop: Centered grid layout with visual hierarchy */
          <div className="w-full animate-fade-in-fast flex flex-col items-center justify-center">
            {/* Cards container - Daily Challenge Banner + Mode Cards in single grid */}
            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 justify-items-center">
              {/* Daily Challenge Banner - spans full width */}
              <div className="col-span-1 sm:col-span-2 w-full">
                <Suspense fallback={
                  <div
                    className="w-full p-2 sm:p-3 rounded-neo border-3 border-neo-black shadow-hard bg-gradient-to-r from-neo-lime via-lime-300 to-yellow-300"
                    style={{ minHeight: '62px' }}
                  >
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-neo bg-neo-black/20 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-5 w-32 bg-neo-black/20 rounded" />
                        <div className="h-3 w-20 bg-neo-black/10 rounded" />
                      </div>
                    </div>
                  </div>
                }>
                  <DailyChallengeBanner />
                </Suspense>
              </div>

              {/* Primary cards - Multiplayer and Single Player */}
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

              {/* Brain Training card - centered below primary cards */}
              <div className="col-span-1 sm:col-span-2 flex justify-center w-full">
                <ModeCard
                  title={t('landing.brainTraining') || 'Brain Training'}
                  description={t('landing.brainTrainingDesc') || 'Track cognitive growth'}
                  href={`/${language}/brain`}
                  icon={<Brain className="w-6 h-6" />}
                  variant="purple"
                  secondary
                  loading={authLoading}
                  locked={!isAuthenticated}
                  lockedMessage={t('landing.signInToUnlock') || 'Sign in to unlock'}
                  onLockedClick={() => setShowAuthModal(true)}
                />
              </div>
            </div>
          </div>
        )}
        </div>
        </>
      </main>

      {/* Tutorial FAB - Fixed bottom corner button */}
      {/* Position uses max() to ensure button clears safe area on devices with home indicators */}
      {/* sm:bottom-24 clears the footer (visible at sm:) which is ~72px tall */}
      <motion.button
        onClick={handleOpenTutorial}
        className="
          fixed bottom-[max(env(safe-area-inset-bottom,0px),1rem)] right-[max(env(safe-area-inset-right,0px),1rem)] z-[45] sm:bottom-24 sm:right-6 lg:right-8
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
          rtl:right-auto rtl:left-[max(env(safe-area-inset-left,0px),1rem)] sm:rtl:left-6 lg:rtl:left-8
        "
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: [
            '4px 4px 0px black, 0 0 0px rgba(139, 92, 246, 0)',
            '4px 4px 0px black, 0 0 20px rgba(139, 92, 246, 0.6)',
            '4px 4px 0px black, 0 0 0px rgba(139, 92, 246, 0)',
          ]
        }}
        transition={{
          opacity: { duration: 0.3 },
          y: { duration: 0.3 },
          boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('landing.tutorial') || 'Tutorial'}
      >
        <GraduationCap className="w-5 h-5" />
        <span className="hidden sm:inline">{t('landing.tutorial') || 'Tutorial'}</span>
      </motion.button>
    </div>
  );
};

export default LandingView;
