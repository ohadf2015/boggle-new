'use client';

import { useState, useEffect } from 'react';
import { m, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, BarChart3, Trophy, Gem, Sparkles, Star, Lock } from 'lucide-react';
import { LevelRing } from '@/components/profile/LevelRing';
import { useRouter } from 'next/navigation';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AutoHideHeader from '@/components/AutoHideHeader';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

import { usePlayerCollectibles } from '@/hooks/usePlayerCollectibles';
import AuthModal from '@/components/auth/AuthModal';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { ReferralCard } from '@/components/profile/ReferralCard';
import { XpByModeBreakdown } from '@/components/profile/XpByModeBreakdown';
import { useXpByMode } from '@/hooks/useXpByMode';
import CreatorProfileStats from '@/components/ugc/CreatorProfileStats';
import { getCreatorStats } from '@/utils/creatorRewards';
import { EmailPreferences } from '@/components/settings/EmailPreferences';
import { cn } from '@/lib/utils';
import { getSession } from '@/utils/session';

// Profile components
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
import { CosmeticCollection } from '@/components/cosmetics/CosmeticCollection';
import { SeasonTrophyCase } from '@/components/seasons/SeasonTrophyCase';
import { SeasonRankCard } from '@/components/seasons/SeasonRankCard';
import { ProfileStyleCard } from '@/components/playerStyle/ProfileStyleCard';
import { PlayGamesCard } from '@/components/playGames/PlayGamesCard';
import { useSeasonBadges } from '@/hooks/useSeasonBadges';
import { useCoinContext } from '@/contexts/CoinContext';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { getGlobalLeaderboardTier } from '@/lib/ranked/leaderboardTiers';

interface GameSession {
  gameCode?: string;
}

