'use client';

import React, { useEffect, useState, lazy, Suspense, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Bot, Trophy, LayoutGrid, Crown, GraduationCap, Map, Sparkles, Bomb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { cn } from '@/lib/utils';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMouseParallax } from '@/hooks/useTiltEffect';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import ModeCard from './ModeCard';
import ModeCardV2 from './ModeCardV2';
import { LandingShareBanner } from './LandingShareBanner';
import { LandingSEOSection, ScrollIndicator } from './LandingSEOSection';
import Header from '@/components/Header';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';
import { getPerfVariant } from '@/utils/perfVariant';

// Lazy load AuthModal - only opened when user clicks locked feature
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), {
  ssr: false,
});

// Lazy-load the share modal — not needed until user clicks banner
const ShareReferralModal = dynamic(
  () => import('./ShareReferralModal').then((m) => m.ShareReferralModal),
  { ssr: false }
);

interface HeroMascotProps {
  /** Whether in mobile portrait mode - uses smaller size */
  isMobilePortrait?: boolean;
}

/**
 * Interactive Mascot component for the hero section
 * Responds to hover and click with mood changes
 * Single instance with responsive Tailwind sizing instead of 3 CSS-hidden copies
 */
const HeroMascot = memo(function HeroMascot({ isMobilePortrait = false }: HeroMascotProps) {
  return (
    <div className={`relative mx-auto ${isMobilePortrait ? 'mb-0' : 'mb-1'}`}>
      <IdleMascotWithEntrance
        baseVariant="happy"
        size="xl"
        sizeClassName={isMobilePortrait
          ? 'w-24 h-24'
          : 'w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40'
        }
        enableHover={!isMobilePortrait}
        enableClick
        hoverVariant="excited"
        clickVariant="celebrating"
        clickAnimation="bounce"
        priority
        fetchPriority="high"
        delay={0.1}
      />
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
  const { playTrack, unlockAudio, TRACKS } = useMusic();
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const isLandscape = useMobileLandscape();
  const isMobilePortrait = useMobilePortrait();
  const liveRoomStats = useLiveRoomStats();

  // Player stats for single player personal best display
  const { allTimeBest: playerAllTimeBest } = usePlayerStats();

  // Daily challenge pre-fetch for streak and completion status
  const dailyChallengeStatus = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');

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

  // Onboarding modal state (opened when user clicks tutorial button)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Track if user is first-time visitor for tutorial callout
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Tutorial callout visibility (shown above FAB for first-time users)
  const [showTutorialCallout, setShowTutorialCallout] = useState(false);

  // Auth modal state (opened when user clicks locked feature)
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

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

  // Check if user is first-time visitor for tutorial callout
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only consider first-time if not authenticated and hasn't completed onboarding
    const isFirstTime = !isAuthenticated && !hasCompletedOnboarding();
    setIsFirstTimeUser(isFirstTime);
    // Show tutorial callout above FAB for first-time users
    setShowTutorialCallout(isFirstTime);
  }, [isAuthenticated]);

  /**
   * Handle Single Player button click
   * Unlocks audio (required for autoplay policy) and navigates to bot game
   */
  const handleSinglePlayerClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default Link behavior
    unlockAudio(); // Critical for audio autoplay policy
    router.push(`/${language}/singleplayer?autoStart=bots`);
  };

  // Open tutorial modal (from FAB button)
  const handleOpenTutorial = () => {
    setShowOnboarding(true);
    setShowTutorialCallout(false);
    // Mark onboarding as started when user clicks tutorial button
    if (isFirstTimeUser) {
      markOnboardingSkipped();
      setIsFirstTimeUser(false);
    }
  };

  const [enableHeavyBackground, setEnableHeavyBackground] = useState(false);

  useEffect(() => {
    setEnableHeavyBackground(getPerfVariant() === 'control');
  }, []);

  // Desktop breakpoint: screens ≥1024px always use the rich desktop layout
  // regardless of window height (prevents compact laptop browser windows from
  // incorrectly triggering the mobile landscape layout)
  const [isDesktopWidth, setIsDesktopWidth] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsDesktopWidth(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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
        'flex-1 flex flex-col bg-gray-100 dark:bg-neo-navy relative page-content-safe',
        isLandscape && 'landscape-full-height'
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

      {/* Share Referral Modal */}
      <ShareReferralModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />

      {/* Note: ProfileCustomizationModal is now rendered globally by ProfileCustomizationWrapper */}

      {/* Header - compact in landscape via CSS */}
      <Header />

      {/* Main content */}
      <section className={cn(
        'w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 flex flex-col',
        // Landscape: flex-1 + center to fill viewport (SEO hidden in landscape)
        isLandscape && 'flex-1 justify-center px-2 sm:px-4 py-2',
        // Mobile portrait: natural flow so SEO section scrolls into view below cards
        isMobilePortrait && 'px-2 py-2',
        // Desktop: natural flow with generous padding
        !isLandscape && !isMobilePortrait && 'justify-start px-2 sm:px-3 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8'
      )}>
        <>
            {/* Hero section with mascot - hidden in mobile landscape only, always shown on desktop */}
            {(!isLandscape || isDesktopWidth) && (
          <motion.div
            className={cn(
              "text-center animate-fade-in-fast relative",
              // Max-width for desktop to prevent text stretching
              "max-w-3xl mx-auto",
              isMobilePortrait ? "mb-2" : "mb-3 sm:mb-4 lg:mb-5"
            )}
            style={!isMobilePortrait ? {
              transform: `translate(${mouseParallax.x * 1.2}px, ${mouseParallax.y * 1.2}px)`,
            } : undefined}
          >
            {/* Mascot - responsive sizing: xs on mobile portrait, sm on small screens, md on tablet, lg on desktop */}
            <HeroMascot isMobilePortrait={isMobilePortrait} />

            <h1
              className={cn(
                "font-black uppercase tracking-tight text-neo-black dark:text-neo-white animate-fade-in-up",
                isMobilePortrait
                  ? "text-lg mb-0.5"
                  : "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1 sm:mb-1.5 lg:mb-2"
              )}
            >
              {t('landing.welcomeTitle') || 'Ready to Play?'}
            </h1>
            <p
              className={cn(
                "font-medium text-neo-black/80 dark:text-neo-white/85 animate-fade-in-up",
                // Max-width for subtitle readability
                "max-w-xl mx-auto",
                isMobilePortrait ? "text-xs" : "text-sm sm:text-base lg:text-lg xl:text-xl"
              )}
              style={{ animationDelay: '0.1s' }}
            >
              {t('landing.welcomeSubtitle') || 'Pick your challenge!'}
            </p>
          </motion.div>
        )}


        {/* Daily Challenge Banner for mobile/landscape - Lazy loaded with skeleton fallback */}
        {/* On desktop, the banner is inside the cards container for tighter spacing */}
        {/* Mode cards - horizontal in landscape/mobile portrait, centered grid on desktop */}
        {/* Using CSS animation for instant paint without JS overhead */}
        {/* Wrapper ensures cards are vertically centered in remaining viewport space */}
        <div className={cn(
          "flex items-center gap-2 sm:gap-4 justify-center",
          // On mobile portrait, no flex-1 (content stacks naturally)
          // On desktop, no flex-1 either — let content height be natural so
          // the mascot above doesn't get compressed or vertically "split"
          !isMobilePortrait && !isDesktopWidth && "flex-1"
        )}>
        {(!isDesktopWidth && (isLandscape || isMobilePortrait)) ? (
          <div className='flex flex-col w-full'>
            {/* Landscape-only: Show compact welcome text (mobile portrait shows hero section above) */}
            {isLandscape && (
              <div className="text-center mb-2 animate-fade-in-fast">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-neo-black dark:text-neo-white">
                  {t('landing.welcomeTitle') || 'Ready to Play?'}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-neo-black/80 dark:text-neo-white/85">
                  {t('landing.welcomeSubtitle') || 'Pick your challenge!'}
                </p>
              </div>
            )}
            <div className="w-full mb-4">
            <Suspense fallback={
              <div
                className="w-full p-2 sm:p-3 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500"
                style={{ minHeight: '60px' }}
              >
                <div className="flex items-center gap-3 sm:gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-neo bg-neo-navy shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 w-36 bg-neo-black/15 rounded" />
                    <div className="h-3 w-24 bg-neo-black/10 rounded" />
                  </div>
                </div>
              </div>
            }>
              <DailyChallengeBanner compact preloadedStats={{
                hasPlayed: dailyChallengeStatus.hasPlayed,
                hasSolved: dailyChallengeStatus.hasSolved,
                currentStreak: dailyChallengeStatus.currentStreak,
                puzzleNumber: dailyChallengeStatus.puzzleNumber,
                loading: dailyChallengeStatus.loading,
              }} />
            </Suspense>
          </div>
          {/* Landscape/Mobile Portrait: 2-column grid layout */}
          <div className="w-full animate-fade-in-fast grid grid-cols-2 gap-2 sm:gap-3 min-h-0 auto-rows-fr content-center">
            {/* Multiplayer Card - Compact with glow */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="group"
            >
              <Link
                href={`/${language}/multiplayer`}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                  'bg-gradient-to-br from-neo-pink to-pink-400',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                  // Reduced min-height: 80px on xs, 100px on sm (was 100/120px)
                  'transition-all duration-200 min-h-[80px] sm:min-h-[100px]',
                  'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgba(255,20,147,0.4))]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
                )}
                aria-label={`${t('landing.multiplayer') || 'Multiplayer'} - ${t('landing.multiplayerDesc') || 'Compete with friends'}`}
              >
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" aria-hidden="true" />
                <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.multiplayer') || 'Multiplayer'}</span>
                {/* Player count badge - only show when there are active players */}
                {liveRoomStats.activePlayers > 0 && (
                  <div className="flex items-center gap-1 bg-neo-lime text-neo-black px-2 py-0.5 rounded-neo border border-neo-black shadow-hard-xs text-xs font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neo-black" />
                    </span>
                    {liveRoomStats.activePlayers} {t('landing.playingNow') || 'playing'}
                  </div>
                )}
                {!isMobilePortrait && liveRoomStats.activePlayers === 0 && (
                  <div className="flex gap-2 text-xs" aria-hidden="true">
                    <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><LayoutGrid className="inline w-3 h-3 mr-1" />Rooms</span>
                    <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Crown className="inline w-3 h-3 mr-1" />Host</span>
                  </div>
                )}
              </Link>
            </motion.div>

            {/* Single Player Card - Compact with glow */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.15 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="group"
            >
              <Link
                href={`/${language}/singleplayer?autoStart=bots`}
                onClick={handleSinglePlayerClick}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4',
                  'bg-gradient-to-br from-neo-cyan to-cyan-400',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                  // Reduced min-height: 80px on xs, 100px on sm (was 100/120px)
                  'transition-all duration-200 min-h-[80px] sm:min-h-[100px]',
                  'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgba(0,255,255,0.4))]',
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

            {/* Adventure Mode Card */}
            <motion.div
              className="col-span-2 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link
                href={`/${language}/adventure`}
                className={cn(
                  'flex items-center gap-3 p-3 sm:p-4 relative',
                  'bg-gradient-to-br from-neo-lime via-lime-400 to-lime-500',
                  'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                  'transition-all duration-200 min-h-[72px]',
                  'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgba(163,230,53,0.5))]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
                )}
                aria-label={`${t('landing.adventureMode') || 'Adventure'} - ${t('landing.adventureModeDesc') || '100 levels across 10 worlds'}`}
              >
                {/* Icon container */}
                <div className="flex-shrink-0 w-11 h-11 sm:w-13 sm:h-13 bg-neo-black/15 rounded-neo border-2 border-neo-black/20 flex items-center justify-center">
                  <Map className="w-6 h-6 sm:w-7 sm:h-7 text-neo-black" aria-hidden="true" />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span className="block text-sm sm:text-base font-black uppercase text-neo-black leading-tight">
                    {t('landing.adventureMode') || 'Adventure'}
                  </span>
                  <span className="block text-xs sm:text-sm text-neo-black/65 font-semibold mt-0.5 truncate">
                    {t('landing.adventureModeDesc') || '100 levels · 10 worlds'}
                  </span>
                </div>
                {/* Badge + sparkle */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-neo-navy text-neo-white font-black uppercase text-[9px] border border-neo-black rounded-neo shadow-hard-xs">
                    BETA
                  </span>
                  <Sparkles className="w-4 h-4 text-neo-black/40" aria-hidden="true" />
                </div>
              </Link>
            </motion.div>

            {/* Blast Mode Card - Visible to admins and players granted blast access */}
            {(isAdmin || profile?.blast_access) && (
              <motion.div
                className="col-span-2 group"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link
                  href={`/${language}/blast`}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4 relative',
                    'bg-gradient-to-br from-neo-orange to-amber-500',
                    'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                    'transition-all duration-200 min-h-[64px] sm:min-h-[80px]',
                    'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgba(255,107,53,0.4))]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
                  )}
                  aria-label={`${t('landing.blastMode') || 'Blast Mode'} - ${t('landing.blastModeDesc') || 'Clear the board!'}`}
                >
                  <span className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-neo-navy text-neo-white font-black uppercase text-[8px] sm:text-[10px] border border-neo-black rounded-neo shadow-hard-xs transform rotate-3">
                    ADMIN
                  </span>
                  <Bomb className="w-8 h-8 sm:w-10 sm:h-10 text-neo-black" aria-hidden="true" />
                  <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.blastMode') || 'Blast Mode'}</span>
                </Link>
              </motion.div>
            )}
          </div>
            {/* Share banner — below game mode cards on mobile/landscape */}
            <div className="w-full mt-2">
              <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
            </div>
          </div>
        ) : (
          /* Desktop: Centered grid layout with visual hierarchy */
          <div className="w-full animate-fade-in-fast flex flex-col items-center justify-center">
            {/* Cards container - Daily Challenge Banner + Mode Cards in single grid */}
            {/* max-w-4xl (896px) constrains overall width, cards stretch to fill columns */}
            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch px-4 lg:px-6">
              {/* Daily Challenge Banner - spans full width with its own max-width */}
              <div className="col-span-1 sm:col-span-2 w-full max-w-4xl mx-auto">
                <Suspense fallback={
                  <div
                    className="w-full p-3 sm:p-4 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500"
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 animate-pulse">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-neo bg-neo-navy shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-6 w-40 bg-neo-black/15 rounded" />
                        <div className="h-4 w-28 bg-neo-black/10 rounded" />
                      </div>
                    </div>
                  </div>
                }>
                  <DailyChallengeBanner preloadedStats={{
                    hasPlayed: dailyChallengeStatus.hasPlayed,
                    hasSolved: dailyChallengeStatus.hasSolved,
                    currentStreak: dailyChallengeStatus.currentStreak,
                    puzzleNumber: dailyChallengeStatus.puzzleNumber,
                    loading: dailyChallengeStatus.loading,
                  }} />
                </Suspense>
              </div>

              {/* Primary cards - Multiplayer and Single Player */}
              {/* Cards stretch to fill their grid cells, container max-w-4xl constrains overall width */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
                className="w-full h-full"
              >
                <ModeCard
                  title={t('landing.multiplayer') || 'Multiplayer'}
                  description={t('landing.multiplayerDesc') || 'Compete with friends in real-time!'}
                  href={`/${language}/multiplayer`}
                  icon={<Users className="w-6 h-6" />}
                  variant="pink"
                  className="w-full"
                  liveBadge={{
                    openRooms: liveRoomStats.openRooms,
                    totalPlayers: liveRoomStats.totalPlayers,
                    roomsLabel: t('landing.openRooms') || 'open rooms',
                    playersLabel: t('landing.playersLive') || 'playing now',
                  }}
                  playerCount={{
                    count: liveRoomStats.activePlayers,
                    label: t('landing.playingNow') || 'playing',
                  }}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
                className="w-full h-full"
              >
                <ModeCard
                  title={t('landing.singlePlayer') || 'Single Player'}
                  description={t('landing.singlePlayerDesc') || 'Practice at your own pace or challenge yourself!'}
                  href={`/${language}/singleplayer`}
                  icon={<User className="w-6 h-6" />}
                  variant="cyan"
                  className="w-full"
                  personalBest={playerAllTimeBest ? {
                    score: playerAllTimeBest.score,
                    label: t('landing.personalBest') || 'personal best',
                  } : undefined}
                />
              </motion.div>

              {/* Adventure Mode card — constrained width on desktop to match card proportions */}
              <div className="col-span-1 sm:col-span-2 w-full max-w-lg mx-auto">
                <ModeCardV2
                  title={t('landing.adventureMode') || 'Adventure'}
                  description={t('landing.adventureModeDesc') || '100 levels across 10 worlds'}
                  href={`/${language}/adventure`}
                  mode="adventure"
                  variant="lime"
                  badge="BETA"
                  className="w-full"
                />
              </div>

              {/* Secondary card - Blast Mode (visible to admins and players with blast access) */}
              {(isAdmin || profile?.blast_access) && (
                <div className="col-span-1 sm:col-span-2 w-full max-w-md mx-auto">
                  <ModeCard
                    title={t('landing.blastMode') || 'Blast Mode'}
                    description={t('landing.blastModeDesc') || 'Clear the board!'}
                    href={`/${language}/blast`}
                    icon={<Bomb className="w-6 h-6" />}
                    variant="orange"
                    secondary
                    badge="ADMIN"
                    className="w-full"
                  />
                </div>
              )}

              {/* Share banner — bottom of page, after all mode cards */}
              <div className="col-span-1 sm:col-span-2">
                <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
              </div>
            </div>
          </div>
        )}
        </div>
        </>
      </section>

      {/* Scroll indicator + SEO Content — hidden in landscape for UX */}
      {!isLandscape && (
        <>
          <ScrollIndicator />
          <LandingSEOSection />
        </>
      )}

      {/* Tutorial FAB with Callout - Fixed bottom corner */}
      {/* Position accounts for GlobalBottomNav (64px h-16 + safe area) on mobile */}
      {/* sm:bottom-24 clears the footer (visible at sm:) which is ~72px tall */}
      <div className={cn(
        "fixed bottom-20 right-[max(env(safe-area-inset-right,0px),1rem)] z-[55] sm:bottom-24 sm:right-6 lg:right-8",
        "flex flex-col items-end gap-2",
        "rtl:right-auto rtl:left-[max(env(safe-area-inset-left,0px),1rem)] sm:rtl:left-6 lg:rtl:left-8 rtl:items-start"
      )}>
        {/* Callout bubble for first-time users */}
        <AnimatePresence>
          {showTutorialCallout && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative"
            >
              {/* Callout content */}
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  "bg-gradient-to-r from-neo-pink to-neo-purple",
                  "border-2 border-neo-black rounded-neo shadow-hard",
                  "cursor-pointer"
                )}
                onClick={handleOpenTutorial}
                role="status"
                aria-live="polite"
              >
                <Sparkles className="w-4 h-4 text-neo-lime animate-pulse" />
                <span className="text-sm font-bold text-white whitespace-nowrap">
                  {t('tutorialPrompt.title') || 'First time here?'}
                </span>
              </motion.div>
              {/* Arrow pointing down to button */}
              <motion.div
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="absolute -bottom-2 right-4 rtl:right-auto rtl:left-4"
              >
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-neo-black" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tutorial FAB button */}
        <motion.button
          onClick={handleOpenTutorial}
          className={cn(
            "flex items-center justify-center gap-2",
            "min-w-[48px] min-h-[48px]",
            "px-4 py-3",
            "bg-neo-purple text-neo-white",
            "font-bold text-sm",
            "border-3 border-neo-black",
            "rounded-neo shadow-hard-lg",
            "hover:shadow-hard-xl active:shadow-hard",
            "transition-shadow duration-150",
            "animate-fade-in-up",
            isFirstTimeUser && "animate-pulse-subtle"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('landing.tutorial') || 'Tutorial'}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="hidden sm:inline">{t('landing.tutorial') || 'Tutorial'}</span>
        </motion.button>
      </div>
    </div>
  );
};

export default LandingView;
