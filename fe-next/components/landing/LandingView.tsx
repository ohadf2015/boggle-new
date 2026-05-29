'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { cn } from '@/lib/utils';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { useLandingStats } from '@/hooks/useLandingStats';
import { InlineBannerAd } from '@/components/ads';
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import { hasCompletedOnboarding, hasSupabaseSession, markOnboardingComplete } from '@/utils/onboardingStorage';
import { LandingSEOSection, ScrollIndicator } from './LandingSEOSection';
import { LandingBlogSection } from './LandingBlogSection';
import { LandingHero } from './LandingHero';
import { LandingHeroVariant } from './LandingHeroVariant';
import { LandingCardsSkeleton } from './LandingCardsSkeleton';
// SSR enabled: receives initialData (gamesToday) at server time → no skeleton flash above the fold.
const LandingSocialProofBar = dynamic(() => import('./LandingSocialProofBar').then(m => m.LandingSocialProofBar), {
  loading: () => <div className="h-10 w-full max-w-4xl mx-auto" />,
});
const LandingAvatarTeaser = dynamic(() => import('./LandingAvatarTeaser').then(m => m.LandingAvatarTeaser), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-neo bg-neo-navy-light/50 animate-pulse" />,
});
import { LandingChallengeCards } from './LandingChallengeCards';
import { LandingLeaderboardPreview } from './LandingLeaderboardPreview';
import { LandingSeasonHero } from './LandingSeasonHero';
import { LandingBottomCTA } from './LandingBottomCTA';

// Below-the-fold sections — lazy load to speed up initial render
// LiveActivityTicker moved out to reduce landing clutter
// Engagement widgets — only high-value conditional ones on landing
const LandingYourRank = dynamic(() => import('./LandingYourRank').then(m => m.LandingYourRank), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-neo bg-neo-navy-light/50 animate-pulse" />,
});
// LeaguePositionBadge, WotdTeaser, WordPact, FriendsActivity moved to dedicated pages
import Header from '@/components/Header';
import { getPerfVariant } from '@/utils/perfVariant';
import { useEvents } from '@/hooks/useEvents';
import { useExperiment } from '@/hooks/useExperiment';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

