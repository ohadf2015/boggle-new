'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { getRankDisplay, getRankBgColor } from '@/utils/rankingStyles';
import type { Language } from '@/types';

// Simple relative time formatter
function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// ==========================================
// Types
// ==========================================

export interface DailyParticipant {
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  score: number;
  word_count: number;
  time_seconds: number;
  completed_at: string;
  rank_position: number;
}

interface DailyLeaderboardProps {
  puzzleDate: string;
  language: Language;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  onParticipantCountChange?: (count: number) => void;
  compact?: boolean;
  maxVisible?: number;
  t: (key: string) => string;
}

// ==========================================
// Helper Components
// ==========================================

const ParticipantRow = memo<{
  participant: DailyParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
}>(({ participant, index, isCurrentUser, compact }) => {
  const rank = participant.rank_position;
  const isTopThree = rank <= 3;

  // Format time since completion
  const timeAgo = formatDistanceToNow(participant.completed_at);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`
        flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-neo border-2 sm:border-3 transition-all
        ${isCurrentUser
          ? 'bg-neo-cyan/30 border-neo-cyan shadow-hard-sm ring-2 ring-neo-cyan/50'
          : isTopThree
            ? getRankBgColor(rank, false)
            : 'bg-white/80 dark:bg-slate-700/80 border-neo-black/20 dark:border-slate-500'
        }
        ${compact ? 'py-1.5' : ''}
      `}
    >
      {/* Rank */}
      <div
        className={`
          w-8 h-8 sm:w-10 sm:h-10 rounded-neo flex items-center justify-center font-black text-sm sm:text-base
          ${isTopThree
            ? 'bg-neo-black text-white'
            : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200'
          }
          border-2 border-neo-black dark:border-slate-500
        `}
      >
        {getRankDisplay(rank)}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-neo flex items-center justify-center text-lg sm:text-xl border-2 border-neo-black"
        style={{ backgroundColor: participant.avatar_color || '#FFE135' }}
      >
        {participant.avatar_emoji || '🎯'}
      </div>

      {/* Name & Score */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold truncate text-sm sm:text-base text-neo-black dark:text-white ${isCurrentUser ? 'text-neo-cyan dark:text-neo-cyan' : ''}`}>
            {participant.display_name || 'Player'}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-white px-1.5 py-0.5 rounded font-bold shrink-0">
              YOU
            </span>
          )}
          {rank === 1 && (
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-neo-yellow shrink-0" />
          )}
        </div>
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <span className="font-bold">{participant.score} pts</span>
          <span className="text-gray-400">|</span>
          <span>{participant.word_count} words</span>
        </div>
      </div>

      {/* Time */}
      {!compact && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
      )}
    </motion.div>
  );
});

ParticipantRow.displayName = 'ParticipantRow';

// ==========================================
// Main Component
// ==========================================

const DailyLeaderboard: React.FC<DailyLeaderboardProps> = ({
  puzzleDate,
  language,
  currentPlayerId,
  currentGuestFingerprint,
  onParticipantCountChange,
  compact = false,
  maxVisible = 10,
  t,
}) => {
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/daily-challenge/leaderboard/${puzzleDate}/${language}?limit=50`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setParticipants(data.data || []);
      setTotalCount(data.totalParticipants || 0);

      if (onParticipantCountChange) {
        onParticipantCountChange(data.totalParticipants || 0);
      }
    } catch (err) {
      console.error('Failed to fetch daily leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [puzzleDate, language, onParticipantCountChange]);

  // Initial fetch and polling
  useEffect(() => {
    fetchLeaderboard();

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Check if current user is in the list
  const isCurrentUser = (participant: DailyParticipant) => {
    if (currentPlayerId && participant.player_id === currentPlayerId) return true;
    if (currentGuestFingerprint && participant.guest_fingerprint === currentGuestFingerprint) return true;
    return false;
  };

  // Find current user's position
  const currentUserIndex = participants.findIndex(isCurrentUser);

  // Determine which participants to show
  const visibleParticipants = expanded
    ? participants
    : participants.slice(0, maxVisible);

  const hasMore = participants.length > maxVisible;

  // Empty state
  if (!loading && participants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          bg-white/90 dark:bg-neo-navy-light/90 rounded-neo border-3 border-neo-black dark:border-white/20
          ${compact ? 'p-3' : 'p-4 sm:p-5'}
          shadow-hard-sm
        `}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-neo-purple" />
          <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-neo-black dark:text-white">
            {t('daily.todaysPlayers')}
          </h3>
        </div>
        <p className="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">
          {t('daily.beFirstToPlay')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-white/90 dark:bg-neo-navy-light/90 rounded-neo border-3 border-neo-black dark:border-white/20
        ${compact ? 'p-3' : 'p-4 sm:p-5'}
        shadow-hard-sm
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-neo-purple rounded-neo border-2 border-neo-black">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-neo-yellow" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-neo-black dark:text-white">
              {t('daily.todaysPlayers')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}
            </p>
          </div>
        </div>

        {/* Current user's rank badge (if not in visible list) */}
        {currentUserIndex >= maxVisible && !expanded && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 px-2 py-1 bg-neo-cyan/20 border-2 border-neo-cyan rounded-neo"
          >
            <span className="text-xs font-bold text-neo-cyan">
              {t('daily.yourRank')}: #{currentUserIndex + 1}
            </span>
          </motion.div>
        )}
      </div>

      {/* Loading state */}
      {loading && participants.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-3 border-neo-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center text-red-500 py-4 text-sm">
          {error}
          <button
            onClick={fetchLeaderboard}
            className="block mx-auto mt-2 text-neo-cyan underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Participants list */}
      {!error && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {visibleParticipants.map((participant, index) => (
              <ParticipantRow
                key={participant.player_id || participant.guest_fingerprint || index}
                participant={participant}
                index={index}
                isCurrentUser={isCurrentUser(participant)}
                compact={compact}
              />
            ))}
          </AnimatePresence>

          {/* Show more/less button */}
          {hasMore && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 text-sm font-bold text-neo-purple hover:text-neo-purple/80 flex items-center justify-center gap-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t('daily.showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('daily.showMore')} ({participants.length - maxVisible} {t('daily.more')})
                </>
              )}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default memo(DailyLeaderboard);
