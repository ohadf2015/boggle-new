'use client';

// Note: Dynamic rendering is set in page.tsx (server component)
import { useState, useMemo, useCallback, useEffect } from 'react';
import { m } from 'framer-motion';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { Trophy, ArrowLeft, RefreshCw, PencilRuler } from 'lucide-react';

const CreatorLeaderboard = dynamic(() => import('@/components/ugc/CreatorLeaderboard'), { ssr: false });
import { Loader } from '@/components/ui/Loader';
import { SkeletonCard } from '@/components/ui/EnhancedLoading';
import { ErrorState, EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { useRouter } from 'next/navigation';
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageStateHandler } from '@/components/layout/PageStateHandler';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard, useUserRank } from '@/hooks/useSupabaseRealtime';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { InlineBannerAd } from '@/components/ads';
const NearRankIndicator = dynamic(() => import('@/components/leaderboard/NearRankIndicator'), { ssr: false });
import { TierBadge, TierProgressBar } from '@/components/ui/TierBadge';
import { useTierPromotion } from '@/hooks/useTierPromotion';
import { useTierPosition } from '@/hooks/useTierPosition';
import { useExperiment } from '@/hooks/useExperiment';
const TierPositionPanel = dynamic(() => import('@/components/leaderboard/TierPositionPanel'), { ssr: false });
import { SeasonLeaderboardTabs, type SeasonTabKey } from '@/components/seasons/SeasonLeaderboardTabs';
const SeasonBanner = dynamic(() => import('@/components/multiplayer/SeasonBanner').then(m => ({ default: m.SeasonBanner })), { ssr: false });
const PastSeasonsLeaderboard = dynamic(() => import('@/components/seasons/PastSeasonsLeaderboard').then(m => ({ default: m.PastSeasonsLeaderboard })), { ssr: false });
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import {
  getGlobalLeaderboardTier,
  getLeaderboardTierProgress,
  getNextTierThreshold,
  GLOBAL_LEADERBOARD_TIERS,
} from '@/lib/ranked/leaderboardTiers';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface LeaderboardEntry {
  player_id: string;
  display_name?: string;
  username?: string;
  avatar_image?: string;
  avatar_config?: CustomAvatarConfig | null;
  total_score?: number;
  games_played?: number;
}

function getRankIcon(rank: number): React.ReactNode {
  switch (rank) {
    case 1:
      return <span className="text-2xl">🥇</span>;
    case 2:
      return <span className="text-2xl">🥈</span>;
    case 3:
      return <span className="text-2xl">🥉</span>;
    default:
      return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  }
}

