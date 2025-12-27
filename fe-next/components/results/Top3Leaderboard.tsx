'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaMedal, FaRobot } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import type { Player } from './types';

/**
 * Generic participant type for leaderboard
 * Works with both multiplayer Player and single player participants
 */
export interface LeaderboardParticipant {
  name: string;
  score: number;
  isCurrentPlayer?: boolean;
  isBot?: boolean;
  avatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
    avatarImage?: string;
  };
}

interface Top3LeaderboardProps {
  /** Multiplayer players (preferred) */
  players?: Player[];
  /** Generic participants (for single player with bots) */
  participants?: LeaderboardParticipant[];
  currentUsername?: string;
  /** Custom header text */
  headerText?: string;
}

const rankConfig = {
  1: {
    bg: 'bg-neo-yellow',
    border: 'border-neo-yellow',
    text: 'text-neo-black',
    rankText: 'text-neo-yellow dark:text-neo-yellow',
    icon: FaCrown,
    iconColor: 'text-neo-yellow',
  },
  2: {
    bg: 'bg-slate-300',
    border: 'border-slate-300',
    text: 'text-slate-800',
    rankText: 'text-slate-500 dark:text-slate-300',
    icon: FaMedal,
    iconColor: 'text-slate-400',
  },
  3: {
    bg: 'bg-neo-orange',
    border: 'border-neo-orange',
    text: 'text-neo-black',
    rankText: 'text-neo-orange dark:text-neo-orange',
    icon: FaMedal,
    iconColor: 'text-neo-orange',
  },
};

/**
 * Compact Top 3 Leaderboard
 * Horizontal layout optimized for mobile
 * Shows rank, avatar, name, and score for top 3 players/participants
 *
 * Supports both:
 * - Multiplayer mode: Pass `players` prop
 * - Single player mode: Pass `participants` prop (with bots)
 */
const Top3Leaderboard: React.FC<Top3LeaderboardProps> = ({
  players,
  participants,
  currentUsername,
  headerText,
}) => {
  const { t } = useLanguage();

  // Normalize to unified participant format
  const normalizedParticipants: LeaderboardParticipant[] = React.useMemo(() => {
    if (participants) {
      return participants;
    }
    if (players) {
      return players.map(p => ({
        name: p.username,
        score: p.score,
        isCurrentPlayer: p.username === currentUsername,
        isBot: false,
        avatar: p.avatar,
      }));
    }
    return [];
  }, [players, participants, currentUsername]);

  // Get top 3 participants
  const top3 = normalizedParticipants.slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full max-w-lg mx-auto mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {headerText || t('results.topPlayers') || 'Top Players'}
        </span>
      </div>

      {/* Horizontal cards for top 3 */}
      <div className="flex gap-2">
        {top3.map((participant, index) => {
          const rank = index + 1;
          const config = rankConfig[rank as 1 | 2 | 3];
          const isCurrentPlayer = participant.isCurrentPlayer ?? participant.name === currentUsername;
          const Icon = config.icon;

          return (
            <motion.div
              key={participant.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={cn(
                'flex-1 relative rounded-neo border-2 border-neo-black shadow-hard-sm overflow-hidden',
                'bg-white dark:bg-slate-800',
                isCurrentPlayer && 'ring-2 ring-neo-cyan'
              )}
            >
              {/* Rank indicator bar */}
              <div className={cn('h-1.5', config.bg)} />

              <div className="p-2">
                {/* Rank + Icon */}
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Icon className={cn('text-sm', config.iconColor)} />
                  <span className={cn('text-xs font-black', config.rankText)}>
                    #{rank}
                  </span>
                </div>

                {/* Avatar or Bot icon */}
                <div className="flex justify-center mb-1">
                  {participant.isBot ? (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-neo-black flex items-center justify-center">
                      <FaRobot className="text-slate-500 dark:text-slate-400 text-lg" />
                    </div>
                  ) : (
                    <Avatar
                      profilePictureUrl={participant.avatar?.profilePictureUrl ?? undefined}
                      avatarEmoji={participant.avatar?.emoji}
                      avatarImage={participant.avatar?.avatarImage}
                      avatarColor={participant.avatar?.color}
                      size="md"
                      className="border-2 border-neo-black"
                    />
                  )}
                </div>

                {/* Name */}
                <p className={cn(
                  'text-xs font-bold text-center truncate mb-1',
                  'text-neo-black dark:text-white'
                )}>
                  {participant.name}
                  {isCurrentPlayer && (
                    <span className="text-[10px] text-neo-cyan"> ({t('common.you') || 'me'})</span>
                  )}
                </p>

                {/* Score */}
                <div className={cn(
                  'text-center py-1 rounded-neo border border-neo-black',
                  config.bg
                )}>
                  <span className={cn('text-sm font-black', config.text)}>
                    {participant.score}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default Top3Leaderboard;