const EventBanner = dynamic(() => import('@/components/events/EventBanner'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const ShareReferralModal = dynamic(
  () => import('./ShareReferralModal').then((m) => m.ShareReferralModal),
  { ssr: false }
);
const PlayfulBackground = dynamic(
  () => import('@/components/ui/PlayfulBackground').then((m) => m.PlayfulBackground),
  { ssr: false }
);

interface LandingViewProps {
  /** Pre-fetched server data — eliminates client-side waterfall fetches */
  initialData?: LandingInitialData;
  /** New users: callback to launch OnboardingFlow when they click play */
  onStartOnboarding?: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ initialData, onStartOnboarding }) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { playTrack, TRACKS } = useMusic();
  const { isAuthenticated, isAdmin, profile, loading: authLoading } = useAuth();
  const isMobilePortrait = useMobilePortrait();

  // Auth-flicker gate: if a Supabase token exists in localStorage we KNOW the user
  // will resolve to authed. Render skeleton until profile lands instead of paint-
  // ing the guest-default card set and overwriting it on hydration. Guests with
  // no token sync straight from localStorage and hit the real cards on paint #1.
  const [hadSession] = useState(() => typeof window !== 'undefined' && hasSupabaseSession());
  const cardsReady = !hadSession || (!authLoading && !!profile);

  // Below-fold content is already code-split via dynamic() imports,
  // so no need for a separate hydration gate that causes CLS.

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
  const handleDismissEvent = useCallback(() => {
    if (visibleEvent) setDismissedEventIds((prev) => new Set([...prev, visibleEvent.id]));
  }, [visibleEvent]);

  // Landing hero A/B test — variant adds subtitle + CTA + live count
  const { variant: heroVariant, trackExposure: trackHeroExposure } =
    useExperiment('landing-variant-homepage-v1');
  useEffect(() => {
    trackHeroExposure();
  }, [trackHeroExposure]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnCrazyGamesPlatform, isLoading: cgLoading } = useCrazyGames();
  // Treat "still resolving" as embedded — prevents the auth modal
  // signup CTA from flashing on first paint while the CG SDK confirms env.
  const hideExternalAuth = cgLoading || isOnCrazyGamesPlatform;
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

  const [enableHeavyBackground, setEnableHeavyBackground] = useState(false);
  useEffect(() => { setEnableHeavyBackground(getPerfVariant() === 'control'); }, []);

  // Queue ambient music on mount. If audio is locked, MusicContext queues the
  // track in pendingUnlockTrackRef and plays it when its own document-level
  // auto-unlock listener fires on the first gesture. Single code path — no
  // duplicate playback.
  useEffect(() => {
    playTrack(TRACKS.BOSSA);
  }, [playTrack, TRACKS]);

  const dailyChallengeStats = {
    hasPlayed: dailyChallengeStatus.hasPlayed,
    hasSolved: dailyChallengeStatus.hasSolved,
    currentStreak: dailyChallengeStatus.currentStreak,
    puzzleNumber: dailyChallengeStatus.puzzleNumber,
    loading: dailyChallengeStatus.loading,
  };

  // FTUE is triggered by LandingView via onStartOnboarding prop for new users


  return (
    <div
      className={cn(
        'flex flex-col bg-neo-navy relative page-content-safe',
      )}
    >
      {enableHeavyBackground && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

      {!hideExternalAuth && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      <ShareReferralModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      <Header />

      {visibleEvent && (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 pt-2">
          <EventBanner
            event={visibleEvent}
            onJoin={(id) => joinEventAction(id)}
            onDismiss={handleDismissEvent}
            hasJoined={myEvents.some((e) => e.id === visibleEvent.id)}
          />
        </div>
      )}

      {/* Main content — padding uses CSS breakpoints to avoid JS-driven CLS */}
      <section className="w-full max-w-7xl mx-auto overflow-x-clip relative z-20 flex flex-col gap-6 sm:gap-8 px-2 py-1.5 sm:px-3 sm:py-5 md:px-4 md:py-6 lg:px-6 lg:py-8 xl:px-8">
        {/* Hero: Mascot + Title + CTA + Leaderboard (desktop) */}
        {heroVariant === 'variant' ? (
          <LandingHeroVariant
            players={topPlayers}
            playersLoading={topPlayersLoading}
            isMobilePortrait={isMobilePortrait}
            activePlayers={activePlayers}
          />
        ) : (
          <LandingHero
            players={topPlayers}
            playersLoading={topPlayersLoading}
            isMobilePortrait={isMobilePortrait}
          />
        )}

        {/* Social Proof Bar — compact stats, immediately below hero */}
        <LandingSocialProofBar
          activePlayers={activePlayers}
          gamesToday={gamesToday}
          gameModes={gameModes}
          languages={langCount}
        />

        {/* Season Hero — prominent themed art + countdown + leaderboard CTA */}
        <LandingSeasonHero />


        {/* ===== GAME MODES — THE PRIMARY CONTENT ===== */}
        {cardsReady ? (
          <LandingChallengeCards
            language={language}
            isAdmin={isAdmin}
            hasBlastAccess={true}
            activePlayers={liveRoomStats.activePlayers}
            openRooms={liveRoomStats.openRooms}
            totalPlayers={liveRoomStats.totalPlayers}
            playerAllTimeBest={playerAllTimeBest}
            t={t}
            dailyChallengeStats={dailyChallengeStats}
            cardOrder={initialData?.cardOrder}
          />
        ) : (
          <LandingCardsSkeleton isAdmin={isAdmin} />
        )}

        {/* Leaderboard — mobile only via CSS (no JS-driven mount/unmount → no CLS) */}
        <div className="md:hidden w-full max-w-4xl mx-auto">
          <LandingLeaderboardPreview players={topPlayers} loading={topPlayersLoading} compact />
        </div>

        {/* Below-fold sections — rank + avatar only. Community/Share moved off landing. */}
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6 w-full max-w-4xl mx-auto xl:max-w-5xl">
            <div className="lg:flex-1">
              <LandingYourRank />
            </div>
            <div className="lg:flex-1">
              <LandingAvatarTeaser onBuilderOpenChange={setIsAvatarBuilderOpen} />
            </div>
          </div>
        </div>
      </section>

      <ScrollIndicator />

      {!isMobilePortrait && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <InlineBannerAd webZone="menu" className="my-4" />
          {/* B2 — CrazyGames home banner */}
          <CrazyGamesBanner size="728x90" className="my-4" />
        </div>
      )}

      {onStartOnboarding && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <LandingBottomCTA onPlayClick={onStartOnboarding} />
        </div>
      )}

      <LandingSEOSection />

      <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 relative z-20">
        <LandingBlogSection />
      </div>
    </div>
  );
};

export default LandingView;
