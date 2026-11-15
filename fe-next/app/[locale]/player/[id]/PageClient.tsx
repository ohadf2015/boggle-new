'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { m } from 'framer-motion';
import {
  Trophy, Hash, Target, TrendingUp, Calendar, ArrowLeft, Star, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LevelBadge from '@/components/LevelBadge';
import Avatar from '@/components/Avatar';
import { XpByModeBreakdown } from '@/components/profile/XpByModeBreakdown';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeBack } from '@/hooks/useSafeBack';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { useAuth } from '@/contexts/AuthContext';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { Loader } from '@/components/ui/Loader';
import { isHallOfFameAchievement } from '@/utils/achievementTiers';
import { getAchievementIcon } from '@/constants/achievementIcons';
import type { PublicProfile } from '@/shared/types/publicProfile';
import { RankBadge } from '@/components/results/MmrChangeBadge';
import { ProfileSocialActions } from '@/components/players/ProfileSocialActions';
import { ProfileShareButton } from '@/components/players/ProfileShareButton';

/**
 * Percentile tier styling
 */
function getPercentileTier(percentile: number) {
  if (percentile <= 1) return { bg: 'bg-amber-400', text: 'text-neo-black', label: 'Elite' };
  if (percentile <= 5) return { bg: 'bg-purple-500', text: 'text-white', label: 'Master' };
  if (percentile <= 10) return { bg: 'bg-neo-cyan', text: 'text-neo-black', label: 'Expert' };
  if (percentile <= 25) return { bg: 'bg-neo-lime', text: 'text-neo-black', label: 'Skilled' };
  return { bg: 'bg-slate-600', text: 'text-white', label: 'Player' };
}

/**
 * Full public player profile page
 * Route: /[locale]/player/[id]
 */
export default function PlayerProfilePageClient() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const goBack = useSafeBack(`/${language}`);
  const { profile: myProfile } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = myProfile?.id === id;

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/player-profile/${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('PLAYER_NOT_FOUND');
        } else {
          setError('FETCH_ERROR');
        }
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch {
      setError('FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-xl font-black text-white">
          {error === 'PLAYER_NOT_FOUND' ? t('playerProfile.notFound') : t('playerProfile.error')}
        </h2>
        <button type="button" onClick={() => window.location.href = '/'} className="text-neo-cyan hover:underline font-bold">
          {t('common.backHome')}
        </button>
      </div>
    );
  }

  const tier = getPercentileTier(profile.percentile);
  const achievementTotal = Object.values(profile.achievementCounts).reduce((a, b) => a + b, 0);

  // Sort achievements: Hall of Fame first, then by count descending
  const sortedAchievements = Object.entries(profile.achievementCounts)
    .sort(([keyA, countA], [keyB, countB]) => {
      const aHof = isHallOfFameAchievement(keyA);
      const bHof = isHallOfFameAchievement(keyB);
      if (aHof !== bHof) return aHof ? -1 : 1;
      return countB - countA;
    });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
        {t('common.back')}
      </button>

      {/* Profile Header Card */}
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-neo-lg border-4 border-neo-black shadow-hard-lg bg-neo-navy p-5 sm:p-6 mb-4"
      >
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Avatar */}
          <Avatar
            customAvatar={profile.customAvatar ?? undefined}
            userId={id}
            size="2xl"
            className="shrink-0 border-3 border-neo-black shadow-hard"
          />

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white truncate">
                {profile.displayName}
              </h1>
              {profile.countryCode && (
                <span className="text-xl">{getCountryFlag(profile.countryCode)}</span>
              )}
            </div>

            {/* Level + Percentile */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-neo-cream/60">
                <LevelBadge level={profile.currentLevel} size="sm" animate={false} />
                {t('profile.level')}
              </span>
              {profile.percentile <= 50 && (
                <span className={cn(
                  'text-xs font-black px-2 py-0.5 rounded border',
                  tier.bg, tier.text
                )}>
                  {t('profile.topPercent', { percent: profile.percentile })}
                </span>
              )}
            </div>

            {/* Ranked MMR badge */}
            {(profile.rankedMmr ?? 0) > 0 && (
              <div className="mt-2">
                <RankBadge mmr={profile.rankedMmr!} />
              </div>
            )}

            {/* Member since */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {t('profile.memberSince')} {profile.memberSince}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {!isOwnProfile && id && (
            <ProfileSocialActions userId={id} name={profile.displayName} surface="player_profile" className="flex-1 min-w-48" />
          )}
          {id && (
            <ProfileShareButton
              userId={id}
              isOwn={isOwnProfile}
              level={profile.currentLevel}
              achievements={achievementTotal}
              surface="player_profile"
              className={isOwnProfile ? 'flex-1' : undefined}
            />
          )}
        </div>
      </m.div>

      {/* Stats Grid */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4"
      >
        <StatCard
          icon={<Trophy className="w-4 h-4 text-neo-yellow" />}
          value={`${profile.winRate}%`}
          label={t('profile.winRate')}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-neo-cyan" />}
          value={safeToLocaleString(profile.totalGames, language)}
          label={t('profile.gamesPlayed')}
        />
        <StatCard
          icon={<Star className="w-4 h-4 text-neo-orange" />}
          value={safeToLocaleString(profile.totalScore, language)}
          label={t('profile.totalScore')}
        />
        <StatCard
          icon={<Hash className="w-4 h-4 text-neo-lime" />}
          value={safeToLocaleString(profile.totalWords, language)}
          label={t('profile.totalWords')}
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-neo-pink" />}
          value={profile.longestWord || '-'}
          label={t('profile.longestWord')}
          small={!!profile.longestWord && profile.longestWord.length > 8}
        />
        <StatCard
          icon={<Award className="w-4 h-4 text-purple-400" />}
          value={achievementTotal.toString()}
          label={t('profile.achievements')}
        />
      </m.div>

      {/* XP by Mode — where this player's XP came from */}
      <XpByModeBreakdown xpByMode={profile.xpByMode} delay={0.15} />

      {/* Achievement Counts */}
      {sortedAchievements.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-neo-lg border-3 border-neo-black shadow-hard bg-neo-navy p-4 mb-4"
        >
          <h3 className="text-sm font-black uppercase text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-neo-lime" />
            {t('profile.achievements')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {sortedAchievements.map(([key, count]) => {
              const isRare = isHallOfFameAchievement(key);
              const icon = getAchievementIcon(key);
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-neo border-2 border-neo-black',
                    isRare
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-white/5 text-slate-400'
                  )}
                >
                  <span className="text-xs">{icon}</span>
                  <span className={cn(
                    'text-xs',
                    isRare ? 'font-black' : 'font-medium'
                  )}>
                    {t(`achievements.${key}.name`, key.replace(/_/g, ' '))}
                  </span>
                  <span className={cn(
                    'text-[10px] font-black px-1 rounded',
                    isRare
                      ? 'bg-amber-400 text-neo-black'
                      : 'bg-white/10 text-slate-300'
                  )}>
                    x{count}
                  </span>
                </div>
              );
            })}
          </div>
        </m.div>
      )}
    </div>
  );
}

/**
 * Individual stat card for the grid
 */
function StatCard({
  icon,
  value,
  label,
  small = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-neo border-3 border-neo-black shadow-hard-sm bg-neo-navy p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className={cn(
        'font-black text-white truncate',
        small ? 'text-sm' : 'text-xl'
      )}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase text-slate-400">{label}</div>
    </div>
  );
}
