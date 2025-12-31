'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import { getRankStyle } from '@/utils/rankingStyles';

export interface CompactPlayer {
  username: string;
  score: number;
  rank: number;
  isCurrentUser?: boolean;
  profilePictureUrl?: string | null;
  avatarEmoji?: string;
  avatarColor?: string;
  previousRank?: number;
}

interface CompactLeaderboardProps {
  players: CompactPlayer[];
  currentUsername: string;
  className?: string;
  t: (key: string) => string;
}

/**
 * CompactLeaderboard - Mobile-optimized always-visible leaderboard
 *
 * Shows:
 * - Top 3 players
 * - Current user's position (if not in top 3)
 * - Rank change indicators
 *
 * Eliminates need for tab switching on mobile
 */
export function CompactLeaderboard({
  players,
  currentUsername,
  className,
  t,
}: CompactLeaderboardProps) {
  const { topPlayers, currentUserData } = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.score - a.score);

    // Add ranks
    sorted.forEach((player, index) => {
      player.rank = index + 1;
    });

    const top3 = sorted.slice(0, 3);
    const currentUser = sorted.find(p => p.username === currentUsername);

    // Only show current user separately if they're not in top 3
    const showCurrentUser = currentUser && currentUser.rank > 3;

    return {
      topPlayers: top3,
      currentUserData: showCurrentUser ? currentUser : null,
    };
  }, [players, currentUsername]);

  const getRankChangeIcon = (player: CompactPlayer) => {
    if (!player.previousRank || player.previousRank === player.rank) {
      return <Minus className="w-3 h-3 text-gray-400" />;
    }
    if (player.rank < player.previousRank) {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    }
    return <TrendingDown className="w-3 h-3 text-red-500" />;
  };

  const PlayerRow = ({ player, compact = false }: { player: CompactPlayer; compact?: boolean }) => {
    const rankStyle = getRankStyle(player.rank);
    const isCurrentUser = player.username === currentUsername;

    return (
      <motion.div
        layout
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-neo border-2',
          isCurrentUser
            ? 'bg-neo-yellow/20 border-neo-yellow'
            : 'bg-neo-cream/50 border-neo-black/10',
          compact && 'py-1'
        )}
      >
        {/* Rank */}
        <div className="flex items-center gap-1 min-w-[40px]">
          <span className="font-black text-sm text-neo-black">
            {player.rank === 1 && '🥇'}
            {player.rank === 2 && '🥈'}
            {player.rank === 3 && '🥉'}
            {player.rank > 3 && `#${player.rank}`}
          </span>
          {!compact && getRankChangeIcon(player)}
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar
            profilePictureUrl={player.profilePictureUrl ?? undefined}
            avatarEmoji={player.avatarEmoji}
            avatarColor={player.avatarColor}
            size="sm"
          />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span className={cn(
            'text-xs font-bold truncate',
            isCurrentUser && 'text-neo-black'
          )}>
            {player.username}
          </span>
          {isCurrentUser && (
            <span className="text-xs bg-neo-yellow text-neo-black px-1 py-0.5 rounded font-bold">
              {t('leaderboard.you') || 'YOU'}
            </span>
          )}
        </div>

        {/* Score */}
        <div className={cn(
          'text-sm font-black tabular-nums',
          isCurrentUser ? 'text-neo-black' : 'text-neo-black/70'
        )}>
          {player.score}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn(
      'bg-neo-cream/95 border-3 border-neo-black rounded-neo shadow-hard p-2',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-neo-yellow-dark" />
          <span className="text-xs font-black uppercase text-neo-black/80">
            {t('leaderboard.title') || 'Leaderboard'}
          </span>
        </div>
        <span className="text-xs font-bold text-neo-black/50">
          {players.length} {t('leaderboard.players') || 'players'}
        </span>
      </div>

      {/* Top 3 Players */}
      <div className="space-y-1">
        {topPlayers.map((player) => (
          <PlayerRow key={player.username} player={player} />
        ))}
      </div>

      {/* Current User (if not in top 3) */}
      {currentUserData && (
        <>
          <div className="my-1.5 border-t border-dashed border-neo-black/20" />
          <PlayerRow player={currentUserData} compact />
        </>
      )}
    </div>
  );
}

export default CompactLeaderboard;
