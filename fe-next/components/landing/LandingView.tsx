'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
const LandingAvatarTeaser = dynamic(() => import('./LandingAvatarTeaser').then(m => m.LandingAvatarTeaser), { ssr: false });
import { LandingChallengeCards } from './LandingChallengeCards';
import { LandingMobileCards } from './LandingMobileCards';

// Below-the-fold sections — lazy load to speed up initial render
const LiveActivityTicker = dynamic(() => import('./LiveActivityTicker').then(m => m.LiveActivityTicker), { ssr: false });
const UrgencyCard = dynamic(() => import('./UrgencyCard').then(m => m.UrgencyCard), { ssr: false });
const WotdTeaser = dynamic(() => import('./WotdTeaser').then(m => m.WotdTeaser), { ssr: false });
const DailyMissionsHub = dynamic(() => import('./DailyMissionsHub').then(m => m.DailyMissionsHub), { ssr: false });
const LeagueRivalsCard = dynamic(() => import('@/components/leagues/LeagueRivalsCard').then(m => m.LeagueRivalsCard), { ssr: false });
const WordCollectionCard = dynamic(() => import('@/components/vocabulary/WordCollectionCard').then(m => m.WordCollectionCard), { ssr: false });
const GhostRivalWidget = dynamic(() => import('@/components/engagement/GhostRivalWidget').then(m => m.GhostRivalWidget), { ssr: false });
const WordPactCard = dynamic(() => import('@/components/engagement/WordPactCard').then(m => m.WordPactCard), { ssr: false });
const WeeklyQuestCard = dynamic(() => import('@/components/engagement/WeeklyQuestCard').then(m => m.WeeklyQuestCard), { ssr: false });
const FriendsActivityFeed = dynamic(() => import('./FriendsActivityFeed').then(m => m.FriendsActivityFeed), { ssr: false });
const LandingTopWords = dynamic(() => import('./LandingTopWords').then(m => m.LandingTopWords), { ssr: false });
const LandingYourRank = dynamic(() => import('./LandingYourRank').then(m => m.LandingYourRank), { ssr: false });
const LandingBottomCTA = dynamic(() => import('./LandingBottomCTA').then(m => m.LandingBottomCTA), { ssr: false });
const LandingHallOfFame = dynamic(() => import('./LandingHallOfFame').then(m => m.LandingHallOfFame), { ssr: false });
const LandingShareBanner = dynamic(() => import('./LandingShareBanner').then(m => m.LandingShareBanner), { ssr: false });
const LandingBlogSection = dynamic(() => import('./LandingBlogSection').then(m => m.LandingBlogSection), { ssr: false });
const LandingCommunityShowcase = dynamic(() => import('./LandingCommunityShowcase').then(m => m.LandingCommunityShowcase), { ssr: false });
import { LeaguePositionBadge } from '@/components/leagues/LeaguePositionBadge';
import Header from '@/components/Header';
import { getPerfVariant } from '@/utils/perfVariant';
import { useEvents } from '@/hooks/useEvents';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

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

interface LandingViewProps {
  /** Pre-fetched server data — eliminates client-side waterfall fetches */
  initialData?: LandingInitialData;
}

