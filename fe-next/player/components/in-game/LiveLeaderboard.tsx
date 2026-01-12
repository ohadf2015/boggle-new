'use client';

import React, { memo, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getRankStyle, getRankIconString } from '@/utils/rankingStyles';
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
// Threshold for switching to virtual scrolling (for performance with many players)
const VIRTUAL_SCROLL_THRESHOLD = 15;
const ROW_HEIGHT = 64; // Height of each leaderboard row in pixels

export const LiveLeaderboard = memo<LiveLeaderboardProps>(({
  leaderboard,
  username,
  t,
  dir,
  compact = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize leaderboard items with centralized ranking utilities
  const memoizedLeaderboard = useMemo(() => leaderboard.map((player, index) => ({
    ...player,
    rankStyle: getRankStyle(index),
    isMe: player.username === username,
    rankDisplay: getRankIconString(index)
  })), [leaderboard, username]);

  // Use virtual scrolling for large player counts
  const useVirtual = memoizedLeaderboard.length > VIRTUAL_SCROLL_THRESHOLD;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual intentionally returns mutable functions
  const virtualizer = useVirtualizer({
    count: memoizedLeaderboard.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    enabled: useVirtual,
  });

  // Render a single leaderboard row
  const renderRow = (player: typeof memoizedLeaderboard[0], index: number, style?: React.CSSProperties) => (
    <motion.div
      key={player.username}
      initial={!useVirtual ? { x: 50, opacity: 0 } : false}
      animate={!useVirtual ? { x: 0, opacity: 1 } : undefined}
      transition={!useVirtual ? { delay: index * 0.05 } : undefined}
      className={`flex items-center gap-3 p-2 rounded-neo border-3 shadow-hard-sm transition-all
        hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard
        ${player.rankStyle} ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
      style={style}
    >
      <div className="w-10 h-10 rounded-neo flex items-center justify-center font-black text-lg bg-neo-black text-neo-cream border-2 border-neo-black">
        {player.rankDisplay}
      </div>
      <Avatar
        profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
        avatarImage={player.avatar?.avatarImage}
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
  );

  return (
    <div
      className="bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden"
      style={{ transform: compact ? 'none' : 'rotate(-1deg)' }}
      data-tutorial="leaderboard"
    >
      <div className="py-3 px-4 border-b-4 border-neo-black bg-neo-purple text-white">
        <h3 className="flex items-center gap-2 text-neo-cream text-base uppercase tracking-widest font-black">
          <Trophy className="text-neo-yellow" style={{ filter: 'drop-shadow(2px 2px 0px rgb(var(--neo-black)))' }} />
          {t('playerView.leaderboard')}
        </h3>
      </div>
      <div ref={parentRef} className="overflow-y-auto flex-1 p-3" style={{ maxHeight: compact ? '300px' : '400px' }}>
        {useVirtual ? (
          // Virtual scrolling for large lists
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const player = memoizedLeaderboard[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderRow(player, virtualRow.index)}
                </div>
              );
            })}
          </div>
        ) : (
          // Regular rendering for small lists (with animations)
          <div className="space-y-2">
            {memoizedLeaderboard.map((player, index) => renderRow(player, index))}
            {leaderboard.length === 0 && (
              <p className="text-center text-neo-black/90 py-6 text-sm font-bold">
                {t('playerView.noPlayersYet') || 'No players yet'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

LiveLeaderboard.displayName = 'LiveLeaderboard';

export default LiveLeaderboard;
