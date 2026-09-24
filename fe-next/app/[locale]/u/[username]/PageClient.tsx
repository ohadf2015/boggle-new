'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import AutoHideHeader from '@/components/AutoHideHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSeasonBadges } from '@/hooks/useSeasonBadges';
import { SeasonTrophyCase } from '@/components/seasons/SeasonTrophyCase';
import { SeasonRankCard } from '@/components/seasons/SeasonRankCard';
import { ProfileAchievementsPublic } from '@/components/profile/ProfileAchievementsPublic';
import { ShowcaseStage } from '@/components/profile/showcase/ShowcaseStage';
import { useShareProfile } from '@/components/profile/showcase/useShareProfile';
import { useProfileViewTracking } from '@/components/profile/showcase/useProfileViewTracking';
import { friendlyDisplayName, getHeadlineStats } from '@/components/profile/showcase/profileShowcaseModel';
import { getCollectionProgress } from '@/lib/avatar/unlocks';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { getXpProgress } from '@/backend/modules/xpManager';
import { trpc } from '@/lib/trpc';

/**
 * Public profile — same showcase stage as the owner sees (no coins, email or
 * settings), plus season standing, earned badges and trophies. Phone: stage,
 * then the column; desktop: stage pinned left, column right.
 */
export default function PublicProfilePageClient({ username }: { username: string }) {
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const profileQuery = trpc.playerProfile.get.useQuery(
    { id: username },
    { staleTime: 60_000, retry: false },
  );
  const profile = profileQuery.data;

  const { badges, isLoading: isLoadingBadges } = useSeasonBadges(profile?.id ?? null);

  const isOwn = !!user?.id && user.id === profile?.id;
  useProfileViewTracking({ profileKey: profile?.id, isOwn, ready: !authLoading });

  const { name, isPlaceholder } = friendlyDisplayName(profile?.displayName, profile?.username);
  const share = useShareProfile({ username: profile?.username, name, isOwn });

  const view = useMemo(() => {
    if (!profile) return null;
    const xp = getXpProgress(profile.totalXp || 0);
    // Older cached payloads (5-min cache) may predate totalWins / ownedAvatarParts.
    const wins = profile.totalWins ?? Math.round(((profile.winRate || 0) * (profile.totalGames || 0)) / 100);
    return {
      xp,
      collection: getCollectionProgress(profile.ownedAvatarParts ?? [], profile.currentLevel),
      stats: getHeadlineStats({
        longestWord: profile.longestWord,
        wins,
        games: profile.totalGames,
        winRate: profile.winRate,
      }),
    };
  }, [profile]);

  if (profileQuery.isLoading) {
    return (
      <div className="flex-1 bg-neo-navy min-h-screen">
        <div className="w-full max-w-6xl mx-auto px-5 pt-14 md:px-6 md:grid md:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] md:gap-8">
          <div className="h-[292px] md:h-[340px] rounded-neo-xl bg-neo-navy-elevated animate-pulse" />
          <div className="hidden md:block h-64 rounded-neo-lg bg-neo-navy-elevated animate-pulse" />
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profile || !view) {
    return (
      <div className="flex-1 bg-neo-navy min-h-screen flex flex-col items-center justify-center px-6">
        <UserIcon className="text-neo-white w-16 h-16 mb-4" />
        <h1 className="font-neo-display text-xl text-neo-white mb-2">
          {t('profile.notFound')}
        </h1>
        <Link
          href={`/${language}`}
          className="text-neo-cyan font-neo-body underline"
        >
          {t('profile.backToGame')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen relative bg-neo-navy">
      <AutoHideHeader />

      <div className="w-full max-w-6xl mx-auto px-5 pt-3 pb-24 md:px-6 md:py-6 md:grid md:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] md:gap-8">
        <div className="md:self-start flex flex-col gap-3">
          <Link
            href={`/${language}`}
            className="inline-flex items-center gap-2 text-neo-cyan font-neo-body text-sm hover:underline w-fit"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t('profile.backToGame')}
          </Link>
          <ShowcaseStage
            config={profile.customAvatar}
            name={name}
            isPlaceholderName={isPlaceholder}
            handle={isPlaceholder ? null : profile.username}
            countryCode={profile.countryCode}
            level={profile.currentLevel}
            levelPercent={view.xp.progressPercent}
            isMaxLevel={view.xp.isMaxLevel}
            rankTier={scoreTier(profile.totalScore)}
            collection={view.collection}
            stats={view.stats}
            isOwn={false}
            onShare={share}
          />
        </div>

        <div className="min-w-0 mt-6 md:mt-0 flex flex-col gap-4">
          {/* Current-season standing */}
          <SeasonRankCard playerId={profile.id} />

          {/* Earned achievement badges */}
          <ProfileAchievementsPublic counts={profile.achievementCounts} />

          {/* Season trophies */}
          <SeasonTrophyCase
            badges={badges}
            isLoading={isLoadingBadges}
            delay={0.1}
            emptyVariant="full"
          />
        </div>
      </div>
    </div>
  );
}
