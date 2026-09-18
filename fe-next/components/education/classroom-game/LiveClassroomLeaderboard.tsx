'use client';

/**
 * LiveClassroomLeaderboard — Real-time leaderboard during classroom gameplay
 *
 * Features:
 * - Displays live during a game round (not just at the end)
 * - Animated rank swaps using LeaderboardRowReorder
 * - Bounded confetti on score changes
 * - Sound stings per game mode (via useModeSting)
 * - Respects reduced-motion and mobile-web constraints
 * - Multiple visibility modes (full, top3, top5, personal_only)
 *
 * @example
 * ```tsx
 * <LiveClassroomLeaderboard
 *   players={currentScores}
 *   gameMode="classic"
 *   isPlaying={true}
 *   visibility="full"
 * />
 * ```
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { Trophy, Users } from 'lucide-react';
import { LeaderboardRowReorder } from '@/components/motion/LeaderboardRowReorder';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';
import { useModeSting } from '@/hooks/useModeSting';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassroomLeaderboardEntry, LeaderboardVisibility } from './types';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

interface LiveClassroomLeaderboardProps {
  /** Array of current players with scores, sorted by rank */
  players: ClassroomLeaderboardEntry[];
  /** Current game mode for sound routing */
  gameMode: ClassroomGameMode;
  /** Whether a game is actively in progress */
  isPlaying: boolean;
  /** Which players to show */
  visibility?: LeaderboardVisibility;
  /** Additional CSS classes */
  className?: string;
  /** Student ID to highlight as current user */
  currentStudentId?: string;
}

/**
 * Single leaderboard row with score and rank
 */
function LeaderboardRow({
  entry,
  rank,
  isCurrentPlayer = false,
  maxScore = 1000,
}: {
  entry: ClassroomLeaderboardEntry;
  rank: number;
  isCurrentPlayer?: boolean;
  maxScore?: number;
}) {
  const scorePercentage = Math.min((entry.score / maxScore) * 100, 100);
  const medalColor = rank === 1 ? 'text-neo-yellow' : rank === 2 ? 'text-neo-cyan' : 'text-neo-pink';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-neo border-[2px]',
        isCurrentPlayer
          ? 'border-neo-lime bg-neo-navy-elevated'
          : 'border-neo-white/20 bg-neo-navy-elevated/50'
      )}
      data-testid={`leaderboard-entry-${entry.id}`}
    >
      {/* Rank badge */}
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-neo border-[2px] font-bold text-sm shrink-0',
          rank === 1
            ? 'border-neo-yellow bg-neo-yellow/20 text-neo-yellow'
            : rank === 2
              ? 'border-neo-cyan bg-neo-cyan/20 text-neo-cyan'
              : 'border-neo-pink bg-neo-pink/20 text-neo-pink'
        )}
      >
        {rank}
      </div>

      {/* Player name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neo-white truncate">{entry.name}</p>
        <p className="text-xs text-neo-white/60">{entry.wordCount} words</p>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-20 h-2 rounded-neo bg-neo-navy-elevated border-[1px] border-neo-white/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neo-lime to-neo-cyan transition-all duration-300"
            style={{ width: `${scorePercentage}%` }}
          />
        </div>
        <span className={cn('font-bold text-sm min-w-[3rem] text-right tabular-nums', medalColor)}>
          {entry.score}
        </span>
      </div>
    </div>
  );
}

/**
 * Main leaderboard component
 */
export function LiveClassroomLeaderboard({
  players,
  gameMode,
  isPlaying,
  visibility = 'full',
  className,
  currentStudentId,
}: LiveClassroomLeaderboardProps) {
  const { t } = useLanguage();
  const { playModeSound } = useModeSting();
  const prevPlayersRef = useRef<ClassroomLeaderboardEntry[]>([]);
  const [recentScorers, setRecentScorers] = React.useState<Set<string>>(new Set());

  // Filter players based on visibility mode (at top level before any early returns)
  const visiblePlayers = useMemo(() => {
    if (!isPlaying) return [];

    switch (visibility) {
      case 'hidden':
        return [];
      case 'top3':
        return players.slice(0, 3);
      case 'top5':
        return players.slice(0, 5);
      case 'personal_only':
        return currentStudentId ? players.filter(p => p.id === currentStudentId) : [];
      case 'full':
      default:
        return players;
    }
  }, [players, visibility, currentStudentId, isPlaying]);

  // Calculate max score for the bar fill (to keep bars responsive to top score)
  const maxScore = useMemo(
    () => Math.max(...visiblePlayers.map(p => p.score), 100),
    [visiblePlayers]
  );

  // Detect score changes and trigger confetti/sounds
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const prev = prevPlayersRef.current;
    prevPlayersRef.current = visiblePlayers;

    // Look for score increases and trigger confetti
    const newScorers = new Set<string>();
    for (const player of visiblePlayers) {
      const prevPlayer = prev.find(p => p.id === player.id);
      if (prevPlayer && player.score > prevPlayer.score) {
        newScorers.add(player.id);
      }
    }

    let timer: NodeJS.Timeout | null = null;
    if (newScorers.size > 0) {
      setRecentScorers(newScorers);
      // Auto-clear confetti after 800ms
      timer = setTimeout(() => {
        setRecentScorers(new Set());
      }, 800);
    }

    // Cleanup function always returned
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visiblePlayers, isPlaying]);

  // Don't render if not playing
  if (!isPlaying) {
    return null;
  }

  if (visiblePlayers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-neo-white/60">
        <Users className="w-5 h-5 mb-2" />
        <p className="text-sm">{t('tvBroadcast.noPlayersYet', 'No players yet')}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Leaderboard title */}
      <div className="flex items-center gap-2 px-3 mb-1">
        <Trophy className="w-4 h-4 text-neo-yellow" />
        <h3 className="font-bold text-sm text-neo-white uppercase tracking-wide">
          {t('tvBroadcast.leaderboard', 'Leaderboard')}
        </h3>
      </div>

      {/* Animated rows using LeaderboardRowReorder for smooth rank transitions */}
      <LeaderboardRowReorder<ClassroomLeaderboardEntry>
        rows={visiblePlayers}
        duration={300}
        renderRow={(entry, index) => (
          <BoundedConfettiBurst
            key={entry.id}
            trigger={recentScorers.has(entry.id)}
            size="sm"
            colors={['#00ff88', '#00ffff', '#ff00ff', '#ffff00']}
          >
            <LeaderboardRow
              entry={entry}
              rank={index + 1}
              isCurrentPlayer={entry.id === currentStudentId}
              maxScore={maxScore}
            />
          </BoundedConfettiBurst>
        )}
      />
    </div>
  );
}

export default LiveClassroomLeaderboard;
