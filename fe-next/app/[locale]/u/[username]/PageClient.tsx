'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import { m } from 'framer-motion';
import AutoHideHeader from '@/components/AutoHideHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSeasonBadges } from '@/hooks/useSeasonBadges';
import { SeasonTrophyCase } from '@/components/seasons/SeasonTrophyCase';
import { SeasonRankCard } from '@/components/seasons/SeasonRankCard';
import { ProfileAchievementsPublic } from '@/components/profile/ProfileAchievementsPublic';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export default function PublicProfilePageClient({ username }: { username: string }) {
  const { t, language } = useLanguage();

  const profileQuery = trpc.playerProfile.get.useQuery(
    { id: username },
    { staleTime: 60_000, retry: false },
  );
  const profile = profileQuery.data;

  const { badges, isLoading: isLoadingBadges } = useSeasonBadges(profile?.id ?? null);

  if (profileQuery.isLoading) {
    return (
      <div className="flex-1 bg-neo-navy min-h-screen flex items-center justify-center">
        <div className="animate-pulse h-20 w-20 rounded-full bg-neo-white/10" />
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="flex-1 bg-neo-navy min-h-screen flex flex-col items-center justify-center px-6">
        <UserIcon className="text-neo-white w-16 h-16 mb-4" />
        <h1 className="font-neo-display text-xl text-neo-white mb-2">
          {t('profile.notFound') || 'Player not found'}
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

  const displayName = profile.displayName || profile.username;

  return (
    <div className={cn('flex-1 flex flex-col min-h-screen relative bg-neo-navy')}>
      <AutoHideHeader />

      <div className="max-w-3xl mx-auto w-full px-4 lg:px-6 py-6 lg:py-8 flex flex-col gap-6">
        <Link
          href={`/${language}`}
          className="inline-flex items-center gap-2 text-neo-cyan font-neo-body text-sm hover:underline w-fit"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {t('profile.backToGame')}
        </Link>

        {/* Hero header */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-neo-xl p-6 bg-neo-navy-light border-2 border-black shadow-hard-lg flex items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full border-3 border-black bg-neo-pink/30 flex items-center justify-center">
            <UserIcon className="w-9 h-9 text-neo-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-neo-display text-2xl text-neo-white truncate">
              {displayName}
            </h1>
            <p className="text-sm text-neo-white font-neo-body">
              @{profile.username} · Lv {profile.currentLevel}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-neo-yellow/15 text-neo-yellow font-neo-display uppercase">
                {profile.totalGames} {t('profile.stats.games') || 'games'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neo-cyan/15 text-neo-cyan font-neo-display uppercase">
                {profile.winRate}% {t('profile.stats.winRate') || 'win rate'}
              </span>
            </div>
          </div>
        </m.div>

        {/* Current-season standing */}
        <SeasonRankCard playerId={profile.id} />

        {/* Season trophies — the marquee feature */}
        <SeasonTrophyCase
          badges={badges}
          isLoading={isLoadingBadges}
          delay={0.1}
          emptyVariant="full"
        />

        {/* Earned achievement badges */}
        <ProfileAchievementsPublic counts={profile.achievementCounts} />
      </div>
    </div>
  );
}