const LandingView: React.FC<LandingViewProps> = ({ initialData }) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { playTrack, unlockAudio, TRACKS } = useMusic();
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const isLandscape = useMobileLandscape();
  const isMobilePortrait = useMobilePortrait();

  // Defer below-fold content until after first paint to speed up FCP.
  // Uses rAF (fires on next frame ~16ms) instead of requestIdleCallback
  // which can be delayed several seconds on busy pages, blocking scroll.
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const liveRoomStats = useLiveRoomStats();
  const { allTimeBest: playerAllTimeBest } = usePlayerStats();
  const dailyChallengeStatus = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');
  const { activeEvents, myEvents, joinEvent: joinEventAction } = useEvents();
  const { players: topPlayers, loading: topPlayersLoading } = useTopPlayers(5, {
    initialData: initialData?.topPlayers,
  });
  const { activePlayers, gamesToday, gameModes, languages: langCount } = useLandingStats({
    initialGamesToday: initialData?.gamesToday,
  });
  const { solveRate } = useDailySolveRate(language, {
    initialSolveRate: initialData?.solveRate,
  });
  const { champions, loading: hallLoading } = useHallOfFame(5, {
    initialData: initialData?.topPlayers,
  });
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [, setIsAvatarBuilderOpen] = useState(false);

  // Check for room parameter and redirect to multiplayer page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
      router.replace(`/${language}/multiplayer${window.location.search}`);
    }
  }, [language, router]);

  const handlePlayClick = () => {
    unlockAudio();
    router.push(`/${language}/multiplayer?autoCreate=true`);
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

  useEffect(() => { playTrack(TRACKS.BOSSA); }, [playTrack, TRACKS]);

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
      {hydrated && enableHeavyBackground && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

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

      {/* Main content — padding uses CSS breakpoints to avoid JS-driven CLS */}
      <section className="w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 flex flex-col gap-6 sm:gap-8 px-2 py-3 sm:px-3 sm:py-5 md:px-4 md:py-6 lg:px-6 lg:py-8 xl:px-8">
        {/* Hero: Mascot + Title + CTA + Leaderboard Preview */}
        <LandingHero
          players={topPlayers}
          playersLoading={topPlayersLoading}
          isMobilePortrait={isMobilePortrait}
        />

        {/* League Position Badge — social pressure for retention */}
        {isAuthenticated && <LeaguePositionBadge />}

        {/* Social Proof Bar */}
        <LandingSocialProofBar
          activePlayers={activePlayers}
          gamesToday={gamesToday}
          gameModes={gameModes}
          languages={langCount}
        />

        {/* Below-fold sections deferred until after first paint.
            min-h reserves space to prevent CLS when components hydrate. */}
        <div className={cn('transition-opacity duration-300', hydrated ? 'opacity-100' : 'opacity-0')} style={{ minHeight: hydrated ? undefined : '3rem' }}>
          {hydrated && <LiveActivityTicker />}
        </div>

        <div className={cn('transition-opacity duration-300', hydrated ? 'opacity-100' : 'opacity-0')} style={{ minHeight: hydrated ? undefined : '5rem' }}>
          {hydrated && <UrgencyCard />}
        </div>

        {/* Named Rivals — social pressure from nearby league players */}
        {isAuthenticated && (
          <div className={cn('transition-opacity duration-300', hydrated ? 'opacity-100' : 'opacity-0')} style={{ minHeight: hydrated ? undefined : '4rem' }}>
            {hydrated && <LeagueRivalsCard />}
          </div>
        )}

        <div className={cn('transition-opacity duration-300', hydrated ? 'opacity-100' : 'opacity-0')} style={{ minHeight: hydrated ? undefined : '4rem' }}>
          {hydrated && <WotdTeaser />}
        </div>
        <div className={cn('transition-opacity duration-300', hydrated ? 'opacity-100' : 'opacity-0')} style={{ minHeight: hydrated ? undefined : '6rem' }}>
          {hydrated && <DailyMissionsHub />}
        </div>
        {hydrated && <WordCollectionCard />}
        {hydrated && <GhostRivalWidget />}
        {hydrated && <WordPactCard />}
        {hydrated && <WeeklyQuestCard />}
        {hydrated && <FriendsActivityFeed />}

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

        {/* Below-fold sections — deferred until after first paint */}
        {hydrated && (
          <>
            <LandingTopWords />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6 w-full max-w-4xl mx-auto xl:max-w-5xl">
              <div className="lg:flex-1">
                <LandingYourRank />
              </div>
              <div className="lg:flex-1">
                <LandingAvatarTeaser onBuilderOpenChange={setIsAvatarBuilderOpen} />
              </div>
            </div>

            <LandingCommunityShowcase />
            <LandingHallOfFame champions={champions} loading={hallLoading} />

            <div className="w-full max-w-4xl mx-auto">
              <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
            </div>

            <LandingBlogSection />
            <LandingBottomCTA onPlayClick={handlePlayClick} />
          </>
        )}
      </section>

      {!isLandscape && <ScrollIndicator />}

      {!isLandscape && !isMobilePortrait && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdPlaceholder zone="menu" className="my-4" />
        </div>
      )}

      <LandingSEOSection />
    </div>
  );
};

export default LandingView;
