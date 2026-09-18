'use client';

/**
 * LiveLeaderboard — Animated, live-updating leaderboard for classroom games
 *
 * Features:
 * - Animated row reordering with spring layout animations when ranks change
 * - Automatic host filtering (server includes, display filters)
 * - Phone compact mode: top 3 players only, bounded height
 * - Projector full mode: all players, legible at 1920x1080
 * - Uses LeaderboardRowReorder for smooth rank swaps
 *
 * Class-3 fix: Receives leaderboard from socket payload which includes it atomically
 */

import { memo, useMemo } from 'react';
import { LeaderboardRowReorder } from '@/components/motion/LeaderboardRowReorder';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface LeaderboardRow {
  id: string;
  username: string;
  displayName: string;
  score: number;
  rank: number;
  playerId: string;
}

export interface LiveLeaderboardProps {
  rows: LeaderboardRow[];
  hostUsername?: string;
  viewMode?: 'compact' | 'full';
  maxHeight?: string;
  className?: string;
}

/**
 * Phone-compact leaderboard: top 3 players
 */
const CompactLeaderboardRow = memo<{ row: LeaderboardRow; index: number }>(
  ({ row, index }) => (
    <div
      data-testid={`leaderboard-row-${row.username}`}
      className={cn(
        'flex items-center gap-3 px-3 py-2 text-sm',
        index % 2 === 0 ? 'bg-neo-navy' : 'bg-neo-navy/50'
      )}
    >
      <span className="font-neo-display font-bold w-6 text-neo-lime">
        #{row.rank}
      </span>
      <span className="font-neo-body font-bold flex-1 truncate">
        {row.displayName}
      </span>
      <span className="font-neo-body font-bold text-neo-cyan tabular-nums">
        {row.score}
      </span>
    </div>
  )
);
CompactLeaderboardRow.displayName = 'CompactLeaderboardRow';

/**
 * Projector-full leaderboard: all players, larger text
 */
const FullLeaderboardRow = memo<{ row: LeaderboardRow; index: number }>(
  ({ row, index }) => (
    <div
      data-testid={`leaderboard-row-${row.username}`}
      className={cn(
        'flex items-center gap-4 px-6 py-3 text-base',
        'border-b border-neo-black/20',
        index % 2 === 0 ? 'bg-neo-navy' : 'bg-neo-navy/70'
      )}
    >
      <span className="font-neo-display font-black w-8 text-neo-lime text-lg">
        {row.rank}
      </span>
      <span className="font-neo-body font-bold flex-1 truncate">
        {row.displayName}
      </span>
      <span className="font-neo-body font-bold text-neo-cyan tabular-nums text-lg">
        {row.score}
      </span>
    </div>
  )
);
FullLeaderboardRow.displayName = 'FullLeaderboardRow';

/**
 * Main component
 */
export const LiveLeaderboard = memo<LiveLeaderboardProps>(
  ({
    rows,
    hostUsername,
    viewMode = 'full',
    maxHeight,
    className,
  }) => {
    const { t } = useLanguage();

    // Filter out host from display (server includes, client filters)
    const displayRows = useMemo(() => {
      return hostUsername
        ? rows.filter(r => r.username !== hostUsername)
        : rows;
    }, [rows, hostUsername]);

    // Compact mode: top 3 players only
    const visibleRows = useMemo(() => {
      return viewMode === 'compact' ? displayRows.slice(0, 3) : displayRows;
    }, [displayRows, viewMode]);

    if (visibleRows.length === 0) {
      return null;
    }

    const RowComponent =
      viewMode === 'compact' ? CompactLeaderboardRow : FullLeaderboardRow;

    return (
      <div
        data-testid="live-leaderboard"
        className={cn(
          'w-full rounded-neo border-neo border-neo-black bg-neo-navy',
          className
        )}
        style={{
          maxHeight: maxHeight,
          overflow: viewMode === 'full' ? 'auto' : 'hidden',
        }}
      >
        <LeaderboardRowReorder
          rows={visibleRows}
          renderRow={(row, index) => (
            <RowComponent row={row} index={index} />
          )}
          duration={300}
        />
      </div>
    );
  }
);

LiveLeaderboard.displayName = 'LiveLeaderboard';

export default LiveLeaderboard;
