'use client';

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { useLandingStats } from '@/hooks/useLandingStats';
import { InlineBannerAd } from '@/components/ads';
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import { hasCompletedOnboarding, markOnboardingComplete } from '@/utils/onboardingStorage';
import { LandingHero } from './LandingHero';
// SSR enabled: receives initialData (gamesToday) at server time → no skeleton flash above the fold.
const LandingSocialProofBar = dynamic(() => import('./LandingSocialProofBar').then(m => m.LandingSocialProofBar), {
  loading: () => <div className="h-10 w-full max-w-4xl mx-auto" />,
});
const LandingAvatarTeaser = dynamic(() => import('./LandingAvatarTeaser').then(m => m.LandingAvatarTeaser), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-neo bg-neo-navy-light/50 animate-pulse" />,
});
const LandingBottomCTA = dynamic(() => import('./LandingBottomCTA').then(m => m.LandingBottomCTA), {
  ssr: false,
  loading: () => <div className="h-56 w-full max-w-4xl mx-auto rounded-neo bg-neo-navy-light/40 animate-pulse" />,
});
import { LandingChallengeCards } from './LandingChallengeCards';
import { HomeHub } from './home/HomeHub';
import { LandingSeasonHero } from './LandingSeasonHero';
// Education entry point — teachers/students get their dashboard card; everyone
// else (guests included) gets the always-on classroom promo. Hidden on CrazyGames.
const HomeEducationCardConnected = dynamic(
  () => import('@/components/education/HomeEducationCardConnected').then((m) => m.HomeEducationCardConnected),
  { ssr: false }
);

const LandingYourRank = dynamic(() => import('./LandingYourRank').then(m => m.LandingYourRank), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-neo bg-neo-navy-light/50 animate-pulse" />,
});
import { getPerfVariant } from '@/utils/perfVariant';
import { useEvents } from '@/hooks/useEvents';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';
import { isDashboardProfileLoading } from '@/lib/landing/dashboardReadiness';

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

interface ReturningHomeProps {
  /** Pre-fetched server data — eliminates client-side waterfall fetches */
  initialData?: LandingInitialData;
  /** New users: callback to launch OnboardingFlow when they click play */
  onStartOnboarding?: () => void;
}

/**
 * The returning-user homepage (HomeHub on mobile, the desktop tree above md).
 * Mounted live only for returning visitors — LandingView/homeTree keep it
 * inert for fresh visitors, so none of its data hooks, ads or music run there.
 */