export default function LeaderboardPageClient(): React.JSX.Element {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user, profile, isSupabaseEnabled } = useAuth();
  const router = useRouter();
  const isDarkMode = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'players' | 'creators'>('players');
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [seasonScope, setSeasonScope] = useState<SeasonTabKey>(
    isOnCrazyGamesPlatform ? 'allTime' : 'season',
  );

  // 'season' = current (date-windowed), 'allTime' = id=0 (no filter), 'pastSeasons' = handled separately
  const querySeasonId = seasonScope === 'allTime' ? 0 : undefined;

  // Use real-time hooks for live leaderboard updates
  const {
    data: leaderboard,
    loading,
    error,
    subscriptionStatus,
    refetch,
  } = useLeaderboard<LeaderboardEntry>({
    limit: 100,
    enabled: isSupabaseEnabled && seasonScope !== 'pastSeasons',
    seasonId: querySeasonId,
  });

  const { rank: userRank } = useUserRank<{ total_score?: number; rank_position?: number }>(user?.id);

  // Compute current user's tier for promotion detection
  const currentUserTier = userRank?.total_score != null
    ? getGlobalLeaderboardTier(userRank.total_score)
    : null;

  useTierPromotion({ userId: user?.id, currentTier: currentUserTier, t });

  const { variant: tierPanelVariant, trackExposure: trackTierPanelExposure } =
    useExperiment('tier-position-panel');
  const tierPanelEnabled = tierPanelVariant === 'enabled';

  const { data: tierPosition } = useTierPosition(
    tierPanelEnabled ? user?.id : undefined,
    typeof querySeasonId === 'number' ? querySeasonId : undefined,
  );

  useEffect(() => {
    if (tierPanelEnabled && tierPosition) trackTierPanelExposure();
  }, [tierPanelEnabled, tierPosition, trackTierPanelExposure]);

  // Pre-compute tiers to avoid calling getGlobalLeaderboardTier per-row on every render
  const leaderboardTiers = useMemo(
    () => new Map(leaderboard.map(entry => [entry.player_id, getGlobalLeaderboardTier(entry.total_score ?? 0)])),
    [leaderboard]
  );

  const handleRefresh = async () => {
    refetch();
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success(t('common.refreshed'), {
      duration: 2000,
    });
  };


  // Supabase not enabled - show coming soon
  if (!isSupabaseEnabled) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <Trophy className="mx-auto text-6xl text-gray-600 mb-4" />
          <h2 className={cn('text-2xl font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
            {t('leaderboard.title')}
          </h2>
          <p className={cn('text-lg', 'text-gray-600')}>
            Coming soon! Leaderboard feature is being set up.
          </p>
          <EnhancedButton
            onClick={() => router.push(`/${language}`)}
            variant="cyan"
            className="mt-6"
            haptic
            animation="pop"
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {t('common.backToMenu')}
          </EnhancedButton>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout onRefresh={handleRefresh} padding="md" maxWidth="4xl">
      <div className={cn('py-4')}>
        {/* Page Title */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1
            className={cn(
              'text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3',
              isDarkMode ? 'text-white' : 'text-gray-900'
            )}
          >
            <Trophy className="text-yellow-500" />
            {t('leaderboard.title')}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <p className={cn('text-gray-600')}>
              {t('leaderboard.allTime')}
            </p>
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-2 h-2 rounded-full animate-pulse',
                  subscriptionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 'bg-yellow-500'
                )}
              />
              <span className={cn('text-xs', 'text-gray-600')}>
                {subscriptionStatus === 'SUBSCRIBED'
                  ? t('leaderboard.live')
                  : t('common.connecting')}
              </span>
            </div>
            <EnhancedButton
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className={cn(
                'h-7 w-7 p-0 rounded-full',
                isDarkMode ? 'hover:bg-neo-navy-elevated' : 'hover:bg-gray-100'
              )}
              title="Refresh"
              haptic
            >
              {loading ? (
                <Loader size="sm" />
              ) : (
                <RefreshCw
                  className={cn(
                    'w-3 h-3',
                    'text-gray-600'
                  )}
                />
              )}
            </EnhancedButton>
          </div>
        </m.div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setActiveTab('players')}
            className={cn(
              'px-4 py-2 font-bold text-sm rounded-neo border-3 border-neo-black transition-all',
              activeTab === 'players'
                ? 'bg-neo-yellow text-neo-black shadow-hard'
                : 'bg-transparent text-gray-400 hover:text-white'
            )}
          >
            <Trophy className="inline w-4 h-4 me-1" />
            {t('leaderboard.title')}
          </button>
          <button
            onClick={() => setActiveTab('creators')}
            className={cn(
              'px-4 py-2 font-bold text-sm rounded-neo border-3 border-neo-black transition-all',
              activeTab === 'creators'
                ? 'bg-neo-pink text-neo-black shadow-hard'
                : 'bg-transparent text-gray-400 hover:text-white'
            )}
          >
            <PencilRuler className="inline w-4 h-4 me-1" />
            {t('ugc.creator.stats')}
          </button>
        </div>

        {activeTab === 'creators' ? (
          <CreatorLeaderboard />
        ) : (
        <>
        {!isOnCrazyGamesPlatform && (
          <>
            <div className="mb-4">
              <SeasonBanner />
            </div>

            <div className="mb-4 flex justify-center">
              <SeasonLeaderboardTabs active={seasonScope} onChange={setSeasonScope} />
            </div>
          </>
        )}

        {seasonScope === 'pastSeasons' && !isOnCrazyGamesPlatform ? (
          <PastSeasonsLeaderboard />
        ) : (
        <>
        {/* User's Rank Card (if authenticated) */}
        {profile && userRank && (
          <div className="space-y-4 mb-6">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'p-4 rounded-xl border-2',
                isDarkMode
                  ? 'bg-linear-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/30'
                  : 'bg-linear-to-r from-cyan-50 to-blue-50 border-cyan-200'
              )}
            >
              {tierPanelEnabled && tierPosition && user?.id ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <Avatar
                      customAvatar={profile.avatar_config}
                      avatarImage={profile.avatar_image ?? undefined}
                      userId={user?.id}
                      size="lg"
                    />
                    <div className="flex-1">
                      <p className={cn('text-xs', 'text-gray-500')}>
                        {t('leaderboard.yourRank')} · #{userRank.rank_position || '—'} {t('leaderboard.global')}
                      </p>
                      <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                        {safeToLocaleString(userRank.total_score ?? 0, language)} {t('leaderboard.score')}
                      </p>
                    </div>
                  </div>
                  <TierPositionPanel position={tierPosition} userId={user.id} />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      customAvatar={profile.avatar_config}
                      avatarImage={profile.avatar_image ?? undefined}
                      userId={user?.id}
                      size="lg"
                    />
                    <div>
                      <p className={cn('text-sm', 'text-gray-600')}>
                        {t('leaderboard.yourRank')}
                      </p>
                      <p className={cn('text-2xl font-bold', isDarkMode ? 'text-cyan-400' : 'text-cyan-600')}>
                        #{userRank.rank_position || '—'}
                      </p>
                      {currentUserTier && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <TierBadge tier={currentUserTier} size="sm" showLabel />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div>
                      <p className={cn('text-sm', 'text-gray-600')}>
                        {t('leaderboard.score')}
                      </p>
                      <p className={cn('text-2xl font-bold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                        {safeToLocaleString(userRank.total_score ?? 0, language)}
                      </p>
                    </div>
                    {currentUserTier && (
                      <TierProgressBar
                        tier={currentUserTier}
                        progress={getLeaderboardTierProgress(userRank.total_score ?? 0, GLOBAL_LEADERBOARD_TIERS)}
                        nextThreshold={getNextTierThreshold(userRank.total_score ?? 0, GLOBAL_LEADERBOARD_TIERS)}
                        className="w-32"
                      />
                    )}
                  </div>
                </div>
              )}
            </m.div>

            {/* Near-Rank Progress Indicator */}
            <NearRankIndicator
              leaderboard={leaderboard}
              userRank={userRank}
              userId={user?.id}
              totalPlayers={leaderboard.length}
              nearbyRange={100}
            />
          </div>
        )}

        {/* Content with loading/error states */}
        <PageStateHandler
          isLoading={loading}
          error={error?.toString()}
          onRetry={refetch}
          isEmpty={!loading && !error && leaderboard.length === 0}
          loadingComponent={
            <div className="space-y-4">
              {/* Skeleton for user rank card */}
              {profile && <SkeletonCard hasImage={false} lines={2} className="bg-neo-cream dark:bg-neo-navy" />}
              {/* Skeleton for leaderboard table */}
              <div className="space-y-2">
                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => (
                  <SkeletonCard key={`lb-skel-${id}`} hasImage={false} lines={1} className="py-3 bg-neo-cream dark:bg-neo-navy" />
                ))}
              </div>
            </div>
          }
          emptyComponent={
            <EnhancedEmptyState
              title={t('leaderboard.noRankYet')}
              description={t('leaderboard.beFirstToPlay')}
              icon="sparkles"
              action={{
                label: t('common.playNow'),
                onClick: () => router.push(`/${language}/singleplayer`),
                variant: 'primary',
              }}
            />
          }
          errorComponent={
            <ErrorState
              title={t('common.error')}
              description={error?.toString() || t('common.tryAgainLater')}
              onRetry={refetch}
            />
          }
        >
          {/* Leaderboard Table */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              'rounded-xl overflow-hidden',
              isDarkMode
                ? 'bg-neo-navy-light/50 border border-slate-700'
                : 'bg-white border border-gray-200 shadow-lg'
            )}
          >
            {/* Table Header */}
            <div
              className={cn(
                'hidden sm:grid grid-cols-10 gap-3 px-3 py-2 text-sm font-semibold',
                isDarkMode ? 'bg-neo-navy-elevated/50 text-gray-300' : 'bg-gray-50 text-gray-600'
              )}
            >
              <div className="col-span-1 text-center">{t('leaderboard.rank')}</div>
              <div className="col-span-5">{t('leaderboard.player')}</div>
              <div className="col-span-2 text-right">{t('leaderboard.score')}</div>
              <div className="col-span-2 text-right">{t('leaderboard.games')}</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {leaderboard.map((entry: LeaderboardEntry, index: number) => {
                const rank = index + 1;
                const isCurrentUser = user?.id === entry.player_id;

                return (
                  <div
                    key={entry.player_id}
                    className={cn(
                      'flex flex-col sm:grid sm:grid-cols-10 gap-1 sm:gap-3 px-3 py-2 items-start sm:items-center transition-colors',
                      isCurrentUser
                        ? isDarkMode
                          ? 'bg-cyan-900/20'
                          : 'bg-cyan-50'
                        : isDarkMode
                          ? 'hover:bg-neo-navy-elevated/30'
                          : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="hidden sm:block sm:col-span-1 text-center">{getRankIcon(rank)}</div>
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:col-span-5">
                      <div className="sm:hidden shrink-0 w-6 text-center">{getRankIcon(rank)}</div>
                      <Avatar
                        customAvatar={entry.avatar_config}
                        avatarImage={entry.avatar_image ?? undefined}
                        userId={entry.player_id}
                        size="sm"
                      />
                      <Link
                        href={`/${language}/player/${encodeURIComponent(entry.player_id)}`}
                        className={cn(
                          'font-medium truncate text-sm hover:underline',
                          isCurrentUser
                            ? isDarkMode
                              ? 'text-cyan-400'
                              : 'text-cyan-600'
                            : isDarkMode
                              ? 'text-white'
                              : 'text-gray-900'
                        )}
                      >
                        {entry.display_name || entry.username}
                      </Link>
                      <TierBadge
                        tier={leaderboardTiers.get(entry.player_id) ?? getGlobalLeaderboardTier(entry.total_score ?? 0)}
                        size="xs"
                        animated={isCurrentUser}
                      />
                      <div className={cn(
                        'sm:hidden font-semibold text-sm',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      )}>
                        {safeToLocaleString(entry.total_score ?? 0, language)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'hidden sm:block sm:col-span-2 text-right font-semibold text-sm',
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {safeToLocaleString(entry.total_score ?? 0, language)}
                    </div>
                    <div className={cn('hidden sm:block sm:col-span-2 text-right text-sm', 'text-gray-600')}>
                      {entry.games_played || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </m.div>
        </PageStateHandler>

        </>
        )}

        </>
        )}

        {/* Non-sticky inline ad — passive page, appears after content before back button */}
        <InlineBannerAd webZone="content-page" className="my-8" />

        {/* Back Button */}
        <div className="mt-8 text-center">
          <EnhancedButton
            onClick={() => router.push(`/${language}`)}
            variant="cyan"
            haptic
            animation="pop"
          >
            <ArrowLeft className="me-2 rtl:rotate-180" />
            {t('common.backToMenu')}
          </EnhancedButton>
        </div>
      </div>
    </PageLayout>
  );
}
