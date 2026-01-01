'use client';

import React, { useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
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
 * Compact Top 3 Leaderboard
 * Horizontal layout optimized for mobile
 * Shows rank, avatar, name, and score for top 3 players/participants
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
  // This creates a celebratory cascade effect from position to position
  useEffect(() => {
    if (!showConfetti || top3.length === 0) return;

    // Staggered confetti: 1st place first, then 2nd, then 3rd
    const timers: ReturnType<typeof setTimeout>[] = [];

    top3.forEach((_, index) => {
      const rank = index + 1;
      // Stagger timing: 1st at 600ms, 2nd at 900ms, 3rd at 1200ms
      // This timing is after ResultsWinnerBanner confetti (which fires at 400ms)
      const delay = 600 + index * 300;
      // Intensity decreases by rank: 1st = full, 2nd = 80%, 3rd = 60%
      const intensity = 1 - index * 0.2;

      const timer = setTimeout(() => {
        fireConfettiForRank(rank, intensity);
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [showConfetti, top3.length]);

  // Handler for clicking on a player card to fire confetti again (interactive celebration)
  const handleCardClick = useCallback((rank: number) => {
    fireConfettiForRank(rank, 0.7);
  }, []);

  if (top3.length === 0) return null;

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
            {headerText || t('results.topPlayers') || 'Top Players'}
          </span>
        </div>
      )}

      {/* Horizontal cards for top 3 */}
      <div className={cn('flex', compact ? 'gap-1.5' : 'gap-2')}>
        {top3.map((participant, index) => {
          const rank = index + 1;
          const config = RANK_CONFIG[rank as 1 | 2 | 3];
          const isCurrentPlayer = participant.isCurrentPlayer ?? participant.name === currentUsername;
          const Icon = config.icon;

          return (
            <motion.div
              key={participant.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: compact ? 0.05 * index : 0.1 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCardClick(rank)}
              className={cn(
                'flex-1 relative rounded-neo border-2 border-neo-black shadow-hard-sm overflow-hidden cursor-pointer',
                'bg-white dark:bg-slate-800',
                isCurrentPlayer && 'ring-2 ring-neo-cyan'
              )}
            >
              {/* Rank indicator bar */}
              <div className={cn(compact ? 'h-1' : 'h-1.5', config.bg)} />

              <div className={cn(compact ? 'p-1' : 'p-1.5 sm:p-2')}>
                {/* Avatar with rank badge overlay */}
                <div className={cn('flex justify-center relative', compact ? 'mb-0.5' : 'mb-1')}>
                  {participant.isBot ? (
                    <div className={cn(
                      'rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-neo-black flex items-center justify-center',
                      compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-10 sm:h-10'
                    )}>
                      <Bot className={cn('text-slate-500 dark:text-slate-400', compact ? 'text-xs' : 'text-sm sm:text-lg')} />
                    </div>
                  ) : (
                    <Avatar
                      profilePictureUrl={participant.avatar?.profilePictureUrl ?? undefined}
                      avatarEmoji={participant.avatar?.emoji}
                      avatarImage={participant.avatar?.avatarImage}
                      avatarColor={participant.avatar?.color}
                      size="sm"
                      className={cn('border-2 border-neo-black', compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-10 sm:h-10')}
                    />
                  )}
                  {/* Rank badge overlay */}
                  <div className={cn(
                    'absolute -top-1 -end-1 rounded-full flex items-center justify-center border border-neo-black',
                    compact ? 'w-4 h-4' : 'w-5 h-5',
                    config.bg
                  )}>
                    <Icon className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3', config.text)} />
                  </div>
                </div>

                {/* Name + Score combined */}
                <p className={cn(
                  'font-bold text-center truncate text-neo-black dark:text-white',
                  compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'
                )}>
                  {participant.name}
                  {isCurrentPlayer && (
                    <span className="text-neo-cyan"> ★</span>
                  )}
                </p>

                {/* Score - more compact */}
                <div className={cn(
                  'text-center rounded-neo border border-neo-black',
                  compact ? 'py-0 mt-0.5' : 'py-0.5 mt-1',
                  config.bg
                )}>
                  <span className={cn('font-black', compact ? 'text-[10px]' : 'text-xs sm:text-sm', config.text)}>
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
});

Top3Leaderboard.displayName = 'Top3Leaderboard';

export default Top3Leaderboard;
