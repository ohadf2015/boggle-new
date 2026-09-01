'use client';

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
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
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { useTopPlayers } from '@/hooks/useTopPlayers';
import { useLandingStats } from '@/hooks/useLandingStats';
import { InlineBannerAd } from '@/components/ads';
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import { hasCompletedOnboarding, markOnboardingComplete } from '@/utils/onboardingStorage';
import { ScrollIndicator } from './ScrollIndicator';
import { LandingHero } from './LandingHero';
// SSR enabled: receives initialData (gamesToday) at server time → no skeleton flash above the fold.
const LandingSocialProofBar = dynamic(() => import('./LandingSocialProofBar').then(m => m.LandingSocialProofBar), {
  loading: () => <div className="h-10 w-full max-w-4xl mx-auto" />,
});
const LandingAvatarTeaser = dynamic(() => import('./LandingAvatarTeaser').then(m => m.LandingAvatarTeaser), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-neo bg-neo-navy-light/50 animate-pulse" />,
});
// SSR enabled (code-split only): the authored SEO copy and the /blog interlinks are
// the landing page's organic-search surface and MUST be in the server HTML — LandingSEOSection's
// motion variants are visible-by-default for exactly this reason. Do NOT add `ssr: false` here; that ships an
// animate-pulse skeleton to crawlers instead of the <h2>s and links.
// Guarded by LandingView.ssr.test.tsx.
const LandingSEOSection = dynamic(() => import('./LandingSEOSection').then(m => m.LandingSEOSection), {
  loading: () => <div className="h-64 w-full max-w-4xl mx-auto rounded-neo bg-neo-navy-light/40" />,
});
const LandingBlogSection = dynamic(() => import('./LandingBlogSection').then(m => m.LandingBlogSection), {
  loading: () => <div className="h-48 w-full max-w-4xl mx-auto rounded-neo bg-neo-navy-light/40" />,
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
  const { isAuthenticated, isAdmin, profile, user, loading: authLoading } = useAuth();
  // Cold-start guard: the auth session resolves (`authLoading` → false) and sets
  // `user` before the separate profile fetch lands, so the top bar would paint the
  // guest "Player" default then snap to the real name. Keep the profile-derived UI
  // in its skeleton state until the profile actually resolves for a signed-in
  // session (guests get the neutral state immediately). See pitfall Class 1.
  const dashboardProfileLoading = isDashboardProfileLoading(authLoading, user, profile);
  const isMobilePortrait = useMobilePortrait();
  // The in-content InlineBannerAd below is a WEB monetization slot. On native it
  // would register a banner-coordinator 'slot' (priority > the bottom anchor),
  // hijacking the single native banner to this mid-page DOM position — so on a
  // landscape phone the banner floats into the middle of the home page instead
  // of sticking to the bottom. Gate the whole web-ad block off on native; the
  // global AnchoredNativeBanner keeps the banner pinned to the bottom there.
  // Mounted flag (not a bare Capacitor call) keeps SSR/hydration consistent.
  const [isNativeApp, setIsNativeApp] = useState(false);
  useEffect(() => { setIsNativeApp(Capacitor.isNativePlatform()); }, []);

  // Hydration gate: the ad/CTA blocks below depend on client-only state
  // (viewport via isMobilePortrait, native via isNativeApp, onboarding prop) that
  // differs from the SSR snapshot. Rendering them only after mount keeps the
  // server HTML and the client's first render identical → no #418 tag mismatch
  // (they shifted <LandingSEOSection>'s <section> against a client <div>).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // No client-side skeleton gate for the cards. This tree is server-rendered
  // (PageClient is 'use client' but imports LandingView synchronously), so SSR
  // always paints the real cards. A localStorage-token gate would only run on the
  // client and *downgrade* those painted cards into a skeleton until auth resolves
  // — a hydration mismatch + a real→skeleton→real flash for returning users.
  // LandingChallengeCards self-manages auth (useAuth().canSeeInWorkModes, admin
  // cards are additive) and gates hydration-sensitive personalization internally.

  const liveRoomStats = useLiveRoomStats();
  const { allTimeBest: playerAllTimeBest } = usePlayerStats();
  const dailyChallengeStatus = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');
  // Single source of truth for the "fire" streak shown across the home surfaces
  // (top bar, daily card, daily cube). The weekly-chest endpoint computes the
  // real consecutive run across ALL daily modes (Hunt/Wheel/Puzzle) + freezes,
  // so it can't disagree with the chest's own day dots. `useDailyChallengeStatus`
  // alone only knew the Word-Hunt streak (`word_hunt_player_stats`), which is why
  // the surfaces drifted apart. Guests/offline (hook skips the request → no
  // cycleStart) fall back to the local/Hunt value so they still see their own streak.
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

  // Cubes is the permanent homepage layout (the A/B control hero + card grid were
  // retired). The daily challenge is the hero CTA inside the cubes bento, so the
  // page hero drops the now-redundant Play-Now button and leans into playful energy.

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
    // Prefer the chest-authoritative streak once it has resolved (a real
    // cycleStart proves the server replied for an authed user); before that, or
    // for guests, fall back to the local/Hunt streak.
    currentStreak: weeklyChest.cycleStart
      ? weeklyChest.currentStreak
      : dailyChallengeStatus.currentStreak,
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

      {/* Render modals only once opened so their dynamic chunks load on interaction,
          not during initial hydration — keeps ~50KB of modal JS out of the landing
          first-paint parse window. */}
      {!hideExternalAuth && showAuthModal && <AuthModal isOpen onClose={() => setShowAuthModal(false)} />}
      {showShareModal && <ShareReferralModal isOpen onClose={() => setShowShareModal(false)} />}
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
          gameModes={gameModes}
          languages={langCount}
          playerAllTimeBest={playerAllTimeBest}
          dailyChallengeStats={dailyChallengeStats}
          cardOrder={initialData?.cardOrder}
          topPlayers={topPlayers}
          topPlayersLoading={topPlayersLoading}
        />

        {/* ===== DESKTOP / TABLET: play-first arrangement, hidden on mobile where
            the Home Hub takes over. The MODE HUB LEADS: the daily hero + mode
            cubes are the first content below the header, so a new visitor is one
            tap from a game without scrolling (the marketing hero, stats, SEO
            copy and FAQ all live below the fold). The mode-cube image is already
            the page's LCP element (see the preload in (home)/page.tsx) — leading
            with the cubes aligns the visual order with that. ===== */}
        <div className="hidden w-full flex-col gap-6 sm:gap-8 md:flex">
          {/* ===== GAME MODES — THE PRIMARY CONTENT, ABOVE THE FOLD ===== */}
          {/* Always rendered (SSR + client). LandingChallengeCards is the cubes bento;
              it self-manages auth/personalization, so no client-side skeleton swap. */}
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

          {/* Season strip — slim countdown + leaderboard CTA, below the mode hub */}
          <LandingSeasonHero />

          {/* Hero: Mascot + Title + CTA + Leaderboard (desktop) — brand warmth
              BELOW the play surfaces, not in front of them */}
          <LandingHero
            players={topPlayers}
            playersLoading={topPlayersLoading}
            isMobilePortrait={isMobilePortrait}
            energetic
            activePlayers={activePlayers}
          />

          {/* Social Proof Bar — compact stats, below hero */}
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
                <LandingAvatarTeaser onBuilderOpenChange={setIsAvatarBuilderOpen} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollIndicator />

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

      <LandingSEOSection />

      <div className="w-full px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 relative z-20">
        <LandingBlogSection />
      </div>
    </div>
  );
};

export default LandingView;
