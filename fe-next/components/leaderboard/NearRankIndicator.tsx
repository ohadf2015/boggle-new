'use client';

import React, { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import { TrendingUp, Users, Target, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';

interface LeaderboardEntry {
  player_id: string;
  display_name?: string;
  username?: string;
  avatar_emoji?: string;
  avatar_color?: string;
  avatar_image?: string;
  avatar_config?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  total_score?: number;
  games_played?: number;
}

interface UserRank {
  rank_position?: number;
  total_score?: number;
  player_id?: string;
}

interface NearRankIndicatorProps {
  /** Full leaderboard data */
  leaderboard: LeaderboardEntry[];
  /** Current user's rank data */
  userRank: UserRank | null;
  /** Current user's ID */
  userId?: string;
  /** Total number of players (for percentile calculation) */
  totalPlayers?: number;
  /** Points range to show nearby players */
  nearbyRange?: number;
  /** Additional className */
  className?: string;
}

/**
 * NearRankIndicator - Shows progress context for leaderboard position
 *
 * Displays:
 * - Points needed to reach next rank
 * - Nearby players (within score range)
 * - Percentile position (Top X% of players)
 */
const NearRankIndicator: React.FC<NearRankIndicatorProps> = memo(({
  leaderboard,
  userRank,
  userId,
  totalPlayers,
  nearbyRange = 100,
  className,
}) => {
  const { t } = useLanguage();

  const analysis = useMemo(() => {
    if (!userRank?.rank_position || !userRank?.total_score) {
      return null;
    }

    const currentRank = userRank.rank_position;
    const currentScore = userRank.total_score;

    // Find player directly above (next rank to beat)
    const playerAbove = leaderboard.find((_, index) => {
      const entryRank = index + 1;
      return entryRank === currentRank - 1;
    });

    // Points needed to reach next rank
    const pointsToNextRank = playerAbove?.total_score
      ? playerAbove.total_score - currentScore + 1
      : null;

    // Find nearby players (within range above and below)
    const nearbyPlayers = leaderboard.filter((entry) => {
      if (!entry.total_score) return false;
      if (entry.player_id === userId) return false;
      const scoreDiff = Math.abs(entry.total_score - currentScore);
      return scoreDiff <= nearbyRange && scoreDiff > 0;
    }).slice(0, 5); // Limit to 5 nearby players

    // Calculate percentile
    const total = totalPlayers || leaderboard.length;
    const percentile = total > 0 ? Math.max(1, Math.round((currentRank / total) * 100)) : 0;

    // Determine percentile tier for styling (lower = better)
    let percentileTier: 'top1' | 'top5' | 'top10' | 'top25' | 'normal' = 'normal';
    if (percentile <= 1) percentileTier = 'top1';
    else if (percentile <= 5) percentileTier = 'top5';
    else if (percentile <= 10) percentileTier = 'top10';
    else if (percentile <= 25) percentileTier = 'top25';

    return {
      currentRank,
      currentScore,
      playerAbove,
      pointsToNextRank,
      nearbyPlayers,
      percentile,
      percentileTier,
      totalPlayers: total,
    };
  }, [leaderboard, userRank, userId, totalPlayers, nearbyRange]);

  if (!analysis) {
    return null;
  }

  const {
    currentRank,
    pointsToNextRank,
    playerAbove,
    nearbyPlayers,
    percentile,
    percentileTier,
  } = analysis;

  const percentileColors = {
    top1: 'from-amber-400 to-yellow-500 text-amber-900',
    top5: 'from-purple-400 to-indigo-500 text-white',
    top10: 'from-cyan-400 to-blue-500 text-white',
    top25: 'from-emerald-400 to-green-500 text-white',
    normal: 'from-slate-400 to-slate-500 text-white',
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-neo-lg border-3 border-neo-black shadow-hard overflow-hidden bg-neo-navy',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-linear-to-r from-neo-cyan/20 to-neo-purple/20 border-b-2 border-neo-black/20">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-neo-cyan" />
          <h3 className="font-black text-white uppercase tracking-wider text-sm">
            {t('leaderboard.yourProgress')}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Percentile Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">
              {t('leaderboard.percentile')}
            </span>
          </div>
          <div
            className={cn(
              'px-3 py-1 rounded-full font-black text-sm bg-linear-to-r',
              percentileColors[percentileTier]
            )}
          >
            {t('leaderboard.topPercent')?.replace('{percent}', String(percentile)) ||
              `Top ${percentile}%`}
          </div>
        </div>

        {/* Points to Next Rank */}
        {pointsToNextRank !== null && pointsToNextRank > 0 && currentRank > 1 && (
          <div className="bg-white/5 border-2 border-white/10 rounded-neo p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-neo-lime" />
                <span className="text-white text-sm font-medium">
                  {t('leaderboard.nextRank')}
                </span>
              </div>
              <span className="font-black text-neo-lime">
                #{currentRank - 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronUp className="w-4 h-4 text-neo-cyan" />
              <span className="text-white text-sm">
                <span className="font-black text-neo-cyan">
                  {pointsToNextRank.toLocaleString()}
                </span>{' '}
                {t('leaderboard.pointsToGo')}
              </span>
            </div>
            {playerAbove && (
              <div className="mt-2 flex items-center gap-2 text-xs text-white">
                <span>{t('leaderboard.beat')}:</span>
                <div className="w-7 h-7 rounded-full overflow-hidden border border-white/30 shrink-0">
                  <Avatar
                    avatarImage={playerAbove.avatar_image ?? undefined}
                    customAvatar={playerAbove.avatar_config ?? undefined}
                    userId={playerAbove.player_id}
                    size="md"
                  />
                </div>
                <span className="font-medium truncate">
                  {playerAbove.display_name || playerAbove.username}
                </span>
                <span className="text-white">
                  ({playerAbove.total_score?.toLocaleString()})
                </span>
              </div>
            )}
          </div>
        )}

        {/* At Top Rank Message */}
        {currentRank === 1 && (
          <div className="bg-neo-lime/20 border-2 border-neo-lime/50 rounded-neo p-3 text-center">
            <div className="text-2xl mb-1">👑</div>
            <div className="font-black text-neo-lime text-sm uppercase">
              {t('leaderboard.youAreFirst')}
            </div>
            <div className="text-white text-xs mt-1">
              {t('leaderboard.keepItUp')}
            </div>
          </div>
        )}

        {/* Nearby Players */}
        {nearbyPlayers.length > 0 && (
          <div className="bg-white/5 border-2 border-white/10 rounded-neo p-3">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-neo-purple" />
              <span className="text-white text-sm font-medium">
                {t('leaderboard.nearbyPlayers')}
              </span>
              <span className="text-xs text-white ms-auto">
                ±{nearbyRange} {t('leaderboard.points')}
              </span>
            </div>
            <div className="space-y-2">
              {nearbyPlayers.map((player, index) => {
                const playerRank = leaderboard.findIndex(
                  (e) => e.player_id === player.player_id
                ) + 1;
                const scoreDiff = (player.total_score || 0) - (analysis.currentScore || 0);
                const isAbove = scoreDiff > 0;

                return (
                  <m.div
                    key={player.player_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg transition-colors',
                      isAbove
                        ? 'bg-rose-500/10 border border-rose-500/30'
                        : 'bg-emerald-500/10 border border-emerald-500/30'
                    )}
                  >
                    <span className="text-xs font-bold text-white w-8">
                      #{playerRank}
                    </span>
                    <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border-2 border-white/20">
                      <Avatar
                        avatarImage={player.avatar_image ?? undefined}
                        customAvatar={player.avatar_config ?? undefined}
                        userId={player.player_id}
                        size="md"
                      />
                    </div>
                    <span className="text-white text-sm font-medium truncate flex-1">
                      {player.display_name || player.username}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-bold',
                        isAbove ? 'text-rose-400' : 'text-emerald-400'
                      )}
                    >
                      {isAbove ? '+' : ''}
                      {scoreDiff.toLocaleString()}
                    </span>
                  </m.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </m.div>
  );
});

NearRankIndicator.displayName = 'NearRankIndicator';

export default NearRankIndicator;
