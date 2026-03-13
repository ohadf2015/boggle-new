'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { cn } from '@/lib/utils';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { useLandingStats } from '@/hooks/useLandingStats';
import { useDailySolveRate } from '@/hooks/useDailySolveRate';
import { useHallOfFame } from '@/hooks/useHallOfFame';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { AdPlaceholder } from '@/components/ads';
import { LandingSEOSection, ScrollIndicator } from './LandingSEOSection';
import { LandingHero } from './LandingHero';
import { LandingSocialProofBar } from './LandingSocialProofBar';
import { LandingAvatarTeaser } from './LandingAvatarTeaser';
import { LandingChallengeCards } from './LandingChallengeCards';
import { LandingYourRank } from './LandingYourRank';
import { LandingBottomCTA } from './LandingBottomCTA';
import { LandingTopWords } from './LandingTopWords';
import { LandingHallOfFame } from './LandingHallOfFame';
import { LandingShareBanner } from './LandingShareBanner';
import { LandingMobileCards } from './LandingMobileCards';
import Header from '@/components/Header';
import { hasCompletedOnboarding, markOnboardingSkipped } from '@/utils/onboardingStorage';
import { getPerfVariant } from '@/utils/perfVariant';
import { useEvents } from '@/hooks/useEvents';

const EventBanner = dynamic(() => import('@/components/events/EventBanner'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const ShareReferralModal = dynamic(
  () => import('./ShareReferralModal').then((m) => m.ShareReferralModal),
  { ssr: false }
);
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), { ssr: false });
const PlayfulBackground = dynamic(
  () => import('@/components/ui/PlayfulBackground').then((m) => m.PlayfulBackground),
  { ssr: false }
);

