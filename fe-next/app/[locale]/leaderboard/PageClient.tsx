'use client';

// Note: Dynamic rendering is set in page.tsx (server component)
import { useState, useMemo, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { Trophy, ArrowLeft, PencilRuler, Crown } from 'lucide-react';

const CreatorLeaderboard = dynamic(() => import('@/components/ugc/CreatorLeaderboard'), { ssr: false });
import { SkeletonCard } from '@/components/ui/EnhancedLoading';
import { ErrorState, EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageStateHandler } from '@/components/layout/PageStateHandler';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useLeaderboard, useUserRank } from '@/hooks/useSupabaseRealtime';
import { cn } from '@/lib/utils';
import { TitleBadge } from '@/components/progression/TitleBadge';
import { HallOfFame } from '@/components/records/HallOfFame';
import { RecordHolderCrown } from '@/components/records/RecordHolderCrown';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { InlineBannerAd } from '@/components/ads';
import LeaderboardPodium from '@/components/leaderboard/LeaderboardPodium';
import { TierBadge } from '@/components/ui/TierBadge';
import { FriendStatusProvider } from '@/components/friends/FriendStatusContext';
import { FriendQuickAction } from '@/components/friends/FriendQuickAction';
import { PlayerSummaryTrigger } from '@/components/players/PlayerSummaryTrigger';
import type { PlayerSummarySeed } from '@/components/players/playerSummaryModel';
import { YouCard } from '@/components/leaderboard/YouCard';
import { useTierPromotion } from '@/hooks/useTierPromotion';
import { useTierPosition } from '@/hooks/useTierPosition';
import { useExperiment } from '@/hooks/useExperiment';
const TierPositionPanel = dynamic(() => import('@/components/leaderboard/TierPositionPanel'), { ssr: false });
import { SeasonLeaderboardTabs, seasonScopeLabelKey, type SeasonTabKey } from '@/components/seasons/SeasonLeaderboardTabs';
const PastSeasonsLeaderboard = dynamic(() => import('@/components/seasons/PastSeasonsLeaderboard').then(m => ({ default: m.PastSeasonsLeaderboard })), { ssr: false });
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { getGlobalLeaderboardTier } from '@/lib/ranked/leaderboardTiers';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { toBoardEntries } from '@/lib/leaderboard/boardEntries';

interface LeaderboardEntry {
  player_id: string;
  display_name?: string;
  username?: string;
  avatar_image?: string;
  avatar_config?: CustomAvatarConfig | null;
  total_score?: number;
  games_played?: number;
  chosen_title?: string | null;
  player_level?: number | null;
  title?: string | null;
}

const summarySeed = (entry: LeaderboardEntry): PlayerSummarySeed => ({
  id: entry.player_id,
  name: entry.display_name || entry.username || '',
  avatarImage: entry.avatar_image,
  customAvatar: entry.avatar_config,
  title: entry.title,
});

