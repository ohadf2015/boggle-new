'use client';

import React, { memo, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Avatar from '../../../components/Avatar';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface LeaderboardPlayer {
  username: string;
  score: number;
  avatar?: AvatarType | null;
  wordCount?: number;
  rank: number;
}

interface TvResultsLeaderboardProps {
  players: LeaderboardPlayer[];
  visible: boolean;
  startRank?: number; // Start from rank 4 by default (skip podium)
  maxVisible?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/**
 * TvResultsLeaderboard - Full ranking display for 4th place and below
 * Compact cards with scrolling for large player counts
 */
const TvResultsLeaderboard = memo<TvResultsLeaderboardProps>(({
  players,
  visible,
  startRank = 4,
  maxVisible = 10,
  t,
}) => {
  // Filter to only show players from startRank onwards
  const displayPlayers = useMemo(() => {
    return players
      .filter(p => p.rank >= startRank)
      .slice(0, maxVisible);
  }, [players, startRank, maxVisible]);

  const remainingCount = useMemo(() => {
    const totalBelowStart = players.filter(p => p.rank >= startRank).length;
    return Math.max(0, totalBelowStart - maxVisible);
  }, [players, startRank, maxVisible]);

  if (displayPlayers.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-3"
        >
          <m.h3
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-black uppercase tracking-wide text-neo-cream/80"
          >
            {t('tvResults.fullRankings')}
          </m.h3>

          <div className="space-y-2 max-h-[400px] overflow-y-auto overscroll-contain scrollable-area pe-2 scrollbar-thin scrollbar-thumb-neo-cream/30 scrollbar-track-transparent">
            {displayPlayers.map((player, index) => (
              <m.div
                key={player.username}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  delay: index * 0.08,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black',
                  'bg-neo-cream/90 shadow-hard-sm',
                  'hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
                )}
              >
                {/* Rank Badge */}
                <div className="w-10 h-10 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-white font-black text-lg text-neo-black">
                  #{player.rank}
                </div>

                {/* Avatar */}
                <Avatar

                  avatarImage={player.avatar?.avatarImage}
                  customAvatar={player.avatar?.customAvatar}
                  size="md"
                  className="border-2 border-neo-black"
                />

                {/* Name & Word Count */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg uppercase text-neo-black truncate">
                    {player.username}
                  </p>
                  {player.wordCount !== undefined && (
                    <p className="text-sm font-bold text-neo-black/60">
                      {player.wordCount} {t('tvResults.words')}
                    </p>
                  )}
                </div>

                {/* Score with bar */}
                <div className="text-right flex items-center gap-2">
                  <m.div
                    className="h-3 rounded-full bg-neo-lime/60 border border-neo-black/20"
                    style={{ transformOrigin: 'right' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.08 + 0.3, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                  >
                    <div style={{ width: `${Math.max(20, (player.score / (players[0]?.score || 1)) * 80)}px` }} className="h-full" />
                  </m.div>
                  <div>
                    <p className="font-black text-xl text-neo-black">
                      {player.score}
                    </p>
                    <p className="text-xs font-bold uppercase text-neo-black/50">
                      {t('tvResults.pts')}
                    </p>
                  </div>
                </div>
              </m.div>
            ))}

            {/* "And X more" indicator */}
            {remainingCount > 0 && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26, delay: displayPlayers.length * 0.08 + 0.2 }}
                className="text-center py-2 text-neo-cream/60 font-bold"
              >
                {remainingCount === 1
                  ? t('tvResults.andMore', { count: remainingCount })
                  : t('tvResults.andMorePlural', { count: remainingCount })}
              </m.div>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

TvResultsLeaderboard.displayName = 'TvResultsLeaderboard';

export default TvResultsLeaderboard;
