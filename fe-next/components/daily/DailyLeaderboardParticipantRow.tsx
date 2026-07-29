'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { getRankDisplay, getRankRowClasses, getRankBadgeClasses } from '@/utils/rankingStyles';
import { formatDistanceToNow, getCountryFlag } from '@/shared/utils';
import Avatar from '@/components/Avatar';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import type { DailyParticipant } from './DailyLeaderboard';

/**
 * Game-type-aware participant row for DailyLeaderboard.
 * Handles both 'puzzle' (score/words) and 'wordHunt' (solved/attempts) display.
 */
const ParticipantRow = memo<{
  participant: DailyParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  gameType: 'puzzle' | 'wordHunt' | 'wordWheel';
  t: (key: string) => string;
}>(({ participant, index, isCurrentUser, compact, gameType, t }) => {
  const rank = participant.rank_position;
  const isTopThree = rank <= 3;
  const countryFlag = getCountryFlag(participant.country_code);
  const timeAgo = formatDistanceToNow(participant.completed_at, t);

  return (
    <m.div
      role="listitem"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`
        flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 transition-all duration-200
        ${getRankRowClasses(rank, isCurrentUser)}
        ${compact ? 'py-2' : ''}
        ${isCurrentUser ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Rank Badge */}
      <div
        className={`
          w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-sm sm:text-base
          ${getRankBadgeClasses(rank)}
          border-2 shadow-xs shrink-0
        `}
      >
        {getRankDisplay(rank)}
      </div>

      {/* Avatar with Country Flag */}
      <div className="relative shrink-0">
        <div className={`
          w-11 h-11 sm:w-14 sm:h-14 border-3 shadow-hard-sm rounded-full overflow-hidden
          ${isCurrentUser ? 'border-neo-cyan' : isTopThree ? 'border-neo-orange' : 'border-neo-black/80'}
        `}>
          <Avatar
            avatarImage={participant.avatar_image ?? undefined}
            customAvatar={participant.custom_avatar ?? undefined}
            size="lg"
            className="w-full h-full"
          />
        </div>
        {countryFlag && (
          <div className="absolute -bottom-1 -inset-e-1 text-sm sm:text-base drop-shadow-xs" title={participant.country_code || undefined}>
            {countryFlag}
          </div>
        )}
      </div>

      {/* Name & Score */}
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
            <span className={`font-bold truncate text-sm sm:text-base cursor-pointer ${isCurrentUser ? 'text-neo-cyan dark:text-neo-cyan' : 'text-slate-800 dark:text-white hover:text-neo-cyan dark:hover:text-neo-cyan'}`}>
              {participant.display_name || 'Player'}
            </span>
          </PlayerProfileTooltip>
          {isCurrentUser && (
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-neo-black px-2 py-0.5 rounded-full font-black shrink-0 shadow-xs animate-pulse">
              YOU
            </span>
          )}
          {rank === 1 && (
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-tier-gold shrink-0 animate-pulse" />
          )}
        </div>
        <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
          {gameType === 'wordHunt' ? (
            <>
              <span className={`font-bold ${participant.solved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {participant.solved ? `✓ ${t('wordHunt.leaderboard.solved')}` : `✗ ${t('wordHunt.leaderboard.failed')}`}
              </span>
              {participant.solved && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{participant.attempts_used} {t('wordHunt.leaderboard.attempts')}</span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{participant.score} {t('wordHunt.leaderboard.pts')}</span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">{participant.word_count} {t('wordHunt.leaderboard.words')}</span>
            </>
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

ParticipantRow.displayName = 'ParticipantRow';

export default ParticipantRow;
