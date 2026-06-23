'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Clock, Sparkles, Crown, Eye, Target, CircleDot } from 'lucide-react';
import { getRankDisplay } from '@/utils/rankingStyles';
import { formatDistanceToNow, getCountryFlag } from '@/shared/utils';
import Avatar from '@/components/Avatar';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import { TierBadge } from '@/components/ui/TierBadge';
import { getDailyLeaderboardTier } from '@/lib/ranked/leaderboardTiers';
import { getRankColors, getRankBadgeColors } from './leaderboardUtils';
import type { DailyParticipant, AllTimeParticipant } from './TabbedDailyLeaderboard';

// ==========================================
// Today's Participant Row
// ==========================================

export const TodayParticipantRow = memo<{
  participant: DailyParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: (key: string) => string;
  onViewWheelWords?: (participant: DailyParticipant) => void;
  onViewHuntWords?: (participant: DailyParticipant) => void;
  /** When 'word-wheel', the row exposes the view-words click for any participant
   *  with a non-zero wheel score (not just those who also played Word Hunt). */
  scope?: 'combined' | 'word-hunt' | 'word-wheel';
}>(({ participant, index, isCurrentUser, compact, t, onViewWheelWords, onViewHuntWords, scope = 'combined' }) => {
  const rank = participant.rank_position;
  const countryFlag = getCountryFlag(participant.country_code);

  // Format time since completion
  const timeAgo = formatDistanceToNow(participant.completed_at, t);

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
      className={`
        flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 transition-all duration-200
        ${getRankColors(rank, isCurrentUser)}
        ${compact ? 'py-2' : ''}
        ${isCurrentUser ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Rank Badge */}
      <div
        className={`
          w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm sm:text-base
          ${getRankBadgeColors(rank)}
          border-2 shadow-xs
        `}
      >
        {getRankDisplay(rank)}
      </div>

      {/* Avatar with Country Flag */}
      <div className="relative">
        <div className="w-11 h-11 sm:w-14 sm:h-14 border-3 border-neo-black/80 shadow-hard-sm rounded-full overflow-hidden">
          <Avatar

            avatarImage={participant.avatar_image ?? undefined}
            customAvatar={participant.custom_avatar ?? undefined}
            size="lg"
            className="w-full h-full"
          />
        </div>
        {/* Country Flag Badge */}
        {countryFlag && (
          <div className="absolute -bottom-1 -inset-e-1 text-sm sm:text-base drop-shadow-xs" title={participant.country_code || undefined}>
            {countryFlag}
          </div>
        )}
      </div>

      {/* Name & Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlayerProfileTooltip
            player={{
              id: participant.player_id ?? undefined,
              username: participant.display_name || 'Player',

              avatarImage: participant.avatar_image ?? undefined,
              customAvatar: participant.custom_avatar,
              countryCode: participant.country_code,
            }}
            isCurrentUser={isCurrentUser}
            side="bottom"
          >
            <span className={`font-bold truncate text-sm sm:text-base ${isCurrentUser ? 'text-neo-cyan dark:text-neo-cyan' : 'text-slate-800 dark:text-white cursor-pointer hover:underline'}`}>
              {participant.display_name || 'Player'}
            </span>
          </PlayerProfileTooltip>
          {isCurrentUser && (
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-neo-black px-2 py-0.5 rounded-full font-black shrink-0 shadow-xs animate-pulse">
              YOU
            </span>
          )}
          {participant.score != null && (
            <TierBadge
              tier={getDailyLeaderboardTier(participant.score)}
              size="xs"
              animated={rank === 1}
            />
          )}
          {rank === 1 && (
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-tier-gold shrink-0 animate-pulse" />
          )}
        </div>
        <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
          {participant.solved !== undefined && (
            <span className={`font-bold ${participant.solved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {participant.solved ? `✓ ${participant.attempts_used}/10` : `✗ X/10`}
            </span>
          )}
          {participant.score != null && participant.score > 0 && (
            <>
              {participant.solved !== undefined && (
                <span className="text-slate-400 dark:text-slate-500">•</span>
              )}
              {scope === 'word-wheel' && onViewWheelWords && participant.player_id && !isCurrentUser ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onViewWheelWords(participant); }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-neo border-2 border-neo-purple/60 bg-neo-purple/20 hover:bg-neo-purple/35 text-neo-purple dark:text-neo-purple-light font-bold transition-colors cursor-pointer shadow-hard-xs"
                  aria-label={t('wordWheel.viewWordsYouMissed') || t('wordWheel.viewSubmittedWords')}
                  title={t('wordWheel.viewWordsYouMissed') || t('wordWheel.viewSubmittedWords')}
                >
                  <span>{participant.score} {t('wordHunt.leaderboard.pts')}</span>
                  <span aria-hidden className="flex items-center gap-1 ps-1.5 border-s border-neo-purple/40">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[11px] uppercase tracking-wide">{t('wordHunt.leaderboard.seeWords')}</span>
                  </span>
                </button>
              ) : scope === 'word-hunt' && onViewHuntWords && participant.player_id && !isCurrentUser && (participant.words_discovered?.length ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onViewHuntWords(participant); }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-neo border-2 border-neo-cyan/60 bg-neo-cyan/20 hover:bg-neo-cyan/35 text-neo-cyan font-bold transition-colors cursor-pointer shadow-hard-xs"
                  aria-label={t('wordHunt.results.tapPlayerHint')}
                  title={t('wordHunt.results.tapPlayerHint')}
                >
                  <span>{participant.score} {t('wordHunt.leaderboard.pts')}</span>
                  <span aria-hidden className="flex items-center gap-1 ps-1.5 border-s border-neo-cyan/40">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[11px] uppercase tracking-wide">{t('wordHunt.leaderboard.seeWords')}</span>
                  </span>
                </button>
              ) : (
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {participant.score} {t('wordHunt.leaderboard.pts')}
                </span>
              )}
            </>
          )}
          {(participant.word_hunt_score ?? 0) > 0 && (participant.word_wheel_score ?? 0) > 0 && (
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium ms-1 inline-flex items-center gap-1">
              <Target aria-hidden className="w-3 h-3" />
              {participant.word_hunt_score}
              <span aria-hidden>·</span>
              {onViewWheelWords && participant.player_id ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onViewWheelWords(participant); }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-neo border-2 border-neo-lime/50 bg-neo-lime/15 hover:bg-neo-lime/30 text-neo-cyan dark:text-neo-lime font-bold transition-colors cursor-pointer"
                  aria-label={t('wordWheel.viewSubmittedWords')}
                  title={t('wordWheel.viewSubmittedWords')}
                >
                  <CircleDot aria-hidden className="w-3 h-3" />
                  {participant.word_wheel_score}
                  <Eye aria-hidden className="w-3 h-3 opacity-80" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <CircleDot aria-hidden className="w-3 h-3" />
                  {participant.word_wheel_score}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      {!compact && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-neo-navy-elevated/50 px-2 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeAgo}</span>
        </div>
      )}
    </m.div>
  );
});