export const ReturningHome: React.FC<ReturningHomeProps> = ({ initialData, onStartOnboarding }) => {
  const { t, language } = useLanguage();
  const { playTrack, TRACKS } = useMusic();
  const { isAuthenticated, isAdmin, profile, user, loading: authLoading } = useAuth();
  // Cold-start guard: the auth session resolves (`authLoading` → false) and sets
  // `user` before the separate profile fetch lands, so the top bar would paint the
  // guest "Player" default then snap to the real name. Keep the profile-derived UI
  // in its skeleton state until the profile actually resolves for a signed-in
  // session (guests get the neutral state immediately). See pitfall Class 1.
  const dashboardProfileLoading = isDashboardProfileLoading(authLoading, user, profile);
  const isMobilePortrait = useMobilePortrait();
  // Web-only ad slot: on native it would hijack the single anchored native banner
  // into this mid-page position. Mounted flag keeps SSR/hydration consistent.
  const [isNativeApp, setIsNativeApp] = useState(false);
  useEffect(() => { setIsNativeApp(Capacitor.isNativePlatform()); }, []);

  // Hydration gate: the ad/CTA blocks below depend on client-only state
  // (viewport via isMobilePortrait, native via isNativeApp, onboarding prop) that
  // differs from the SSR snapshot. Rendering them only after mount keeps the
  // server HTML and the client's first render identical → no #418 tag mismatch
  // (they shifted <LandingSEOSection>'s <section> against a client <div>).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // No client-side skeleton gate for the cards: SSR paints the real cards and
  // LandingChallengeCards self-manages auth/personalization (no real→skeleton flash).

  const liveRoomStats = useLiveRoomStats();
  const { allTimeBest: playerAllTimeBest } = usePlayerStats();
  const dailyChallengeStatus = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');
  // Single source of truth for the "fire" streak: the weekly-chest endpoint counts
  // ALL daily modes + freezes (useDailyChallengeStatus alone only knew Word-Hunt).
  // Guests/offline (no cycleStart) fall back to the local/Hunt value.
  const weeklyChest = useWeeklyChest();
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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnCrazyGamesPlatform, isLoading: cgLoading } = useCrazyGames();
  // Treat "still resolving" as embedded — prevents the auth modal
  // signup CTA from flashing on first paint while the CG SDK confirms env.
  const hideExternalAuth = cgLoading || isOnCrazyGamesPlatform;
  const [showShareModal, setShowShareModal] = useState(false);

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

  const [enableHeavyBackground, setEnableHeavyBackground] = useState(false);
  useEffect(() => { setEnableHeavyBackground(getPerfVariant() === 'control'); }, []);

  // Queue ambient music on mount; MusicContext defers it until its own
  // first-gesture unlock (single code path, no duplicate playback).
  useEffect(() => {
    playTrack(TRACKS.BOSSA);
  }, [playTrack, TRACKS]);

  const dailyChallengeStats = {
    hasPlayed: dailyChallengeStatus.hasPlayed,
    hasSolved: dailyChallengeStatus.hasSolved,
    // Prefer the chest-authoritative streak once it has resolved (a real
    // cycleStart proves the server replied for an authed user); before that, or
    // for guests, fall back to the local/Hunt streak.
    currentStreak: weeklyChest.cycleStart
      ? weeklyChest.currentStreak
      : dailyChallengeStatus.currentStreak,
    puzzleNumber: dailyChallengeStatus.puzzleNumber,
    loading: dailyChallengeStatus.loading,
  };

  return (
    <>
      {enableHeavyBackground && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

      {/* Render modals only once opened so their dynamic chunks load on interaction,
          not during initial hydration — keeps ~50KB of modal JS out of the landing
          first-paint parse window. */}
      {!hideExternalAuth && showAuthModal && <AuthModal isOpen onClose={() => setShowAuthModal(false)} />}
      {showShareModal && <ShareReferralModal isOpen onClose={() => setShowShareModal(false)} />}

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
        {/* Education access strip — always-on for web (teachers, students, guests).
            Hidden on CrazyGames so the consumer embed is not redirected off-platform. */}
        {mounted && !hideExternalAuth && <HomeEducationCardConnected />}

        {/* ===== MOBILE: focused arcade Home Hub (CSS-gated `md:hidden`, never a JS
            branch → no hydration CLS). Reuses the same gated mode list + data hooks
            as the desktop tree below. ===== */}
        <HomeHub
          className="md:hidden"
          profile={profile}
          authLoading={dashboardProfileLoading}
          language={language}
          isAdmin={isAdmin}
          liveRoomStats={liveRoomStats}
          gamesToday={gamesToday}
          playerAllTimeBest={playerAllTimeBest}
          dailyChallengeStats={dailyChallengeStats}
          cardOrder={initialData?.cardOrder}
          topPlayers={topPlayers}
          topPlayersLoading={topPlayersLoading}
        />

        {/* ===== DESKTOP / TABLET =====
            Web: classroom hero + For Teachers CTA lead (Education is the revenue
            path). CrazyGames stays play-first via CSS order so the embed is not
            redirected off-platform. Order is applied only after mount so SSR and
            the first client paint match (CG SDK starts isLoading=true). ===== */}
        <div className="hidden w-full flex-col gap-6 sm:gap-8 md:flex">
          {/* Hero first in source order = web above-the-fold classroom pitch. */}
          <div className={mounted && isOnCrazyGamesPlatform ? 'order-3' : 'order-1'}>
            <LandingHero
              players={topPlayers}
              playersLoading={topPlayersLoading}
              isMobilePortrait={isMobilePortrait}
              energetic
              activePlayers={activePlayers}
            />
          </div>

          {/* Always rendered (SSR + client). LandingChallengeCards is the cubes bento;
              it self-manages auth/personalization, so no client-side skeleton swap. */}
          <div className={mounted && isOnCrazyGamesPlatform ? 'order-1' : 'order-2'}>
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
          </div>

          {/* Season strip — slim countdown + leaderboard CTA, after the lead surface */}
          <div className={mounted && isOnCrazyGamesPlatform ? 'order-2' : 'order-3'}>
            <LandingSeasonHero />
          </div>

          {/* Social Proof Bar — compact stats, below hero */}
          <div className="order-4">
          <LandingSocialProofBar
            activePlayers={activePlayers}
            gamesToday={gamesToday}
            gameModes={gameModes}
            languages={langCount}
          />

          {/* Below-fold sections — rank + avatar only. Community/Share moved off landing. */}
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6 w-full max-w-4xl mx-auto xl:max-w-5xl">
              <div className="lg:flex-1">
                <LandingYourRank />
              </div>
              <div className="lg:flex-1">
                <LandingAvatarTeaser />
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Space reserved in SSR so ads load into a pre-committed slot — eliminates the
          104px layout shift that fires when mounted flips true post-hydration. CSS
          hidden/sm:block replaces the JS isMobilePortrait check to avoid the double-shift
          (appear then disappear) on mobile devices. */}
      {!isNativeApp && (
        <div className="hidden sm:block w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[104px] sm:min-h-[122px]">
          {mounted && !isMobilePortrait && (
            <>
              <InlineBannerAd webZone="menu" className="my-4" />
              {/* B2 — CrazyGames home banner */}
              <CrazyGamesBanner size="728x90" className="my-4" />
            </>
          )}
        </div>
      )}

      {mounted && onStartOnboarding && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <LandingBottomCTA onPlayClick={onStartOnboarding} />
        </div>
      )}

    </>
  );
};