export default function LeaderboardPageClient(): React.JSX.Element {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading, isSupabaseEnabled } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'players' | 'creators' | 'records'>('players');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'records') setActiveTab('records');
  }, []);
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [seasonScope, setSeasonScope] = useState<SeasonTabKey>(
    isOnCrazyGamesPlatform ? 'allTime' : 'season',
  );

  // 'season' = current (date-windowed), 'allTime' = id=0 (no filter), 'pastSeasons' = handled separately
  const querySeasonId = seasonScope === 'allTime' ? 0 : undefined;

  // Use real-time hooks for live leaderboard updates
  const {
    data: realtimeLeaderboard,
    loading,
    error,
    refetch,
  } = useLeaderboard<LeaderboardEntry>({
    limit: 100,
    enabled: isSupabaseEnabled && seasonScope !== 'pastSeasons',
    seasonId: querySeasonId,
  });

  // Static fallback for builds/deploys without the public Supabase env vars:
  // the server-side /api/leaderboard route (Redis-cached, coalesced) serves
  // the same top-100 shape without a realtime subscription. Without this the
  // page dead-ended on a "Coming soon" stub — the nav links here as "Ranks"
  // from every page.
  const [staticEntries, setStaticEntries] = useState<LeaderboardEntry[] | null>(null);
  const [staticError, setStaticError] = useState<string | null>(null);

  const fetchStaticLeaderboard = useCallback(async () => {
    setStaticError(null);
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: { data?: LeaderboardEntry[] } = await res.json();
      setStaticEntries(json.data ?? []);
    } catch (err) {
      setStaticError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (isSupabaseEnabled) return;
    void fetchStaticLeaderboard();
  }, [isSupabaseEnabled, fetchStaticLeaderboard]);

  const leaderboard = useMemo(
    () => toBoardEntries(isSupabaseEnabled ? realtimeLeaderboard : (staticEntries ?? [])),
    [isSupabaseEnabled, realtimeLeaderboard, staticEntries],
  );
  const listLoading = isSupabaseEnabled ? loading : staticEntries === null && staticError === null;
  const listError = isSupabaseEnabled ? error : staticError;

  const { rank: userRank, loading: rankLoading } = useUserRank<{ total_score?: number; rank_position?: number }>(user?.id, querySeasonId);

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

  useEffect(() => {
    // Fire once on mount with the initial scope/tab snapshot — intentionally empty deps
    // (re-firing on every tab/scope change would inflate the "viewed" count).
    trackGrowthEvent('leaderboard_viewed', { seasonScope, activeTab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-compute tiers to avoid calling getGlobalLeaderboardTier per-row on every render
  const leaderboardTiers = useMemo(
    () => new Map(leaderboard.map(entry => [entry.player_id, getGlobalLeaderboardTier(entry.total_score ?? 0)])),
    [leaderboard]
  );

  const handleRefresh = async () => {
    if (isSupabaseEnabled) {
      refetch();
    } else {
      await fetchStaticLeaderboard();
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success(t('common.refreshed'), {
      duration: 2000,
    });
  };

  const tabClass = (active: boolean, activeBg: string) => cn(
    'inline-flex min-h-[40px] items-center gap-1.5 rounded-neo border-neo border-neo-black px-3 font-neo-display text-sm font-bold transition-transform active:translate-y-px',
    active ? `${activeBg} text-neo-black shadow-hard-sm` : 'bg-neo-navy-light text-neo-cream/70 hover:text-neo-white',
  );

  return (
    <FriendStatusProvider>
    <PageLayout onRefresh={handleRefresh} padding="md" maxWidth="4xl">
      <div className="py-4">
        <header className="mb-5 flex flex-wrap items-center gap-3">
          {/* CrazyGames hides the app header and bottom nav, so this is the only way out there. */}
          {isOnCrazyGamesPlatform && (
            <Button
              data-testid="leaderboard-home"
              onClick={() => router.push(`/${language}`)}
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label={t('common.backToMenu')}
              haptic
            >
              <ArrowLeft className="rtl:rotate-180" />
            </Button>
          )}
          <h1 className="me-auto font-neo-display text-2xl font-black text-neo-white sm:text-3xl">
            {t('leaderboard.title')}
          </h1>
          {/* The creators tab queries Supabase directly; with the static
              fallback there is only the players ranking. */}
          {isSupabaseEnabled && (
            <div role="tablist" className="flex gap-1.5">
              <button type="button" role="tab" aria-selected={activeTab === 'players'} onClick={() => setActiveTab('players')} className={tabClass(activeTab === 'players', 'bg-neo-yellow')}>
                <Trophy className="h-4 w-4" aria-hidden="true" />
                {t('leaderboard.players')}
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'creators'} onClick={() => setActiveTab('creators')} className={tabClass(activeTab === 'creators', 'bg-neo-pink')}>
                <PencilRuler className="h-4 w-4" aria-hidden="true" />
                {t('ugc.creator.stats')}
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'records'} onClick={() => setActiveTab('records')} className={tabClass(activeTab === 'records', 'bg-neo-cyan')}>
                <Crown className="h-4 w-4" aria-hidden="true" />
                {t('worldRecords.tab')}
              </button>
            </div>
          )}
        </header>

        {activeTab === 'creators' ? (
          <CreatorLeaderboard />
        ) : activeTab === 'records' ? (
          <HallOfFame viewerId={user?.id} />
        ) : (
        <>
        {!isOnCrazyGamesPlatform && isSupabaseEnabled && (
          <div className="mb-5">
            <SeasonLeaderboardTabs active={seasonScope} onChange={setSeasonScope} />
          </div>
        )}

        {seasonScope === 'pastSeasons' && !isOnCrazyGamesPlatform ? (
          <PastSeasonsLeaderboard />
        ) : (
        <>
        <YouCard
          userId={user?.id}
          avatarConfig={profile?.avatar_config}
          rank={user ? userRank?.rank_position : undefined}
          score={user ? userRank?.total_score : undefined}
          leaderboard={leaderboard}
          onPlay={() => router.push(`/${language}/quick-play`)}
          pending={authLoading || (!!user && rankLoading)}
        >
          {tierPanelEnabled && tierPosition && user?.id && (
            <div className="mt-3">
              <TierPositionPanel position={tierPosition} userId={user.id} />
            </div>
          )}
        </YouCard>

        <PageStateHandler
          isLoading={listLoading}
          error={listError?.toString()}
          onRetry={isSupabaseEnabled ? refetch : fetchStaticLeaderboard}
          isEmpty={!listLoading && !listError && leaderboard.length === 0}
          loadingComponent={
            <div className="space-y-2">
              {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => (
                <SkeletonCard key={`lb-skel-${id}`} hasImage={false} lines={1} className="py-3 bg-neo-navy" />
              ))}
            </div>
          }
          emptyComponent={
            <EnhancedEmptyState
              title={t('leaderboard.noRankYet')}
              description={t('leaderboard.beFirstToPlay')}
              icon="sparkles"
              action={{
                label: t('common.playNow'),
                onClick: () => router.push(`/${language}/quick-play`),
                variant: 'primary',
              }}
            />
          }
          errorComponent={
            <ErrorState
              title={t('common.error')}
              description={listError?.toString() || t('common.tryAgainLater')}
              onRetry={isSupabaseEnabled ? refetch : fetchStaticLeaderboard}
            />
          }
        >
          {leaderboard.length > 0 && (
            <div className="mb-6 px-2 overflow-x-auto">
              <LeaderboardPodium
                entries={leaderboard.slice(0, 3)}
                language={language}
                currentUserId={user?.id}
              />
            </div>
          )}

          {leaderboard.length > 3 && (
            <ol
              data-testid="leaderboard-table"
              start={4}
              className="divide-y-2 divide-neo-black/40 overflow-hidden rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light shadow-hard"
            >
              {leaderboard.slice(3).map((entry: LeaderboardEntry, index: number) => {
                const rank = index + 4;
                const isCurrentUser = user?.id === entry.player_id;
                return (
                  <li
                    key={entry.player_id}
                    data-testid="leaderboard-row"
                    aria-current={isCurrentUser ? 'true' : undefined}
                    className={cn(
                      'grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-2 px-3 py-2.5 sm:gap-3',
                      isCurrentUser ? 'bg-neo-cyan/15 shadow-[inset_4px_0_0_var(--neo-cyan)]' : 'hover:bg-neo-navy-elevated/40',
                    )}
                  >
                    <span className="text-center font-neo-display text-base font-bold tabular-nums text-neo-cream/50">
                      {rank}
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      {isCurrentUser ? (
                        <>
                          <Avatar customAvatar={entry.avatar_config} userId={entry.player_id} size="sm" />
                          <Link
                            href={`/${language}/player/${encodeURIComponent(entry.player_id)}`}
                            className="truncate text-sm font-semibold hover:underline text-neo-cyan"
                          >
                            {entry.display_name || entry.username}
                          </Link>
                        </>
                      ) : (
                        <>
                          <PlayerSummaryTrigger player={summarySeed(entry)} surface="global_leaderboard" labelled>
                            <span className="shrink-0 rounded-full">
                              <Avatar customAvatar={entry.avatar_config} userId={entry.player_id} size="sm" />
                            </span>
                          </PlayerSummaryTrigger>
                          <PlayerSummaryTrigger player={summarySeed(entry)} surface="global_leaderboard">
                            <span dir="auto" className="min-w-0 truncate text-sm font-semibold hover:underline text-neo-white">
                              {entry.display_name || entry.username}
                            </span>
                          </PlayerSummaryTrigger>
                        </>
                      )}
                      <RecordHolderCrown userId={entry.player_id} />
                      <TitleBadge title={entry.title} className="min-w-0 max-w-[40%] shrink" />
                      <TierBadge
                        tier={leaderboardTiers.get(entry.player_id) ?? getGlobalLeaderboardTier(entry.total_score ?? 0)}
                        size="xs"
                        animated={isCurrentUser}
                      />
                    </div>
                    <span className="text-end font-neo-display text-sm font-bold tabular-nums text-neo-white">
                      {safeToLocaleString(entry.total_score ?? 0, language)}
                    </span>
                    <span className="flex w-9 justify-end">
                      <FriendQuickAction
                        userId={entry.player_id}
                        name={entry.display_name || entry.username || ''}
                        surface="global_leaderboard"
                      />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </PageStateHandler>
        </>
        )}
        </>
        )}

        <InlineBannerAd webZone="content-page" className="my-8" />
      </div>
    </PageLayout>
    </FriendStatusProvider>
  );
}
