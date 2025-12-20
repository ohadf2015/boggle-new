'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy } from 'react-icons/fa';
import Avatar from '../../../components/Avatar';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: AvatarType;
  isHost?: boolean;
  isBot?: boolean;
}

interface LiveLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  username: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
  /** Optional: compact mode for mobile drawer */
  compact?: boolean;
}

/**
 * LiveLeaderboard - Displays real-time player rankings during game
 * Used in desktop sidebar and mobile drawer
 */
export const LiveLeaderboard = memo<LiveLeaderboardProps>(({
  leaderboard,
  username,
  t,
  dir,
  compact = false,
}) => {
  // Memoize rank style function
  const getRankStyle = useCallback((index: number): string => {
    if (index === 0) return 'bg-neo-yellow text-neo-black border-neo-black';
    if (index === 1) return 'bg-slate-300 text-neo-black border-neo-black';
    if (index === 2) return 'bg-neo-orange text-neo-black border-neo-black';
    return 'bg-neo-cream text-neo-black border-neo-black';
  }, []);

  // Memoize leaderboard items
  const memoizedLeaderboard = useMemo(() => leaderboard.map((player, index) => ({
    ...player,
    rankStyle: getRankStyle(index),
    isMe: player.username === username,
    rankDisplay: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`
  })), [leaderboard, username, getRankStyle]);

  return (
    <div
      className="bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden"
      style={{ transform: compact ? 'none' : 'rotate(-1deg)' }}
    >
      <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple">
        <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
          <FaTrophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px rgb(var(--neo-black)))' }} />
          {t('playerView.leaderboard')}
        </h3>
      </div>
      <div className="overflow-y-auto flex-1 p-3">
        <div className="space-y-2">
          {memoizedLeaderboard.map((player, index) => (
            <motion.div
              key={player.username}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
                hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
                ${player.rankStyle} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
                {player.rankDisplay}
              </div>
              <Avatar
                profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
                avatarEmoji={player.avatar?.emoji}
                avatarColor={player.avatar?.color}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className={`font-black truncate text-base flex items-center gap-2 text-neo-black ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <span>{player.username}</span>
                  {player.isMe && (
                    <span className="text-xs bg-neo-black text-neo-cream px-2 py-0.5 rounded-neo font-bold">
                      ({t('playerView.me')})
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-neo-black">{player.score} pts</div>
              </div>
            </motion.div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center text-neo-black/60 py-6 text-sm font-bold">
              {t('playerView.noPlayersYet') || 'No players yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

LiveLeaderboard.displayName = 'LiveLeaderboard';

export default LiveLeaderboard;
