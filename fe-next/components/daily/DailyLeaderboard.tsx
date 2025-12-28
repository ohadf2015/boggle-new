'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Clock, ChevronDown, ChevronUp, Sparkles, Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRankDisplay, getRankBgColor } from '@/utils/rankingStyles';
import { getPuzzleNumber } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

// Simple relative time formatter with translation support
function formatDistanceToNow(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return t('wordHunt.leaderboard.justNow');
  if (diffMins < 60) return t('wordHunt.leaderboard.minutesAgo').replace('{count}', String(diffMins));
  if (diffHours < 24) return t('wordHunt.leaderboard.hoursAgo').replace('{count}', String(diffHours));
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
  // Word Hunt specific fields
  solved?: boolean;
  attempts_used?: number;
  efficiency_score?: number;
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
  gameType?: 'puzzle' | 'wordHunt';
}

// ==========================================
// Helper Components
// ==========================================

const ParticipantRow = memo<{
  participant: DailyParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  gameType: 'puzzle' | 'wordHunt';
  t: (key: string) => string;
}>(({ participant, index, isCurrentUser, compact, gameType, t }) => {
  const rank = participant.rank_position;
  const isTopThree = rank <= 3;

  // Format time since completion
  const timeAgo = formatDistanceToNow(participant.completed_at, t);

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
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-neo-black px-1.5 py-0.5 rounded font-bold shrink-0">
              YOU
            </span>
          )}
          {rank === 1 && (
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-neo-yellow shrink-0" />
          )}
        </div>
        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
          {gameType === 'wordHunt' ? (
            <>
              <span className={`font-bold ${participant.solved ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {participant.solved ? `✓ ${t('wordHunt.leaderboard.solved')}` : `✗ ${t('wordHunt.leaderboard.failed')}`}
              </span>
              <span className="text-gray-500 dark:text-gray-400">|</span>
              <span>{participant.attempts_used}/10 {t('wordHunt.leaderboard.attempts')}</span>
            </>
          ) : (
            <>
              <span className="font-bold">{participant.score} {t('wordHunt.leaderboard.pts')}</span>
              <span className="text-gray-500 dark:text-gray-400">|</span>
              <span>{participant.word_count} {t('wordHunt.leaderboard.words')}</span>
            </>
          )}
        </div>
      </div>

      {/* Time */}
      {!compact && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
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
  gameType = 'wordHunt',
}) => {
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the correct API endpoint based on game type
      const basePath = gameType === 'wordHunt'
        ? `/api/daily-challenge/word-hunt/leaderboard`
        : `/api/daily-challenge/leaderboard`;
      const url = `${basePath}/${puzzleDate}/${language}?limit=50`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Leaderboard API error:', response.status, errorText);
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      console.log('Leaderboard data:', { url, date: puzzleDate, language, gameType, participants: data.data?.length, total: data.totalParticipants });
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
  }, [puzzleDate, language, onParticipantCountChange, gameType]);

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
  const currentUserData = currentUserIndex >= 0 ? participants[currentUserIndex] : null;

  // Generate shareable link with OG image
  const handleShareRank = useCallback(async () => {
    if (!currentUserData) return;

    const puzzleNumber = getPuzzleNumber(puzzleDate);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Generate OG image URL
    const ogParams = new URLSearchParams({
      rank: currentUserData.rank_position.toString(),
      displayName: currentUserData.display_name,
      avatarEmoji: currentUserData.avatar_emoji,
      score: currentUserData.score.toString(),
      wordCount: currentUserData.word_count.toString(),
      puzzleNumber: puzzleNumber.toString(),
    });

    const shareUrl = `${origin}/${language}/daily?share=${encodeURIComponent(ogParams.toString())}`;
    const shareText = `🎯 I ranked #${currentUserData.rank_position} on LexiClash Daily #${puzzleNumber}! ${currentUserData.score} pts | ${currentUserData.word_count} words\n\n`;

    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `LexiClash Daily #${puzzleNumber}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through to copy
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [currentUserData, puzzleDate, language]);

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
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 sm:p-2 bg-neo-purple text-white rounded-neo border-2 border-neo-black">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-slate-800">
            {t('daily.todaysPlayers')}
          </h3>
        </div>
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-slate-700 font-bold text-sm sm:text-base">
            {t('daily.beFirstToPlay')}
          </p>
        </div>
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
          <div className="p-1.5 sm:p-2 bg-neo-purple text-white rounded-neo border-2 border-neo-black">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-neo-yellow" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-neo-black dark:text-white">
              {t('daily.todaysPlayers')}
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}
            </p>
          </div>
        </div>

        {/* Current user's rank badge and share button */}
        {currentUserData && (
          <div className="flex items-center gap-2">
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

            {/* Share Rank Button */}
            <Button
              onClick={handleShareRank}
              size="sm"
              className="px-2 py-1 h-8 bg-neo-purple hover:bg-neo-purple/90 text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
              aria-label="Share your rank"
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Share2 className="w-3 h-3" />
              )}
            </Button>
          </div>
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
                gameType={gameType}
                t={t}
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