TodayParticipantRow.displayName = 'TodayParticipantRow';

// ==========================================
// All-Time Participant Row
// ==========================================

export const AllTimeParticipantRow = memo<{
  participant: AllTimeParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: (key: string) => string;
}>(({ participant, index, isCurrentUser, compact, t }) => {
  const rank = participant.rank_position;
  const countryFlag = getCountryFlag(participant.country_code);

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
      className={`
        flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 transition-all duration-200
        ${getRankColors(rank, isCurrentUser)}
        ${compact ? 'py-2' : ''}
        ${isCurrentUser ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Rank Badge */}
      <div
        className={`
          w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm sm:text-base
          ${getRankBadgeColors(rank)}
          border-2 shadow-xs
        `}
      >
        {getRankDisplay(rank)}
      </div>

      {/* Avatar with Country Flag */}
      <div className="relative">
        <div className="w-11 h-11 sm:w-14 sm:h-14 border-3 border-neo-black/80 shadow-hard-sm rounded-full overflow-hidden">
          <Avatar

            avatarImage={participant.avatar_image ?? undefined}
            customAvatar={participant.custom_avatar ?? undefined}
            size="lg"
            className="w-full h-full"
          />
        </div>
        {/* Country Flag Badge */}
        {countryFlag && (
          <div className="absolute -bottom-1 -inset-e-1 text-sm sm:text-base drop-shadow-xs" title={participant.country_code || undefined}>
            {countryFlag}
          </div>
        )}
      </div>

      {/* Name & Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlayerProfileTooltip
            player={{
              id: participant.player_id ?? undefined,
              username: participant.display_name || 'Player',

              avatarImage: participant.avatar_image ?? undefined,
              customAvatar: participant.custom_avatar,
              countryCode: participant.country_code,
              totalGames: participant.total_games,
              winRate: participant.total_games > 0
                ? Math.round((participant.games_won / participant.total_games) * 100)
                : undefined,
            }}
            isCurrentUser={isCurrentUser}
            side="bottom"
          >
            <span className={`font-bold truncate text-sm sm:text-base ${isCurrentUser ? 'text-neo-cyan dark:text-neo-cyan' : 'text-slate-800 dark:text-white cursor-pointer hover:underline'}`}>
              {participant.display_name || 'Player'}
            </span>
          </PlayerProfileTooltip>
          {isCurrentUser && (
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-neo-black px-2 py-0.5 rounded-full font-black shrink-0 shadow-xs animate-pulse">
              YOU
            </span>
          )}
          {participant.best_efficiency != null && (
            <TierBadge
              tier={getDailyLeaderboardTier(participant.best_efficiency)}
              size="xs"
              animated={rank === 1}
            />
          )}
          {rank === 1 && (
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
          {/* Total efficiency score - primary stat */}
          <span className="font-black text-purple-600 dark:text-purple-400">
            {participant.total_efficiency_score} {t('wordHunt.leaderboard.pts')}
          </span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          {/* Challenges solved */}
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {participant.games_won}/{participant.total_games} {t('wordHunt.leaderboard.solved')}
          </span>
        </div>
      </div>

      {/* Best Score Badge */}
      {!compact && (
        <div className="hidden sm:flex flex-col items-end text-xs">
          <div className="text-slate-500 dark:text-slate-400">{t('wordHunt.leaderboard.best')}</div>
          <div className="font-bold text-purple-600 dark:text-purple-400">{participant.best_efficiency}</div>
        </div>
      )}
    </m.div>
  );
});

AllTimeParticipantRow.displayName = 'AllTimeParticipantRow';

// ==========================================
// Skeleton Loading Row
// ==========================================

export const SkeletonRow = memo<{ index: number }>(({ index }) => (
  <m.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-neo-navy-light/50"
  >
    {/* Rank skeleton */}
    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-200 dark:bg-neo-navy-elevated animate-pulse" />
    {/* Avatar skeleton */}
    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-200 dark:bg-neo-navy-elevated animate-pulse" />
    {/* Name & stats skeleton */}
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-slate-200 dark:bg-neo-navy-elevated rounded animate-pulse" />
      <div className="h-3 w-16 bg-slate-200 dark:bg-neo-navy-elevated rounded animate-pulse" />
    </div>
  </m.div>
));

SkeletonRow.displayName = 'SkeletonRow';
