'use client';

import React, { useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import PlayerProfileTooltip from '../ui/PlayerProfileTooltip';
import type { Player } from './types';
import { fireConfetti, RANK_COLORS } from '@/utils/confettiUtils';
import { RANK_CONFIG, getRankConfig } from '@/utils/rankingStyles';

// Fire confetti burst for a specific rank with custom origin
const fireConfettiForRank = (rank: number, intensity: number = 1): void => {
  const count = Math.floor(80 * intensity);
  const colors = RANK_COLORS[rank] || RANK_COLORS[1];

  // Different origin positions for each rank (left, center, right)
  const originX = rank === 1 ? 0.5 : rank === 2 ? 0.25 : 0.75;

  fireConfetti({
    particleCount: Math.floor(count * 0.25),
    spread: 26,
    startVelocity: 45,
    origin: { x: originX, y: 0.6 },
    colors,
  });
  fireConfetti({
    particleCount: Math.floor(count * 0.2),
    spread: 50,
    origin: { x: originX, y: 0.6 },
    colors,
  });
  fireConfetti({
    particleCount: Math.floor(count * 0.35),
    spread: 80,
    decay: 0.91,
    scalar: 0.8,
    origin: { x: originX, y: 0.6 },
    colors,
  });
  fireConfetti({
    particleCount: Math.floor(count * 0.2),
    spread: 100,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.1,
    origin: { x: originX, y: 0.6 },
    colors,
  });
};

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
  /** Show confetti celebration for top 3 (default: true) */
  showConfetti?: boolean;
  /** Compact mode - reduced padding and no header (default: false) */
  compact?: boolean;
}

// Using shared RANK_CONFIG from @/utils/rankingStyles

/**
 * Top 3 Leaderboard with Podium Layout
 * Shows winners in podium style: 2nd (left) - 1st (center, tallest) - 3rd (right)
 * Includes visual height differences for podium effect
 *
 * Supports both:
 * - Multiplayer mode: Pass `players` prop
 * - Single player mode: Pass `participants` prop (with bots)
 */
