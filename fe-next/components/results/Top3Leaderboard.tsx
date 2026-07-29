'use client';

import React, { useEffect, useCallback, memo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import PlayerProfileTooltip from '../ui/PlayerProfileTooltip';
import type { Player } from './types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { fireConfetti, RANK_COLORS } from '@/utils/confettiUtils';
import { RANK_CONFIG } from '@/utils/rankingStyles';
import useReducedMotion from '@/hooks/useReducedMotion';
import { ScoreCountUp } from '@/components/results/shared';

// Fire confetti burst for a specific rank with custom origin.
// Tuned down 2026-05-15: prior 80-particle x 4-volley burst per rank was overwhelming on MP results.
const fireConfettiForRank = (rank: number, intensity: number = 1): void => {
  const count = Math.floor(30 * intensity);
  const colors = RANK_COLORS[rank] || RANK_COLORS[1];

  // Different origin positions for each rank (left, center, right)
  const originX = rank === 1 ? 0.5 : rank === 2 ? 0.25 : 0.75;

  fireConfetti({
    particleCount: Math.floor(count * 0.5),
    spread: 45,
    startVelocity: 40,
    origin: { x: originX, y: 0.6 },
    colors,
  });
  fireConfetti({
    particleCount: Math.floor(count * 0.5),
    spread: 80,
    decay: 0.91,
    scalar: 0.85,
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
    customAvatar?: CustomAvatarConfig | null;
  };
}

export interface EmojiReaction {
  id: string;
  emoji: string;
  username: string;
  timestamp: number;
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
  /** Emoji reactions for speech bubbles above podium cards */
  emojiReactions?: EmojiReaction[];
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
/** Speech bubble that appears above a podium card */
function PodiumEmojiBubble({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <m.div
      initial={{ scale: 0, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: -8, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      className="absolute -top-8 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 z-30 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm px-2 py-1 text-lg pointer-events-none"
    >
      {emoji}
      <div className="absolute -bottom-1.5 inset-s-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-3 h-3 bg-neo-cream border-b-3 border-e-3 border-neo-black rotate-45" />
    </m.div>
  );
}

const Top3Leaderboard = memo<Top3LeaderboardProps>(({
  players,
  participants,
  currentUsername,
  headerText,
  showConfetti = true,
  compact = false,
  emojiReactions = [],
}) => {
  const { t, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const rtlFlip = dir === 'rtl' ? -1 : 1;

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

  // Fire a single confetti burst for the winner on mount.
  // Tuned 2026-05-15: previously fired 3 staggered bursts (all top-3); too overwhelming.
  useEffect(() => {
    if (!showConfetti || top3.length === 0 || reducedMotion) return;

    const timer = setTimeout(() => fireConfettiForRank(1, 1), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConfetti, top3.length]); // Intentionally using length, not full array - only re-fire when count changes

  const handleCardClick = useCallback((rank: number, isCurrentPlayer: boolean) => {
    if (!reducedMotion) fireConfettiForRank(rank, isCurrentPlayer ? 1.2 : 0.7);
  }, [reducedMotion]);

  // Emoji speech bubble state
  const [dismissedBubbles, setDismissedBubbles] = useState<Set<string>>(new Set());
  const activeBubbles = emojiReactions.filter(r => !dismissedBubbles.has(r.id));

  if (top3.length === 0) return null;

  // Podium order: 2nd (left), 1st (center), 3rd (right)
  // Podium heights (relative): 1st = tallest, 2nd = medium, 3rd = shortest
  const podiumConfig = {
    1: { order: 1, mt: 'mt-0', podiumHeight: compact ? 'h-16' : 'h-20' },
    2: { order: 0, mt: compact ? 'mt-6' : 'mt-8', podiumHeight: compact ? 'h-10' : 'h-12' },
    3: { order: 2, mt: compact ? 'mt-10' : 'mt-12', podiumHeight: compact ? 'h-7' : 'h-8' },
  };

  // Card background styling per rank
  const cardStyles = {
    1: 'bg-linear-to-b from-amber-300 via-amber-400 to-amber-500',
    2: 'bg-linear-to-b from-slate-300 to-slate-400',
    3: 'bg-linear-to-b from-orange-300 via-orange-400 to-orange-500',
  };

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: compact ? 0.1 : 0.3 }}
      className={cn('w-full max-w-lg mx-auto', compact ? 'mb-2' : 'mb-4')}
    >
      {/* Header - hidden in compact mode */}
      {!compact && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs font-black uppercase tracking-wide text-neo-white">
            {headerText || t('results.topPlayers')}
          </span>
        </div>
      )}

      {/* Podium Layout: 2nd - 1st - 3rd */}
      <div className="flex items-end justify-center gap-2 sm:gap-3">
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
            <m.div
              key={participant.name}
              initial={{
                opacity: 0,
                y: rank === 1 ? -40 : 30,
                x: rank === 2 ? -30 * rtlFlip : rank === 3 ? 30 * rtlFlip : 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1, y: 0, x: 0, scale: 1,
              }}
              transition={{ delay: compact ? 0.05 * displayIndex : 0.15 + displayIndex * 0.12, type: 'spring', stiffness: 220, damping: 18 }}
              style={{ order: podium.order }}
              className={cn('flex flex-col items-center', podium.mt, rank === 1 && 'z-10')}
            >
              {/* Emoji speech bubbles above podium card */}
              <div className="relative">
                <AnimatePresence>
                  {activeBubbles
                    .filter(r => r.username === participant.name)
                    .slice(0, 3) // max 3 stacked
                    .map((r, bubbleIdx) => (
                      <div key={r.id} style={{ position: 'relative', marginBottom: bubbleIdx > 0 ? -4 : 0 }}>
                        <PodiumEmojiBubble
                          emoji={r.emoji}
                          onDone={() => setDismissedBubbles(prev => new Set(prev).add(r.id))}
                        />
                      </div>
                    ))}
                </AnimatePresence>
              </div>

              {/* Crown/Medal icon above card for winner */}
              <m.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: compact ? 0.1 : 0.4 + displayIndex * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                className="mb--1 relative z-10"
              >
                <Icon className={cn(
                  rank === 1 ? 'w-8 h-8 text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.5)]' :
                  rank === 2 ? 'w-6 h-6 text-slate-300 drop-shadow-[0_2px_4px_rgba(148,163,184,0.5)]' :
                  'w-6 h-6 text-orange-400 drop-shadow-[0_2px_4px_rgba(251,146,60,0.5)]',
                  compact && 'scale-75'
                )} />
              </m.div>

              {/* Player Card */}
              <m.div
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCardClick(rank, isCurrentPlayer)}
                className={cn(
                  'relative rounded-neo border-3 border-neo-black shadow-hard overflow-hidden cursor-pointer',
                  cardStyles[rank as 1 | 2 | 3],
                  compact ? 'w-24 p-2' : rank === 1 ? 'w-36 p-3' : 'w-28 p-2.5',
                  isCurrentPlayer && 'ring-2 ring-neo-cyan ring-offset-2 ring-offset-neo-navy',
                )}
              >
                {/* Subtle halftone texture */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(circle,black_1px,transparent_1px)] bg-size-[8px_8px]" />

                {/* Winner glow pulse */}
                {rank === 1 && !reducedMotion && (
                  <m.div
                    className="absolute inset-0 rounded-neo pointer-events-none"
                    animate={{
                      boxShadow: [
                        'inset 0 0 0 0 rgba(191,255,0,0)',
                        'inset 0 0 20px rgba(191,255,0,0.3)',
                        'inset 0 0 0 0 rgba(191,255,0,0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Avatar */}
                <div className="flex justify-center relative mb-1.5">
                  {participant.isBot ? (
                    <div className={cn(
                      'rounded-full bg-white/80 border-3 border-neo-black flex items-center justify-center shadow-hard-sm',
                      compact ? 'w-10 h-10' : rank === 1 ? 'w-14 h-14' : 'w-12 h-12'
                    )}>
                      <Bot className={cn('text-slate-500', compact ? 'w-5 h-5' : 'w-6 h-6')} />
                    </div>
                  ) : (
                    <div className={cn(
                      'rounded-full border-3 border-neo-black shadow-hard-sm bg-white/90 p-0.5',
                      compact ? '' : rank === 1 ? 'p-1' : ''
                    )}>
                      <Avatar
                        customAvatar={participant.avatar?.customAvatar}
                        userId={participant.name}
                        size={compact ? 'md' : rank === 1 ? 'xl' : 'lg'}
                        className={cn(compact ? 'w-9 h-9' : rank === 1 ? 'w-12 h-12' : 'w-10 h-10')}
                      />
                    </div>
                  )}
                </div>

                {/* Name */}
                <PlayerProfileTooltip
                  player={{
                    username: participant.name,
                    customAvatar: participant.avatar?.customAvatar,
                    score: participant.score,
                  }}
                  isCurrentUser={isCurrentPlayer}
                  side="bottom"
                >
                  <p className={cn(
                    'font-black text-center truncate text-neo-black',
                    compact ? 'text-[10px]' : rank === 1 ? 'text-sm' : 'text-xs',
                    !isCurrentPlayer && 'cursor-pointer'
                  )}>
                    {participant.name}
                    {isCurrentPlayer && <span className="text-neo-cyan"> ★</span>}
                  </p>
                </PlayerProfileTooltip>

                {/* Score - prominent display with count-up */}
                <div className={cn(
                  'text-center rounded-neo border-2 border-neo-black mt-1.5 bg-white/90 shadow-hard-sm',
                  compact ? 'py-0.5 px-1' : 'py-1 px-2',
                )}>
                  <span className={cn('font-black text-neo-black tabular-nums', compact ? 'text-sm' : rank === 1 ? 'text-xl' : 'text-lg')}>
                    <ScoreCountUp to={participant.score} duration={1400} delay={reducedMotion ? 0 : 400 + displayIndex * 150} />
                  </span>
                </div>
              </m.div>

              {/* Podium Base */}
              <div className={cn(
                'w-full border-x-3 border-t-3 border-neo-black flex items-start justify-center pt-2',
                compact ? 'w-24 rounded-t-lg' : rank === 1 ? 'w-36 rounded-t-lg' : 'w-28 rounded-t-lg',
                podium.podiumHeight,
                rank === 1 ? 'bg-linear-to-b from-amber-400 to-amber-500' :
                rank === 2 ? 'bg-linear-to-b from-slate-300 to-slate-400' :
                'bg-linear-to-b from-orange-400 to-orange-500',
              )}>
                <span className={cn(
                  'font-black',
                  compact ? 'text-lg' : 'text-2xl',
                  rank === 1 ? 'text-amber-800' :
                  rank === 2 ? 'text-slate-600' :
                  'text-orange-800',
                )}>
                  {rank}
                </span>
              </div>
            </m.div>
          );
        })}
      </div>

      {/* Podium Floor */}
      <div className="w-full h-2 bg-neo-black rounded-b-neo -mt-[2px]" />
    </m.div>
  );
});

Top3Leaderboard.displayName = 'Top3Leaderboard';

export default Top3Leaderboard;