const LandingView: React.FC = () => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { playTrack, unlockAudio, TRACKS } = useMusic();
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const isLandscape = useMobileLandscape();
  const isMobilePortrait = useMobilePortrait();
  const liveRoomStats = useLiveRoomStats();
  const { allTimeBest: playerAllTimeBest } = usePlayerStats();
  const dailyChallengeStatus = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');
  const { activeEvents, myEvents, joinEvent: joinEventAction } = useEvents();
  const { players: topPlayers, loading: topPlayersLoading } = useTopPlayers(5);
  const { activePlayers, gamesToday, gameModes, languages: langCount } = useLandingStats();
  const { solveRate } = useDailySolveRate(language);
  const { champions, loading: hallLoading } = useHallOfFame(5);
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set());
  const visibleEvent = activeEvents.find((e) => !dismissedEventIds.has(e.id));

  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      liveRoomStats.refresh();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { default: toast } = await import('react-hot-toast');
      toast.success(t('common.refreshed'), { duration: 2000 });
    },
    threshold: 60,
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [showTutorialCallout, setShowTutorialCallout] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Check for room parameter and redirect to multiplayer page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
      router.replace(`/${language}/multiplayer${window.location.search}`);
    }
  }, [language, router]);

  // Check if user is first-time visitor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFirstTime = !isAuthenticated && !hasCompletedOnboarding();
    setIsFirstTimeUser(isFirstTime);
    setShowTutorialCallout(isFirstTime);
  }, [isAuthenticated]);

  const handlePlayClick = () => {
    unlockAudio();
    router.push(`/${language}/multiplayer?autoCreate=true`);
  };

  const handleOpenTutorial = () => {
    setShowOnboarding(true);
    setShowTutorialCallout(false);
    if (isFirstTimeUser) {
      markOnboardingSkipped();
      setIsFirstTimeUser(false);
    }
  };

  const [enableHeavyBackground, setEnableHeavyBackground] = useState(false);
  useEffect(() => { setEnableHeavyBackground(getPerfVariant() === 'control'); }, []);

  const [isDesktopWidth, setIsDesktopWidth] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsDesktopWidth(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { playTrack(TRACKS.LOBBY); }, [playTrack, TRACKS]);

  const dailyChallengeStats = {
    hasPlayed: dailyChallengeStatus.hasPlayed,
    hasSolved: dailyChallengeStatus.hasSolved,
    currentStreak: dailyChallengeStatus.currentStreak,
    puzzleNumber: dailyChallengeStatus.puzzleNumber,
    loading: dailyChallengeStatus.loading,
  };

  // Mobile landscape uses the compact card layout
  if (isLandscape && !isDesktopWidth) {
    return (
      <div className="flex-1 flex flex-col bg-gray-100 dark:bg-neo-navy relative page-content-safe landscape-full-height">
        <Header />
        <section className="flex-1 flex items-center justify-center px-2 sm:px-4 py-2">
          <LandingMobileCards
            language={language}
            isLandscape={isLandscape}
            isMobilePortrait={isMobilePortrait}
            isAdmin={isAdmin}
            hasBlastAccess={!!profile?.blast_access}
            activePlayers={liveRoomStats.activePlayers}
            t={t}
            onSinglePlayerClick={handlePlayClick}
            onShareClick={() => setShowShareModal(true)}
            dailyChallengeStats={dailyChallengeStats}
          />
        </section>
        <ShareReferralModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col bg-gray-100 dark:bg-neo-navy relative page-content-safe',
      )}
      {...pullToRefreshHandlers}
    >
      {enableHeavyBackground && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

      <PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={60} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ShareReferralModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      <Header />

      {visibleEvent && (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 pt-2">
          <EventBanner
            event={visibleEvent}
            onJoin={(id) => joinEventAction(id)}
            onDismiss={() => setDismissedEventIds((prev) => new Set([...prev, visibleEvent.id]))}
            hasJoined={myEvents.some((e) => e.id === visibleEvent.id)}
          />
        </div>
      )}

      {/* Main content */}
      <section className={cn(
        'w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 flex flex-col gap-6 sm:gap-8',
        isMobilePortrait ? 'px-2 py-3' : 'px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-4 sm:py-5 md:py-6 lg:py-8'
      )}>
        {/* Hero: Mascot + Title + CTA + Leaderboard Preview */}
        <LandingHero
          players={topPlayers}
          playersLoading={topPlayersLoading}
          isMobilePortrait={isMobilePortrait}
          onPlayClick={handlePlayClick}
        />

        {/* Social Proof Bar */}
        <LandingSocialProofBar
          activePlayers={activePlayers}
          gamesToday={gamesToday}
          gameModes={gameModes}
          languages={langCount}
        />

        {/* Challenge / Mode Cards */}
        <LandingChallengeCards
          language={language}
          isAdmin={isAdmin}
          hasBlastAccess={!!profile?.blast_access}
          activePlayers={liveRoomStats.activePlayers}
          openRooms={liveRoomStats.openRooms}
          totalPlayers={liveRoomStats.totalPlayers}
          playerAllTimeBest={playerAllTimeBest}
          t={t}
          dailyChallengeStats={dailyChallengeStats}
          solveRate={solveRate}
        />

        {/* Top Words */}
        <LandingTopWords />

        {/* Your Rank (auth'd users only) */}
        <LandingYourRank />

        {/* Avatar Teaser */}
        <LandingAvatarTeaser />

        {/* Hall of Fame */}
        <LandingHallOfFame champions={champions} loading={hallLoading} />

        {/* Share Banner */}
        <div className="w-full max-w-4xl mx-auto">
          <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
        </div>

        {/* Bottom CTA */}
        <LandingBottomCTA onPlayClick={handlePlayClick} />
      </section>

      {!isLandscape && <ScrollIndicator />}

      {!isLandscape && !isMobilePortrait && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdPlaceholder zone="menu" className="my-4" />
        </div>
      )}

      <LandingSEOSection />

      {/* Tutorial FAB with Callout */}
      <div className={cn(
        "fixed bottom-20 right-[max(env(safe-area-inset-right,0px),1rem)] z-[55] sm:bottom-24 sm:right-6 lg:right-8",
        "flex flex-col items-end gap-2",
        "rtl:right-auto rtl:left-[max(env(safe-area-inset-left,0px),1rem)] sm:rtl:left-6 lg:rtl:left-8 rtl:items-start"
      )}>
        <AnimatePresence>
          {showTutorialCallout && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative"
            >
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
                  {t('tutorialPrompt.title')}
                </span>
              </motion.div>
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
          aria-label={t('landing.tutorial')}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-xs sm:text-sm">{t('landing.tutorial')}</span>
        </motion.button>
      </div>
    </div>
  );
};

export default LandingView;