const Top3Leaderboard = memo<Top3LeaderboardProps>(({
  players,
  participants,
  currentUsername,
  headerText,
  showConfetti = true,
  compact = false,
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

  // Fire staggered confetti bursts for top 3 on mount
  useEffect(() => {
    if (!showConfetti || top3.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    top3.forEach((_, index) => {
      const rank = index + 1;
      const delay = 600 + index * 300;
      const intensity = 1 - index * 0.2;
      const timer = setTimeout(() => fireConfettiForRank(rank, intensity), delay);
      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConfetti, top3.length]); // Intentionally using length, not full array - only re-fire when count changes

  const handleCardClick = useCallback((rank: number) => {
    fireConfettiForRank(rank, 0.7);
  }, []);

  if (top3.length === 0) return null;

  // Podium order: 2nd (left), 1st (center), 3rd (right)
  // Podium heights (relative): 1st = tallest, 2nd = medium, 3rd = shortest
  const podiumConfig = {
    1: { order: 1, height: compact ? 'h-24' : 'h-28', mt: 'mt-0', podiumHeight: compact ? 'h-10' : 'h-12' },
    2: { order: 0, height: compact ? 'h-20' : 'h-24', mt: compact ? 'mt-4' : 'mt-4', podiumHeight: compact ? 'h-6' : 'h-8' },
    3: { order: 2, height: compact ? 'h-16' : 'h-20', mt: compact ? 'mt-8' : 'mt-8', podiumHeight: compact ? 'h-4' : 'h-5' },
  };

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: compact ? 0.1 : 0.3 }}
      className={cn('w-full max-w-lg mx-auto', compact ? 'mb-2' : 'mb-4')}
    >
      {/* Header - hidden in compact mode */}
      {!compact && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {headerText || t('results.topPlayers')}
          </span>
        </div>
      )}

      {/* Podium Layout: 2nd - 1st - 3rd */}
      <div className="flex items-end justify-center gap-1.5">
        {podiumOrder.map((participant, displayIndex) => {
          if (!participant) return null;
          // Determine actual rank from original position
          const originalIndex = top3.findIndex(p => p?.name === participant.name);
          const rank = originalIndex + 1;
          const config = RANK_CONFIG[rank as 1 | 2 | 3];
          const podium = podiumConfig[rank as 1 | 2 | 3];
          const isCurrentPlayer = participant.isCurrentPlayer ?? participant.name === currentUsername;
          const Icon = config.icon;

          return (
            <motion.div
              key={participant.name}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: compact ? 0.05 * displayIndex : 0.1 + displayIndex * 0.1, type: 'spring', stiffness: 200 }}
              style={{ order: podium.order }}
              className={cn('flex flex-col items-center', podium.mt)}
            >
              {/* Player Card */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCardClick(rank)}
                className={cn(
                  'relative rounded-neo border-2 border-neo-black shadow-hard-sm overflow-hidden cursor-pointer',
                  'bg-white dark:bg-slate-800',
                  compact ? 'w-20 p-1.5' : 'w-24 p-2',
                  isCurrentPlayer && 'ring-2 ring-neo-cyan'
                )}
              >
                {/* Avatar with rank badge overlay */}
                <div className="flex justify-center relative mb-1">
                  {participant.isBot ? (
                    <div className={cn(
                      'rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-neo-black flex items-center justify-center',
                      compact ? 'w-8 h-8' : 'w-10 h-10'
                    )}>
                      <Bot className={cn('text-slate-500 dark:text-slate-400', compact ? 'text-sm' : 'text-lg')} />
                    </div>
                  ) : (
                    <Avatar
                      profilePictureUrl={participant.avatar?.profilePictureUrl ?? undefined}
                      avatarImage={participant.avatar?.avatarImage}
                      size="sm"
                      className={cn('border-2 border-neo-black', compact ? 'w-8 h-8' : 'w-10 h-10')}
                    />
                  )}
                  {/* Rank badge overlay */}
                  <div className={cn(
                    'absolute -top-1 -end-1 rounded-full flex items-center justify-center border border-neo-black',
                    compact ? 'w-5 h-5' : 'w-6 h-6',
                    config.bg
                  )}>
                    <Icon className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5', config.text)} />
                  </div>
                </div>

                {/* Name */}
                <PlayerProfileTooltip
                  player={{
                    username: participant.name,
                    profilePictureUrl: participant.avatar?.profilePictureUrl,
                    avatarImage: participant.avatar?.avatarImage,
                    score: participant.score,
                  }}
                  isCurrentUser={isCurrentPlayer}
                  side="bottom"
                >
                  <p className={cn(
                    'font-bold text-center truncate text-neo-black dark:text-white',
                    compact ? 'text-[10px]' : 'text-xs',
                    !isCurrentPlayer && 'cursor-pointer hover:text-neo-cyan'
                  )}>
                    {participant.name}
                    {isCurrentPlayer && <span className="text-neo-cyan"> ★</span>}
                  </p>
                </PlayerProfileTooltip>

                {/* Score */}
                <div className={cn(
                  'text-center rounded-neo border border-neo-black mt-1',
                  compact ? 'py-0.5' : 'py-1',
                  config.bg
                )}>
                  <span className={cn('font-black', compact ? 'text-xs' : 'text-sm', config.text)}>
                    {participant.score}
                  </span>
                </div>
              </motion.div>

              {/* Podium Base */}
              <div className={cn(
                'w-full rounded-t-neo border-2 border-neo-black border-b-0 flex items-center justify-center',
                compact ? 'w-20' : 'w-24',
                podium.podiumHeight,
                config.bg
              )}>
                <span className={cn(
                  'inline-flex items-center justify-center rounded-full border-2 font-black',
                  compact ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm',
                  rank === 1 ? 'bg-amber-400 border-amber-600 text-neo-black' :
                  rank === 2 ? 'bg-slate-300 border-slate-500 text-neo-black' :
                  'bg-orange-300 border-orange-500 text-neo-black',
                )}>
                  {rank}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Podium Floor */}
      <div className="w-full h-2 bg-slate-700 dark:bg-slate-600 border-2 border-neo-black rounded-b-neo -mt-[2px]" />
    </motion.div>
  );
});

Top3Leaderboard.displayName = 'Top3Leaderboard';

export default Top3Leaderboard;
