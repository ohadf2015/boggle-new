'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { cn } from '@/lib/utils';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { trackModeSelected } from '@/utils/growthTracking';
import { useLandingStats } from '@/hooks/useLandingStats';
import { AdPlaceholder } from '@/components/ads';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/utils/onboardingStorage';
import { LandingSEOSection, ScrollIndicator } from './LandingSEOSection';
import { LandingHero } from './LandingHero';
const LandingSocialProofBar = dynamic(() => import('./LandingSocialProofBar').then(m => m.LandingSocialProofBar), {
  ssr: false,
  loading: () => <div className="h-10 w-full max-w-4xl mx-auto" />,
});
const LandingAvatarTeaser = dynamic(() => import('./LandingAvatarTeaser').then(m => m.LandingAvatarTeaser), { ssr: false });
import { LandingChallengeCards } from './LandingChallengeCards';
import { LandingLeaderboardPreview } from './LandingLeaderboardPreview';
import { LandingMobileCards } from './LandingMobileCards';

// Below-the-fold sections — lazy load to speed up initial render
// LiveActivityTicker moved out to reduce landing clutter
const UrgencyCard = dynamic(() => import('./UrgencyCard').then(m => m.UrgencyCard), { ssr: false });
// Engagement widgets — only high-value conditional ones on landing
const VaultCardConnected = dynamic(() => import('@/components/vault/VaultCardConnected').then(m => m.VaultCardConnected), { ssr: false });
const GhostRivalWidget = dynamic(() => import('@/components/engagement/GhostRivalWidget').then(m => m.GhostRivalWidget), { ssr: false });
const LandingYourRank = dynamic(() => import('./LandingYourRank').then(m => m.LandingYourRank), { ssr: false });
const LandingShareBanner = dynamic(() => import('./LandingShareBanner').then(m => m.LandingShareBanner), { ssr: false });
const LandingCommunityShowcase = dynamic(() => import('./LandingCommunityShowcase').then(m => m.LandingCommunityShowcase), { ssr: false });
// LeaguePositionBadge, WotdTeaser, WordPact, FriendsActivity moved to dedicated pages
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
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set());
  const visibleEvent = activeEvents.find((e) => !dismissedEventIds.has(e.id));

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [, setIsAvatarBuilderOpen] = useState(false);

  // Mark returning players (cleared localStorage) as onboarded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasCompletedOnboarding()) return;
    if (isAuthenticated && profile?.total_games && profile.total_games > 0) {
      markOnboardingComplete({
        avatarId: profile.avatar_image || 'default',
        displayName: profile.display_name || profile.username || 'Player',
        selectedMode: null,
      });
    }
  }, [isAuthenticated, profile]);

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
    trackModeSelected('arena', 'home_mobile_cta');
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

  // Defer music until after first paint — keeps main thread free during FCP
  useEffect(() => { if (hydrated) playTrack(TRACKS.BOSSA); }, [hydrated, playTrack, TRACKS]);

  const dailyChallengeStats = {
    hasPlayed: dailyChallengeStatus.hasPlayed,
    hasSolved: dailyChallengeStatus.hasSolved,
    currentStreak: dailyChallengeStatus.currentStreak,
    puzzleNumber: dailyChallengeStatus.puzzleNumber,
    loading: dailyChallengeStatus.loading,
  };

  // FTUE is now handled by PageClient — LandingView only renders for returning users


  return (
    <div
      className={cn(
        'flex flex-col bg-gray-100 dark:bg-neo-navy relative page-content-safe',
      )}
    >
      {hydrated && enableHeavyBackground && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

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
      <section className="w-full max-w-7xl mx-auto [overflow-x:clip] relative z-20 flex flex-col gap-6 sm:gap-8 px-2 py-1.5 sm:px-3 sm:py-5 md:px-4 md:py-6 lg:px-6 lg:py-8 xl:px-8">
        {/* Hero: Mascot + Title + CTA + Leaderboard (desktop) */}
        <LandingHero
          players={topPlayers}
          playersLoading={topPlayersLoading}
          isMobilePortrait={isMobilePortrait}
        />

        {/* Social Proof Bar — compact stats, immediately below hero */}
        <LandingSocialProofBar
          activePlayers={activePlayers}
          gamesToday={gamesToday}
          gameModes={gameModes}
          languages={langCount}
        />


        {/* ===== GAME MODES — THE PRIMARY CONTENT ===== */}
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
          cardOrder={initialData?.cardOrder}
        />

        {/* Leaderboard — mobile only (desktop shows in hero sidebar) */}
        {hydrated && isMobilePortrait && (
          <div className="w-full max-w-4xl mx-auto">
            <LandingLeaderboardPreview players={topPlayers} loading={topPlayersLoading} compact />
          </div>
        )}

        {/* Engagement widgets — compact, below game modes. Max 3 to avoid overload */}
        {hydrated && isAuthenticated && (
          <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
            <UrgencyCard />
            <GhostRivalWidget />
            <VaultCardConnected />
          </div>
        )}

        {/* Below-fold sections — deferred until after first paint */}
        {hydrated && (
          <>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6 w-full max-w-4xl mx-auto xl:max-w-5xl">
              <div className="lg:flex-1">
                <LandingYourRank />
              </div>
              <div className="lg:flex-1">
                <LandingAvatarTeaser onBuilderOpenChange={setIsAvatarBuilderOpen} />
              </div>
            </div>

            <LandingCommunityShowcase />

            <div className="w-full max-w-4xl mx-auto">
              <LandingShareBanner onShareClick={() => setShowShareModal(true)} />
            </div>
          </>
        )}
      </section>

      <ScrollIndicator />

      {!isMobilePortrait && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdPlaceholder zone="menu" className="my-4" />
        </div>
      )}

      <LandingSEOSection />
    </div>
  );
};

export default LandingView;
