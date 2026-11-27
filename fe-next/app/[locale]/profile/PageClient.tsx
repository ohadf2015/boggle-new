'use client';

import HolidayHideSpot from '@/components/holidays/hunt/HolidayHideSpot';
import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, BarChart3, Trophy, Gem } from 'lucide-react';
import { ProfileGuestHero } from '@/components/profile/ProfileGuestHero';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { useRouter } from 'next/navigation';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AutoHideHeader from '@/components/AutoHideHeader';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { SupporterInterestCard } from '@/components/monetization/SupporterInterestCard';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

import { usePlayerCollectibles } from '@/hooks/usePlayerCollectibles';
import dynamic from 'next/dynamic';
const LeagueRivalsCard = dynamic(() => import('@/components/leagues/LeagueRivalsCard').then(m => m.LeagueRivalsCard), { ssr: false });
// Sign-in modal opens only on a CTA click — lazy-load to keep its ~40KB out of the
// profile route's initial parse. ssr:false: renders nothing when closed (no CLS).
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { ReferralCard } from '@/components/profile/ReferralCard';
import { XpByModeBreakdown } from '@/components/profile/XpByModeBreakdown';
import { useXpByMode } from '@/hooks/useXpByMode';
import CreatorProfileStats from '@/components/ugc/CreatorProfileStats';
import { getCreatorStats } from '@/utils/creatorRewards';
import { EmailPreferences } from '@/components/settings/EmailPreferences';
import { getSession } from '@/utils/session';

// Profile components (index is mocked wholesale by page tests — new showcase
// pieces are imported by direct path below).
import {
  ProfileHeader,
  ProfileXpSection,
  ProfileStatsGrid,
  ProfileCoinsSection,
  ProfileRankedProgress,
  ProfileAchievements,
  ProfileCollection,
  ProfileBackButtons,
} from '@/components/profile';
import { ProfileShowcaseLayout, type ShowcaseTab } from '@/components/profile/showcase/ProfileShowcaseLayout';
import { PinnedHighlights } from '@/components/profile/showcase/PinnedHighlights';
import { useProfileViewTracking } from '@/components/profile/showcase/useProfileViewTracking';
import { CosmeticCollection } from '@/components/cosmetics/CosmeticCollection';
import { SeasonTrophyCase } from '@/components/seasons/SeasonTrophyCase';
import { SeasonRankCard } from '@/components/seasons/SeasonRankCard';
import { ProfileStyleCard } from '@/components/playerStyle/ProfileStyleCard';
import { PlayGamesCard } from '@/components/playGames/PlayGamesCard';
import { WordMasteryCard } from '@/components/profile/WordMasteryCard';
import { UpNextRail } from '@/components/progression/UpNextRail';
import { TitlePicker } from '@/components/progression/TitlePicker';
import { RecordsGrid } from '@/components/progression/RecordsGrid';
import { HallOfFame } from '@/components/records/HallOfFame';
import { useSeasonBadges } from '@/hooks/useSeasonBadges';
import { useCoinContext } from '@/contexts/CoinContext';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { getGlobalLeaderboardTier } from '@/lib/ranked/leaderboardTiers';
import { useExperiment } from '@/hooks/useExperiment';
import posthog from '@/lib/analytics/lazyPosthog';

interface GameSession {
  gameCode?: string;
}

const PROFILE_SECTIONS = ['overview', 'stats', 'achievements', 'collection'] as const;
type ProfileSection = (typeof PROFILE_SECTIONS)[number];
const SECTION_ICONS: Record<ProfileSection, ShowcaseTab['Icon']> = {
  overview: LayoutDashboard,
  stats: BarChart3,
  achievements: Trophy,
  collection: Gem,
};
const SETTINGS_ANCHOR = 'profile-settings';

