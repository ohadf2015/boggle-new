'use client';

import React, { memo, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import TvPlayerCard from './TvPlayerCard';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface LeaderboardEntry {
  username: string;
  score: number;
  wordCount: number;
  avatar?: AvatarType | null;
  isHost?: boolean;
}

interface PlayerComboData {
  level: number;
  lastWordTime: number;
}

interface TvLeaderboardProps {
  players: LeaderboardEntry[];
  playerCombos?: Record<string, PlayerComboData>;
  hostUsername?: string;
}

// Virtual item height for performance
const ITEM_HEIGHT = 80;
const VIRTUAL_THRESHOLD = 15;

/**
 * TvLeaderboard - Scrollable leaderboard for TV broadcast mode
 * Uses virtual scrolling for large player counts
 */
const TvLeaderboard = memo<TvLeaderboardProps>(({
  players,
  playerCombos = {},
  hostUsername,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Sort players by score (descending)
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  // Use virtual scrolling only for large player counts
  const useVirtual = sortedPlayers.length > VIRTUAL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: sortedPlayers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    enabled: useVirtual,
  });

  // Auto-scroll to show recent activity (when someone scores)
  useEffect(() => {
    // For now, we don't auto-scroll to maintain stability
    // Could be enhanced to scroll to players who just scored
  }, [sortedPlayers]);

  if (sortedPlayers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neo-black/50 font-bold text-lg">No players yet</p>
      </div>
    );
  }

  // Non-virtual rendering for small player counts
  if (!useVirtual) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full overflow-y-auto p-4 space-y-2"
      >
        <h3 className="text-xl font-black uppercase text-neo-black mb-4 text-center border-b-2 border-neo-black pb-2">
          Leaderboard
        </h3>
        {sortedPlayers.map((player, index) => (
          <TvPlayerCard
            key={player.username}
            username={player.username}
            avatar={player.avatar}
            score={player.score}
            wordCount={player.wordCount}
            rank={index + 1}
            comboLevel={playerCombos[player.username]?.level || 0}
            isHost={player.username === hostUsername || player.isHost}
            index={index}
          />
        ))}
      </motion.div>
    );
  }

  // Virtual rendering for large player counts
  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-xl font-black uppercase text-neo-black mb-4 text-center border-b-2 border-neo-black pb-2 flex-shrink-0">
        Leaderboard ({sortedPlayers.length})
      </h3>
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const player = sortedPlayers[virtualRow.index];
            if (!player) return null;

            return (
              <div
                key={player.username}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  padding: '4px 0',
                }}
              >
                <TvPlayerCard
                  username={player.username}
                  avatar={player.avatar}
                  score={player.score}
                  wordCount={player.wordCount}
                  rank={virtualRow.index + 1}
                  comboLevel={playerCombos[player.username]?.level || 0}
                  isHost={player.username === hostUsername || player.isHost}
                  index={virtualRow.index}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TvLeaderboard.displayName = 'TvLeaderboard';

export default TvLeaderboard;