export default function ProfilePageClient(): React.JSX.Element {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isAuthenticated, loading, isAdmin, canPlayRanked, gamesUntilRanked, updateProfile, refreshProfile } = useAuth();
  const xpByMode = useXpByMode(user?.id);
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  // URL-synced tab state via nuqs — two-way binding between ?tab= and React state
  const profileSections = ['overview', 'stats', 'achievements', 'collection'] as const;
  const [activeSection, setActiveSection] = useQueryState(
    'tab',
    parseAsStringLiteral(profileSections).withDefault('overview'),
  );

  // State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [activeGameSession, setActiveGameSession] = useState<GameSession | null>(null);

  // Hooks
  const { spendCoins } = useCoinContext();
  const { collectibles: playerCollectibles, isLoading: isLoadingCollectibles } = usePlayerCollectibles(user?.id);
  const { badges: seasonBadges, isLoading: isLoadingSeasonBadges } = useSeasonBadges(user?.id);
  // Cosmetics gate on the score-based leaderboard tier (earned through ANY mode),
  // not the never-fetched profile.rank_tier column. Streak comes from
  // player_engagement (via useEngagementStatus), not the absent profile.streak_days.
  const { streak: currentStreak } = useEngagementStatus();
  const cosmeticRankTier = getGlobalLeaderboardTier(profile?.total_score ?? 0).id;

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

  // Section navigation
  const sections = profileSections;
  const currentIndex = sections.indexOf(activeSection);

  const goToNextSection = () => {
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1]);
    }
  };

  const goToPrevSection = () => {
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1]);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50; // Minimum drag distance to trigger navigation
    const isRtl = language === 'he'; // Hebrew is RTL

    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        // Dragged right: In LTR = previous, In RTL = next
        if (isRtl) {
          goToNextSection();
        } else {
          goToPrevSection();
        }
      } else {
        // Dragged left: In LTR = next, In RTL = previous
        if (isRtl) {
          goToPrevSection();
        } else {
          goToNextSection();
        }
      }
    }
  };

  // Check for active game session on mount
  useEffect(() => {
    const session = getSession();
    if (session && session.gameCode) {
      setActiveGameSession(session);
    }
  }, []);


  // Not authenticated - show sign in prompt
  if (!loading && !isAuthenticated) {
    return (
      <div className={cn(
        'flex flex-col h-full page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50'
      )}>
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
                <EnhancedButton onClick={() => setShowAuthModal(true)} variant="cyan" haptic animation="pop">
                  {t('auth.signIn')}
                </EnhancedButton>
              )}
              <EnhancedButton variant="outline" onClick={() => router.push(`/${language}`)} haptic>
                <ArrowLeft className="me-2 rtl:rotate-180" />
                {t('profile.backToGame')}
              </EnhancedButton>
            </div>
          </m.div>
        </div>
        {!isOnCrazyGamesPlatform && (
          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} showGuestStats={true} />
        )}
      </div>
    );
  }

  // Loading state with skeletons
  if (loading) {
    return (
      <div className={cn(
        'flex flex-col h-full page-content-safe',
        isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />
        <div className="max-w-4xl mx-auto px-4 py-6 w-full">
          {/* Profile header skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-neo-navy-elevated animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-gray-200 dark:bg-neo-navy-elevated rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-neo-navy-elevated rounded animate-pulse" />
            </div>
          </div>
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {['a', 'b', 'c'].map((id) => (
              <div key={`stat-skel-${id}`} className="h-24 bg-gray-200 dark:bg-neo-navy-elevated rounded-xl animate-pulse" />
            ))}
          </div>
          {/* Content skeleton */}
          <div className="h-64 bg-gray-200 dark:bg-neo-navy-elevated rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Shared props for profile components
  const profileHeaderProps = {
    profile,
    isDarkMode,
    updateProfile,
    refreshProfile
  };

  // Authenticated profile view
  return (
    <>
      {/* ===== MOBILE VIEW ===== */}
      {/* NOTE: Do NOT use h-full here - it creates nested scroll containers with body's screen-fit */}
      {/* Scroll is handled at body level via screen-fit class. This container just provides flex layout. */}
      <div className={cn(
        'md:hidden flex-1 flex flex-col min-h-0 relative',
        isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50'
      )}>
        <AutoHideHeader />

        {/* Tab navigation for mobile */}
        <div className="px-4 pt-3 pb-1" role="tablist" aria-label={t('profile.title')}>
          <div className="flex items-stretch gap-1.5">
            {sections.map((section, index) => {
              const isActive = index === currentIndex;
              const icons = {
                overview: LayoutDashboard,
                stats: BarChart3,
                achievements: Trophy,
                collection: Gem,
              };
              const Icon = icons[section];
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-neo font-neo-display text-xs font-bold uppercase tracking-wide transition-all duration-150',
                    isActive
                      ? 'bg-neo-yellow text-neo-black border-3 border-neo-black shadow-hard-sm scale-[1.02]'
                      : isDarkMode
                        ? 'bg-neo-white/8 text-neo-white border-2 border-neo-white/20 active:scale-95'
                        : 'bg-neo-black/5 text-neo-black/80 border-2 border-neo-black/20 active:scale-95'
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-neo-black' : isDarkMode ? 'text-neo-white' : 'text-neo-black/70')} />
                  <span>{t(`profile.sections.${section}`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* NOTE: Do NOT use overflow-y-auto here - scroll propagates to body's screen-fit */}
        <div className="flex-1 min-h-0 relative">
          {/* Swipe indicator - left side (use logical start for RTL support) */}
          {currentIndex > 0 && (
            <div
              className="absolute inset-s-0 top-0 bottom-0 w-6 z-10 pointer-events-none bg-linear-to-r rtl:bg-linear-to-l from-neo-navy/60 to-transparent flex items-center justify-start ps-1"
              aria-hidden="true"
            >
              <ChevronLeft className="w-4 h-4 text-neo-yellow/60 rtl:rotate-180" />
            </div>
          )}

          {/* Swipe indicator - right side (use logical end for RTL support) */}
          {currentIndex < sections.length - 1 && (
            <div
              className="absolute inset-e-0 top-0 bottom-0 w-6 z-10 pointer-events-none bg-linear-to-l rtl:bg-linear-to-r from-neo-navy/60 to-transparent flex items-center justify-end pe-1"
              aria-hidden="true"
            >
              <ChevronRight className="w-4 h-4 text-neo-yellow/60 rtl:rotate-180" />
            </div>
          )}

          <m.div
            className="h-full px-5 pt-2 pb-24 sm:pb-0 page-content-safe"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            {...pullToRefreshHandlers}
          >
            <PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={60} />

          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <m.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileHeader {...profileHeaderProps} compact />
                <ProfileStyleCard isDarkMode={isDarkMode} delay={0.18} />
                <ProfileXpSection profile={profile} isDarkMode={isDarkMode} compact onProfileRefresh={refreshProfile} />
                <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} compact />
                <CreatorProfileStats stats={getCreatorStats()} className="mt-4" />
                <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
              </m.div>
            )}

            {activeSection === 'stats' && (
              <m.div
                key="stats"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} />
                <XpByModeBreakdown xpByMode={xpByMode} delay={0.12} />
                {isAdmin && <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} />}
              </m.div>
            )}

            {activeSection === 'achievements' && (
              <m.div
                key="achievements"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileAchievements profile={profile} isDarkMode={isDarkMode} />
                <div className="mt-4"><PlayGamesCard /></div>
              </m.div>
            )}

            {activeSection === 'collection' && (
              <m.div
                key="collection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {user && <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-4"><ReferralCard /></m.div>}
                {user?.id && <div className="mb-4"><SeasonRankCard playerId={user.id} /></div>}
                <SeasonTrophyCase badges={seasonBadges} isLoading={isLoadingSeasonBadges} delay={0.32} />
                <ProfileCollection collectibles={playerCollectibles} isLoading={isLoadingCollectibles} isDarkMode={isDarkMode} />
                <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.37 }} className="mt-4">
                  <CosmeticCollection
                    rankTier={cosmeticRankTier}
                    streakDays={currentStreak}
                    coins={profile?.total_coins || 0}
                    totalScore={profile?.total_score ?? 0}
                    spendCoins={spendCoins}

                  />
                </m.div>
                {user && <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}><EmailPreferences isDarkMode={isDarkMode} /></m.div>}
                <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
              </m.div>
            )}
          </AnimatePresence>

          </m.div>
        </div>

      </div>

      {/* ===== DESKTOP VIEW ===== */}
      <div
        className={cn(
          'hidden md:flex md:flex-col md:h-full relative',
          isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50'
        )}
        {...pullToRefreshHandlers}
      >
        <PullToRefreshIndicator pullDistance={pullState.pullDistance} isRefreshing={pullState.isRefreshing} threshold={60} />
        <AutoHideHeader />

        {/* Single column stacked layout */}
        <div className={cn('flex-1 max-w-6xl mx-auto px-4 lg:px-6 w-full flex flex-col gap-6', 'py-6 lg:py-8')}>
          {/* 1. Hero Banner */}
          <ProfileHeader {...profileHeaderProps} />

          {/* 1b. Player style (music + accent + avatar) — admin-gated */}
          <ProfileStyleCard isDarkMode={isDarkMode} delay={0.12} />

          {/* 2. Stats Grid */}
          <ProfileStatsGrid profile={profile} isDarkMode={isDarkMode} delay={0.1} />

          {/* 3. XP + Coins side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfileXpSection profile={profile} isDarkMode={isDarkMode} delay={0.15} onProfileRefresh={refreshProfile} />
            <ProfileCoinsSection profile={profile} isDarkMode={isDarkMode} delay={0.18} />
          </div>

          {/* 3b. XP by Mode — where your XP came from */}
          <XpByModeBreakdown xpByMode={xpByMode} delay={0.19} />

          {/* 4. Ranked Progress */}
          {isAdmin && <ProfileRankedProgress profile={profile} isDarkMode={isDarkMode} canPlayRanked={canPlayRanked} gamesUntilRanked={gamesUntilRanked} delay={0.2} />}

          {/* 4b. Creator Stats */}
          <CreatorProfileStats stats={getCreatorStats()} />

          {/* 5. Referral */}
          {user && (
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <ReferralCard />
              <Link
                href={`/${language}/referrals`}
                className="block text-center text-sm font-bold text-neo-cyan hover:text-neo-cyan/80 mt-2 transition-colors"
              >
                {t('referralDashboard.title')} &rarr;
              </Link>
            </m.div>
          )}

          {/* 6. Achievements */}
          <ProfileAchievements profile={profile} isDarkMode={isDarkMode} delay={0.3} />

          {/* 6b. Play Games (Android-only — self-hides off Android via the hook) */}
          <PlayGamesCard delay={0.32} />

          {/* 7a. Current-season rank */}
          {user?.id && <div className="mb-4"><SeasonRankCard playerId={user.id} /></div>}

          {/* 7. Season Trophies (Top-5 placements) */}
          <SeasonTrophyCase badges={seasonBadges} isLoading={isLoadingSeasonBadges} delay={0.33} />

          {/* 7b. Collection */}
          <ProfileCollection collectibles={playerCollectibles} isLoading={isLoadingCollectibles} isDarkMode={isDarkMode} delay={0.35} />
          <CosmeticCollection
            rankTier={cosmeticRankTier}
            streakDays={currentStreak}
            coins={profile?.total_coins || 0}
            totalScore={profile?.total_score ?? 0}
            spendCoins={spendCoins}

          />

          {/* 8. Settings & Navigation */}
          {user && (
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <EmailPreferences isDarkMode={isDarkMode} />
            </m.div>
          )}

          <ProfileBackButtons activeGameSession={activeGameSession} isDarkMode={isDarkMode} />
        </div>

      </div>
    </>
  );
}