export default function ProfilePageClient(): React.JSX.Element {
  const { t, language } = useLanguage();
  const { user, profile, isAuthenticated, loading, isAdmin, canPlayRanked, gamesUntilRanked, updateProfile, refreshProfile } = useAuth();
  const xpByMode = useXpByMode(user?.id);
  const router = useRouter();
  // The profile is a dark "stage" surface in both themes (white type on navy).
  const isDarkMode = true;

  // URL-synced tab state via nuqs — two-way binding between ?tab= and React state
  const [activeSection, setActiveSection] = useQueryState(
    'tab',
    parseAsStringLiteral(PROFILE_SECTIONS).withDefault('overview'),
  );

  // State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { variant: lockedTileVariant, trackExposure: trackLockedTileExposure } = useExperiment(
    'exp-profile-locked-tile-tap-v1',
  );
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [activeGameSession, setActiveGameSession] = useState<GameSession | null>(null);
  // Collection-tab node the header portals the avatar collection card into.
  const [collectionSlot, setCollectionSlot] = useState<HTMLDivElement | null>(null);
  const [pendingSettingsJump, setPendingSettingsJump] = useState(false);

  // Hooks
  const { spendCoins } = useCoinContext();
  const { collectibles: playerCollectibles, isLoading: isLoadingCollectibles } = usePlayerCollectibles(user?.id);
  const { badges: seasonBadges, isLoading: isLoadingSeasonBadges } = useSeasonBadges(user?.id);
  // Cosmetics gate on the score-based leaderboard tier (earned through ANY mode),
  // not the never-fetched profile.rank_tier column. Streak comes from
  // player_engagement (via useEngagementStatus), not the absent profile.streak_days.
  const { streak: currentStreak } = useEngagementStatus();
  const cosmeticRankTier = getGlobalLeaderboardTier(profile?.total_score ?? 0).id;

  useProfileViewTracking({ profileKey: profile?.id ?? user?.id, isOwn: true, ready: !loading && isAuthenticated });

  // Guest teaser view — baseline for the locked-tile rage-click fix.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      posthog.capture('profile_locked_teaser_viewed');
      trackLockedTileExposure();
    }
  }, [loading, isAuthenticated, trackLockedTileExposure]);

  const handleLockedTileTap = useCallback(() => {
    posthog.capture('profile_locked_tile_tapped');
    setShowAuthModal(true);
  }, []);

  // Pull-to-refresh
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      await refreshProfile();
      toast.success(t('common.refreshed'), {
        duration: 2000,
      });
    },
    threshold: 60,
  });

  // Check for active game session on mount
  useEffect(() => {
    const session = getSession();
    if (session && session.gameCode) {
      setActiveGameSession(session);
    }
  }, []);

  // Gear on the stage → Collection tab, then scroll to the account block once it mounts.
  const openSettings = useCallback(() => {
    setActiveSection('collection');
    setPendingSettingsJump(true);
  }, [setActiveSection]);
  useEffect(() => {
    if (!pendingSettingsJump || activeSection !== 'collection') return;
    const id = window.setTimeout(() => {
      document.getElementById(SETTINGS_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingSettingsJump(false);
    }, 60);
    return () => window.clearTimeout(id);
  }, [pendingSettingsJump, activeSection]);

  // Not authenticated - show sign in prompt
  if (!loading && !isAuthenticated) {
    return (
      <div className="relative isolate flex flex-col h-full page-content-safe bg-neo-navy">
        <AmbientBackdrop theme="profile" />
        <AutoHideHeader />
        <div className="max-w-md mx-auto px-4 pt-8 pb-6 w-full">
          <ProfileGuestHero
            canSignIn={!isOnCrazyGamesPlatform}
            tilesTappable={lockedTileVariant === 'tappable'}
            onSignIn={() => setShowAuthModal(true)}
            onLockedTileTap={handleLockedTileTap}
            onPlay={() => router.push(`/${language}`)}
          />
          <div className="mt-12">
            <CosmeticCollection rankTier={cosmeticRankTier} streakDays={0} coins={0} />
          </div>
        </div>
        {!isOnCrazyGamesPlatform && showAuthModal && (
          <AuthModal isOpen onClose={() => setShowAuthModal(false)} showGuestStats={true} />
        )}
      </div>
    );
  }

  // Loading state — skeleton in the shape of the stage (card, name, stats, tabs).
  // Auth can report isAuthenticated before the profile row arrives: rendering the
  // stage then flashes "Mystery player / Lv 1 / Set your name" before the real one.
  if (loading || (isAuthenticated && !profile)) {
    return (
      <div className="flex flex-col h-full page-content-safe bg-neo-navy">
        <AutoHideHeader />
        <div className="w-full max-w-6xl mx-auto px-5 pt-3 md:px-6 md:py-6 md:grid md:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] md:gap-8">
          <div className="flex flex-col gap-3">
            <div className="h-[292px] md:h-[340px] rounded-neo-xl bg-neo-navy-elevated animate-pulse" />
            <div className="h-8 w-48 rounded bg-neo-navy-elevated animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {['a', 'b', 'c', 'd'].map((id) => (
                <div key={`stat-skel-${id}`} className="h-16 rounded-neo bg-neo-navy-elevated animate-pulse" />
              ))}
            </div>
          </div>
          <div className="mt-5 md:mt-0 flex flex-col gap-3">
            <div className="h-14 rounded-neo bg-neo-navy-elevated animate-pulse" />
            <div className="h-64 rounded-neo-lg bg-neo-navy-elevated animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const tabs: ShowcaseTab[] = PROFILE_SECTIONS.map((id) => ({
    id,
    label: t(`profile.sections.${id}`),
    Icon: SECTION_ICONS[id],
  }));

  const stage = (
    <ProfileHeader
      profile={profile}
      isDarkMode={isDarkMode}
      updateProfile={updateProfile}
      refreshProfile={refreshProfile}
      onOpenSettings={openSettings}
      collectionSlot={activeSection === 'collection' ? collectionSlot : null}
    />
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 relative isolate bg-neo-navy">
      <HolidayHideSpot slot="profile" />
      <AmbientBackdrop theme="profile" />
      <AutoHideHeader />
      <ProfileShowcaseLayout
        stage={stage}
        tabs={tabs}
        activeTab={activeSection}
        onTabChange={(id) => setActiveSection(id as ProfileSection)}
        isRtl={language === 'he'}
        panelHandlers={pullToRefreshHandlers}
        beforePanel={<PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={60} />}
      >
        {activeSection === 'overview' && (
          <>
            <UpNextRail level={profile?.current_level} config={profile?.avatar_config} />
            {user?.id && (
              <TitlePicker
                userId={user.id}
                level={profile?.current_level ?? 1}
                prestigeLevel={profile?.prestige_level}
                achievementKeys={Object.keys(profile?.achievement_counts ?? {})}
              />
            )}
            <PinnedHighlights counts={profile?.achievement_counts} onSeeAll={() => setActiveSection('achievements')} />
            {user?.id && <SeasonRankCard playerId={user.id} />}
            {isAuthenticated && <LeagueRivalsCard />}
            <ProfileXpSection profile={profile} isDarkMode={isDarkMode} compact onProfileRefresh={refreshProfile} />
            <WordMasteryCard />
            <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} compact />
            <ProfileStyleCard isDarkMode={isDarkMode} delay={0.1} />
            <CreatorProfileStats stats={getCreatorStats()} />
          </>
        )}

        {activeSection === 'stats' && (
          <>
            <RecordsGrid profile={profile} userId={user?.id} />
            <HallOfFame viewerId={user?.id} />
            <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} />
            <XpByModeBreakdown xpByMode={xpByMode} delay={0.12} />
            {isAuthenticated && <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} />}
          </>
        )}

        {activeSection === 'achievements' && (
          <>
            <ProfileAchievements profile={profile} isDarkMode={isDarkMode} />
            <SeasonTrophyCase badges={seasonBadges} isLoading={isLoadingSeasonBadges} delay={0.1} />
            <PlayGamesCard />
          </>
        )}

        {activeSection === 'collection' && (
          <>
            <div ref={setCollectionSlot} />
            <ProfileCollection collectibles={playerCollectibles} isLoading={isLoadingCollectibles} isDarkMode={isDarkMode} />
            <CosmeticCollection
              rankTier={cosmeticRankTier}
              streakDays={currentStreak}
              coins={profile?.total_coins || 0}
              totalScore={profile?.total_score ?? 0}
              spendCoins={spendCoins}
            />
            {user && (
              <div>
                <ReferralCard />
                <Link
                  href={`/${language}/referrals`}
                  className="block text-center text-sm font-bold text-neo-cyan hover:text-neo-cyan/80 mt-2 transition-colors"
                >
                  {t('referralDashboard.title')} &rarr;
                </Link>
              </div>
            )}
            <section id={SETTINGS_ANCHOR} className="scroll-mt-20 flex flex-col gap-4">
              <h2 className="font-neo-display font-black uppercase tracking-tight text-lg text-neo-white">{t('profile.showcase.account')}</h2>
              {user && <EmailPreferences isDarkMode={isDarkMode} />}
              <SupporterInterestCard />
            </section>
          </>
        )}

        <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
      </ProfileShowcaseLayout>
    </div>
  );
}
