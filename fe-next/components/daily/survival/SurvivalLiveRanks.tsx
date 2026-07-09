'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import { getRankDisplay } from '@/utils/rankingStyles';
import type { Language } from '@/types';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  solved: boolean;
  playerId?: string;
  guestFingerprint?: string;

  avatar_image?: string | null;
  custom_avatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
}

export interface SurvivalLiveRanksProps {
  puzzleDate: string;
  language: Language | string;
  currentPlayerId: string | null;
  currentGuestFingerprint: string | null;
  t: (key: string) => string;
}

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Left sidebar - live leaderboard during gameplay.
 * Self-fetching: polls the leaderboard API every 30s.
 */
export const SurvivalLiveRanks: React.FC<SurvivalLiveRanksProps> = ({
  puzzleDate,
  language,
  currentPlayerId,
  currentGuestFingerprint,
  t,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const url = `/api/daily-challenge/word-hunt/leaderboard/${puzzleDate}/${language}?limit=10`;
      const response = await fetch(url);
      if (!response.ok) {
        setHasLoaded(true);
        return;
      }

      const data = await response.json();
      // API returns snake_case from Supabase view — map to camelCase
      const mapped: LeaderboardEntry[] = (data.data || []).map((row: Record<string, unknown>, idx: number) => ({
        rank: (row.rank_position as number) ?? idx + 1,
        displayName: (row.display_name as string) || 'Anonymous',
        score: (row.efficiency_score as number) ?? 0,
        solved: (row.solved as boolean) ?? false,
        playerId: row.player_id as string | undefined,
        guestFingerprint: row.guest_fingerprint as string | undefined,

        avatar_image: row.avatar_image as string | null,
        custom_avatar: (row.custom_avatar as import('@/shared/types/customAvatar').CustomAvatarConfig | null) ?? null,
      }));
      setEntries(mapped);
      setTotalPlayers(data.totalPlayers || data.totalParticipants || 0);
    } catch {
      // Silently fail - leaderboard is non-critical during gameplay
    } finally {
      setHasLoaded(true);
    }
  }, [puzzleDate, language]);

  // Initial fetch + polling
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const isCurrentPlayer = (entry: LeaderboardEntry) => {
    if (currentPlayerId && entry.playerId === currentPlayerId) return true;
    if (currentGuestFingerprint && entry.guestFingerprint === currentGuestFingerprint) return true;
    return false;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-3 border-neo-black shrink-0 bg-neo-black/30">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-neo-yellow" />
          <span className="font-bold text-neo-white text-sm uppercase tracking-wide">
            {t('wordHunt.desktop.liveRanks')}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-neo-yellow/20 border border-neo-yellow/30 px-2.5 py-0.5 rounded-neo">
          <Users className="w-3 h-3 text-neo-yellow" />
          <span className="font-black text-neo-yellow text-sm tabular-nums">{totalPlayers}</span>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-neo-cream/20 scrollbar-track-transparent">
        <AdaptiveAnimatePresence mode="popLayout">
          {entries.map((entry) => (
            <AdaptiveMotion.div
              key={`${entry.rank}-${entry.displayName}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              data-player-row
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-neo transition-colors',
                isCurrentPlayer(entry)
                  ? 'bg-neo-cyan/10 ring-2 ring-neo-cyan/60'
                  : 'bg-neo-black/20 hover:bg-neo-black/30'
              )}
            >
              {/* Rank */}
              <span className={cn(
                'w-6 text-center font-black text-sm tabular-nums shrink-0',
                entry.rank === 1 ? 'text-tier-gold' :
                entry.rank === 2 ? 'text-tier-silver' :
                entry.rank === 3 ? 'text-tier-bronze' :
                'text-neo-white'
              )}>
                {getRankDisplay(entry.rank)}
              </span>

              {/* Avatar */}
              <div className="shrink-0">
                <Avatar
                  customAvatar={entry.custom_avatar ?? undefined}
                  avatarImage={entry.avatar_image ?? undefined}
                  userId={entry.playerId ?? entry.displayName}
                  size="sm"
                />
              </div>

              {/* Name */}
              <PlayerProfileTooltip
                player={{
                  id: entry.playerId,
                  username: entry.displayName,

                  avatarImage: entry.avatar_image ?? undefined,
                  customAvatar: entry.custom_avatar ?? undefined,
                  score: entry.score,
                }}
                isCurrentUser={isCurrentPlayer(entry)}
                side="right"
              >
                <span className={cn(
                  'flex-1 truncate text-sm font-medium',
                  isCurrentPlayer(entry) ? 'text-neo-cyan font-bold' : 'text-neo-white cursor-pointer hover:underline'
                )}>
                  {entry.displayName}
                </span>
              </PlayerProfileTooltip>

              {/* Score */}
              <span className="font-black text-sm tabular-nums text-neo-lime shrink-0">
                {entry.score}
              </span>
            </AdaptiveMotion.div>
          ))}
        </AdaptiveAnimatePresence>

        {/* Empty State */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-neo-white">
            <Trophy className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">
              {hasLoaded
                ? (t('wordHunt.desktop.beFirst'))
                : (t('common.loading'))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurvivalLiveRanks;
