'use client';

import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import { ArrowLeft, LayoutDashboard, BarChart3, Trophy, Gem, Sparkles, Star, Lock } from 'lucide-react';
import { LevelRing } from '@/components/profile/LevelRing';
import { useRouter } from 'next/navigation';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AutoHideHeader from '@/components/AutoHideHeader';
import { Button } from '@/components/ui/button';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { SupporterInterestCard } from '@/components/monetization/SupporterInterestCard';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

import { usePlayerCollectibles } from '@/hooks/usePlayerCollectibles';
import dynamic from 'next/dynamic';
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
import { cn } from '@/lib/utils';
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
import { useSeasonBadges } from '@/hooks/useSeasonBadges';
import { useCoinContext } from '@/contexts/CoinContext';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { getGlobalLeaderboardTier } from '@/lib/ranked/leaderboardTiers';

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
      <div className="flex flex-col h-full page-content-safe bg-neo-navy">
        <AutoHideHeader />
        <div className="max-w-md mx-auto px-4 py-6 sm:py-8 w-full">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-neo-navy-light border-3 border-neo-black rounded-neo-xl shadow-hard-lg p-6 pt-8 text-center"
          >
            {/* Identity banner — segmented full-palette bar */}
            <div className="absolute top-0 inset-x-0 h-2.5 flex" aria-hidden>
              {['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-purple', 'bg-neo-yellow'].map((c) => (
                <span key={c} className={cn('flex-1 relative', c)}>
                  <span className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" />
                </span>
              ))}
            </div>

            {/* Locked HQ orb — a teaser of the level ring they'll earn */}
            <div className="relative mx-auto w-fit mt-2 mb-5">
              <LevelRing percent={68} size={88} color="cyan" ariaLabel={t('profile.title')}>
                <div className="w-full h-full rounded-full bg-neo-navy border-2 border-neo-black flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-neo-cyan" strokeWidth={2.25} />
                </div>
              </LevelRing>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-0.5 leading-none">
                <span className="text-[8px] font-black uppercase tracking-[0.15em] opacity-70">{t('xp.level')}</span>
                <span className="font-neo-display font-black text-sm">?</span>
              </div>
            </div>

            <h2 className="text-3xl font-black font-neo-display uppercase tracking-tight text-neo-white mb-2">
              {t('profile.title')}
            </h2>
            <p className="text-base text-gray-300 mb-5 font-neo-body">
              {t('auth.upgradePrompt')}
            </p>

            {/* Teaser stat tiles — locked, hinting at what fills in */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { icon: <Star strokeWidth={2.5} className="w-4 h-4" />, label: t('profile.totalScore'), color: 'text-neo-cyan' },
                { icon: <Trophy strokeWidth={2.5} className="w-4 h-4" />, label: t('profile.wins'), color: 'text-neo-pink' },
                { icon: <Gem strokeWidth={2.5} className="w-4 h-4" />, label: t('profile.achievements'), color: 'text-neo-lime' },
              ].map((tile) => (
                <div key={tile.label} className="relative bg-neo-black/40 border-2 border-neo-black rounded-neo px-2 py-2.5">
                  <span className={cn('inline-flex mb-1', tile.color)}>{tile.icon}</span>
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-neo-white truncate leading-none">{tile.label}</p>
                  <div className="mt-1 flex items-center justify-center gap-1 text-gray-500">
                    <Lock className="w-3 h-3" />
                    <span className="font-neo-display font-black text-base">—</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isOnCrazyGamesPlatform && (
                <Button onClick={() => setShowAuthModal(true)} variant="cyan" haptic animation="pop">
                  {t('auth.signIn')}
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push(`/${language}`)} haptic>
                <ArrowLeft className="me-2 rtl:rotate-180" />
                {t('profile.backToGame')}
              </Button>
            </div>
          </m.div>
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
    <div className="flex-1 flex flex-col min-h-0 relative bg-neo-navy">
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
            <PinnedHighlights counts={profile?.achievement_counts} onSeeAll={() => setActiveSection('achievements')} />
            {user?.id && <SeasonRankCard playerId={user.id} />}
            <ProfileXpSection profile={profile} isDarkMode={isDarkMode} compact onProfileRefresh={refreshProfile} />
            <WordMasteryCard />
            <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} compact />
            <ProfileStyleCard isDarkMode={isDarkMode} delay={0.1} />
            <CreatorProfileStats stats={getCreatorStats()} />
          </>
        )}

        {activeSection === 'stats' && (
          <>
            <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} />
            <XpByModeBreakdown xpByMode={xpByMode} delay={0.12} />
            {isAdmin && <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} />}
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
