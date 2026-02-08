'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Type } from 'lucide-react';
import Avatar from '@/components/Avatar';
import PresenceIndicator from '@/components/PresenceIndicator';
import { getRankStyle, getRankIconString } from '@/utils/rankingStyles';
import type { ExtendedLeaderboardPlayer as LeaderboardPlayer } from '@/shared/types/view';
import type { TranslationFn } from '../types';

interface GameLeaderboardProps {
  leaderboard: LeaderboardPlayer[];
  username: string;
  isHost: boolean;
  t: TranslationFn;
  dir: 'rtl' | 'ltr';
}

interface MemoizedLeaderboardPlayer extends LeaderboardPlayer {
  rankStyle: string;
  isMe: boolean;
  rankDisplay: string;
}

interface LeaderboardRowProps {
  player: MemoizedLeaderboardPlayer;
  isHost: boolean;
  dir: 'rtl' | 'ltr';
  t: TranslationFn;
}

/**
 * LeaderboardRow - Memoized individual row for performance
 *
 * PERFORMANCE: Removed `layout` prop and staggered delays that caused
 * expensive DOM measurements on every leaderboard update. Uses CSS
 * transitions instead of Framer Motion layout animations.
 */
const LeaderboardRow = memo<LeaderboardRowProps>(function LeaderboardRow({
  player,
  isHost,
  dir,
  t,
}) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all duration-200
        hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
        ${player.rankStyle} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
    >
      {/* Rank badge */}
      <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
        {player.rankDisplay}
      </div>

      {/* Avatar */}
      <Avatar
        profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
        avatarImage={player.avatar?.avatarImage}
        size="xl"
      />

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div
          className={`font-black truncate text-sm flex items-center gap-1 text-neo-black ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
        >
          {player.isHost && (
            <Crown
              className="w-4 h-4 text-neo-lime flex-shrink-0 drop-shadow-[1px_1px_0px_rgb(var(--neo-black))]"
            />
          )}
          <span className="truncate" title={player.username}>
            {player.username}
          </span>
          {player.isMe && (
            <span className="text-xs bg-neo-black text-neo-cream px-1.5 py-0.5 rounded-neo font-bold flex-shrink-0">
              {t('playerView.me') || 'YOU'}
            </span>
          )}
        </div>
        <div className="text-xs font-bold text-neo-black/70 flex items-center gap-1">
          <Type className="w-3 h-3 text-neo-cyan" />
          <span className="tabular-nums">{player.wordCount || 0}</span>
          <span>{t('hostView.words') || 'words'}</span>
        </div>
      </div>

      {/* Presence and Score */}
      <div className="flex items-center gap-2">
        {/* Presence indicator (only show for others when host) */}
        {isHost && !player.isMe && player.presenceStatus && (
          <PresenceIndicator
            status={player.presenceStatus}
            isWindowFocused={player.isWindowFocused}
            size="lg"
          />
        )}
        <div className="text-right bg-neo-black/5 rounded-neo px-2 py-1 min-w-[50px]">
          <div className="text-[10px] font-bold text-neo-black/60 uppercase tracking-wide">
            {t('common.score') || 'Score'}
          </div>
          <div className="text-lg font-black text-neo-black leading-none tabular-nums">{player.score}</div>
        </div>
      </div>
    </div>
  );
});

/**
 * GameLeaderboard - Desktop leaderboard sidebar
 */
export const GameLeaderboard = memo<GameLeaderboardProps>(function GameLeaderboard({
  leaderboard,
  username,
  isHost,
  t,
  dir,
}) {
  // Memoize leaderboard items with centralized ranking utilities
  const memoizedLeaderboard: MemoizedLeaderboardPlayer[] = useMemo(
    () =>
      leaderboard.map((player, index) => ({
        ...player,
        rankStyle: getRankStyle(index),
        isMe: player.username === username,
        rankDisplay: getRankIconString(index),
      })),
    [leaderboard, username]
  );

  return (
    <motion.div
      className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden max-h-[45vh] lg:max-h-none lg:flex-grow relative -rotate-1"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header */}
      <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-pink text-white">
        <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
          <Trophy className="w-5 h-5 text-neo-lime" />
          {t('playerView.leaderboard')}
        </h3>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
        <div className="space-y-2">
          {memoizedLeaderboard.map((player) => (
            <LeaderboardRow
              key={player.username}
              player={player}
              isHost={isHost}
              dir={dir}
              t={t}
            />
          ))}

          {leaderboard.length === 0 && (
            <p className="text-center text-neo-black/90 py-6 text-sm font-bold">
              {t('hostView.waitingForPlayers') || 'Waiting for players...'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
});
