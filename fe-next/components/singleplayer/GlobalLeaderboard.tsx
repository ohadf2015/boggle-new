'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, Star, RefreshCw, AlertCircle, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getGuestFingerprint } from '@/utils/guestManager';
import { Loader } from '@/components/ui/Loader';

export interface LeaderboardEntry {
  guest_fingerprint: string;
  username: string;
  avatar_emoji: string;
  avatar_color: string;
  total_score: number;
  games_played: number;
  best_score: number;
  longest_word: string | null;
  updated_at: string;
  rank: number;
}

interface GlobalLeaderboardProps {
  /** Limit number of entries to display */
  limit?: number;
  /** Show compact version (fewer details) */
  compact?: boolean;
  /** Highlight specific fingerprint (current user) */
  highlightFingerprint?: string | null;
  /** Called when data is loaded */
  onDataLoaded?: (data: { entries: LeaderboardEntry[]; userRank: number | null }) => void;
}

/**
 * GlobalLeaderboard - Displays the single-player global leaderboard
 * Fetches from /api/single-player/leaderboard endpoint
 */
export function GlobalLeaderboard({
  limit = 50,
  compact = false,
  highlightFingerprint,
  onDataLoaded,
}: GlobalLeaderboardProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Get current user's fingerprint for highlighting
  const currentFingerprint = highlightFingerprint ?? getGuestFingerprint();

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/single-player/leaderboard?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();
      const leaderboardEntries: LeaderboardEntry[] = data.leaderboard || [];

      setEntries(leaderboardEntries);

      // Find user's rank if they're in the leaderboard
      const userEntry = leaderboardEntries.find(
        (entry) => entry.guest_fingerprint === currentFingerprint
      );
      const rank = userEntry?.rank ?? null;
      setUserRank(rank);

      onDataLoaded?.({ entries: leaderboardEntries, userRank: rank });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[GlobalLeaderboard] Fetch error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [limit, currentFingerprint, onDataLoaded]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Get rank icon/style
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: <Crown className="w-5 h-5 text-yellow-500" />,
          bg: 'bg-gradient-to-r from-yellow-400/20 to-amber-400/20',
          border: 'border-yellow-400/50',
        };
      case 2:
        return {
          icon: <Medal className="w-5 h-5 text-slate-400" />,
          bg: 'bg-gradient-to-r from-slate-300/20 to-slate-400/20',
          border: 'border-slate-400/50',
        };
      case 3:
        return {
          icon: <Medal className="w-5 h-5 text-amber-600" />,
          bg: 'bg-gradient-to-r from-amber-600/20 to-orange-500/20',
          border: 'border-amber-600/50',
        };
      default:
        return {
          icon: <span className="text-sm font-bold text-neo-white/70">#{rank}</span>,
          bg: '',
          border: 'border-transparent',
        };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader size="lg" />
        <p className="text-sm font-bold text-neo-white/70">
          {t('leaderboard.loading') || 'Loading leaderboard...'}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="w-12 h-12 text-neo-red/70" />
        <p className="text-sm font-bold text-neo-red/70">
          {t('leaderboard.error') || 'Failed to load leaderboard'}
        </p>
        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-cyan bg-neo-cyan/20 text-neo-cyan font-bold text-sm hover:bg-neo-cyan/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('common.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Trophy className="w-12 h-12 text-neo-lime/50" />
        <p className="text-sm font-bold text-neo-white/70 text-center">
          {t('leaderboard.empty') || 'No scores yet. Be the first to play!'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* User's rank highlight (if not in top entries) */}
      {userRank && userRank > limit && (
        <div className="mb-2 p-3 rounded-neo border-2 border-neo-lime/50 bg-neo-lime/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-neo-lime" />
              <span className="text-sm font-bold text-neo-white">
                {t('leaderboard.yourRank') || 'Your Rank'}
              </span>
            </div>
            <span className="text-lg font-black text-neo-lime">#{userRank}</span>
          </div>
        </div>
      )}

      {/* Leaderboard entries */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {entries.map((entry, index) => {
            const isCurrentUser = entry.guest_fingerprint === currentFingerprint;
            const rankDisplay = getRankDisplay(entry.rank);

            return (
              <motion.div
                key={entry.guest_fingerprint}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-neo border-2 transition-all',
                  rankDisplay.bg,
                  rankDisplay.border,
                  isCurrentUser
                    ? 'border-neo-lime bg-neo-lime/15 ring-2 ring-neo-lime/30'
                    : 'border-neo-black/20 bg-neo-black/10 hover:bg-neo-black/20'
                )}
              >
                {/* Rank */}
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  {rankDisplay.icon}
                </div>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 border-neo-black/30 flex-shrink-0"
                  style={{ backgroundColor: entry.avatar_color }}
                >
                  {entry.avatar_emoji}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-bold text-sm truncate',
                        isCurrentUser ? 'text-neo-lime' : 'text-neo-white'
                      )}
                    >
                      {entry.username}
                    </span>
                    {isCurrentUser && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-neo-lime/20 text-neo-lime rounded">
                        {t('leaderboard.you') || 'You'}
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <div className="flex items-center gap-3 text-xs text-neo-white/60">
                      <span>
                        {entry.games_played} {t('leaderboard.games') || 'games'}
                      </span>
                      {entry.longest_word && (
                        <span className="truncate">
                          {t('leaderboard.best') || 'Best'}: {entry.longest_word}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <div
                    className={cn(
                      'font-black text-lg',
                      isCurrentUser ? 'text-neo-lime' : 'text-neo-white'
                    )}
                  >
                    {entry.total_score.toLocaleString()}
                  </div>
                  {!compact && (
                    <div className="text-xs text-neo-white/50">
                      {t('leaderboard.totalPoints') || 'total pts'}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Refresh button */}
      <button
        onClick={fetchLeaderboard}
        disabled={loading}
        className="mt-2 flex items-center justify-center gap-2 py-2 text-xs font-bold text-neo-white/50 hover:text-neo-white/70 transition-colors"
      >
        <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        {t('leaderboard.refresh') || 'Refresh'}
      </button>
    </div>
  );
}

export default GlobalLeaderboard;
