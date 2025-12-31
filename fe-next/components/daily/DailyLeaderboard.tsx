'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Clock, ChevronDown, ChevronUp, Sparkles, Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRankDisplay } from '@/utils/rankingStyles';
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
  profile_picture_url?: string | null;
  country_code?: string | null;
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

// Country code to flag emoji converter
function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface DailyLeaderboardProps {
  puzzleDate: string;
  language: Language;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  onParticipantCountChange?: (count: number) => void;
  /** Callback when current user's rank is determined (1-based rank, null if not found) */
  onCurrentUserRankChange?: (rank: number | null) => void;
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
  const countryFlag = getCountryFlag(participant.country_code);

  // Format time since completion
  const timeAgo = formatDistanceToNow(participant.completed_at, t);

  // Enhanced rank colors for better contrast
  const getRankColors = () => {
    if (isCurrentUser) {
      return 'bg-gradient-to-r from-neo-cyan/40 to-neo-cyan/20 border-neo-cyan shadow-[0_0_12px_rgba(0,255,255,0.3)] ring-2 ring-neo-cyan/60';
    }
    if (rank === 1) {
      return 'bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/20 border-amber-400 dark:border-amber-500';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-slate-100 to-gray-50 dark:from-slate-700/60 dark:to-slate-800/40 border-slate-400 dark:border-slate-400';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-orange-100 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/20 border-orange-400 dark:border-orange-500';
    }
    return 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500';
  };

  // Rank badge colors
  const getRankBadgeColors = () => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900 border-amber-600';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-gray-400 text-slate-800 border-slate-500';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-500 text-orange-900 border-orange-600';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`
        flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 transition-all duration-200
        ${getRankColors()}
        ${compact ? 'py-2' : ''}
        ${isCurrentUser ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Rank Badge */}
      <div
        className={`
          w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm sm:text-base
          ${getRankBadgeColors()}
          border-2 shadow-sm
        `}
      >
        {getRankDisplay(rank)}
      </div>

      {/* Avatar with Country Flag */}
      <div className="relative">
        {participant.profile_picture_url ? (
          <img
            src={participant.profile_picture_url}
            alt={participant.display_name || 'Player'}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover border-2 border-neo-black/80 shadow-sm"
          />
        ) : (
          <div
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl border-2 border-neo-black/80 shadow-sm"
            style={{ backgroundColor: participant.avatar_color || '#FFE135' }}
          >
            {participant.avatar_emoji || '🎯'}
          </div>
        )}
        {/* Country Flag Badge */}
        {countryFlag && (
          <div className="absolute -bottom-1 -right-1 text-sm sm:text-base drop-shadow-sm" title={participant.country_code || undefined}>
            {countryFlag}
          </div>
        )}
      </div>

      {/* Name & Score */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-bold truncate text-sm sm:text-base ${isCurrentUser ? 'text-neo-cyan dark:text-neo-cyan' : 'text-slate-800 dark:text-white'}`}>
            {participant.display_name || 'Player'}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] sm:text-xs bg-neo-cyan text-neo-black px-2 py-0.5 rounded-full font-black shrink-0 shadow-sm animate-pulse">
              YOU
            </span>
          )}
          {rank === 1 && (
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 animate-pulse" />
          )}
        </div>
        <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
          {gameType === 'wordHunt' ? (
            <>
              <span className={`font-bold ${participant.solved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                {participant.solved ? `✓ ${t('wordHunt.leaderboard.solved')}` : `✗ ${t('wordHunt.leaderboard.failed')}`}
              </span>
              {participant.solved && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">•</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{participant.attempts_used} {t('wordHunt.leaderboard.attempts')}</span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{participant.score} {t('wordHunt.leaderboard.pts')}</span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">{participant.word_count} {t('wordHunt.leaderboard.words')}</span>
            </>
          )}
        </div>
      </div>

      {/* Time */}
      {!compact && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-700/50 px-2 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
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
  onCurrentUserRankChange,
  compact = false,
  maxVisible = 10,
  t,
  gameType = 'wordHunt',
}) => {
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
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
      console.log('Leaderboard data:', { url, date: puzzleDate, language, gameType, participants: data.data?.length, total: data.totalParticipants, totalAttempts: data.totalAttempts });
      setParticipants(data.data || []);
      setTotalCount(data.totalParticipants || 0);
      setTotalAttempts(data.totalAttempts || 0);

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

  // Initial fetch and polling - pause when tab is not visible
  useEffect(() => {
    fetchLeaderboard();

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      // Poll every 30 seconds for updates
      interval = setInterval(fetchLeaderboard, 30000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Refresh data when tab becomes visible again
        fetchLeaderboard();
        startPolling();
      }
    };

    // Start polling initially
    startPolling();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Report current user's rank to parent component
  useEffect(() => {
    if (onCurrentUserRankChange) {
      onCurrentUserRankChange(currentUserData?.rank_position ?? null);
    }
  }, [currentUserData?.rank_position, onCurrentUserRankChange]);

  // Generate shareable link with OG image
  const handleShareRank = useCallback(async () => {
    if (!currentUserData) return;

    const puzzleNumber = getPuzzleNumber(puzzleDate);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Generate OG image URL - handle both puzzle mode (score/words) and Word Hunt mode (solved/attempts)
    const ogParams = new URLSearchParams({
      rank: String(currentUserData.rank_position ?? 0),
      displayName: currentUserData.display_name || 'Player',
      avatarEmoji: currentUserData.avatar_emoji || '🎯',
      puzzleNumber: String(puzzleNumber),
    });

    // Add game-type specific fields
    if (gameType === 'wordHunt') {
      ogParams.set('solved', String(currentUserData.solved ?? false));
      ogParams.set('attemptsUsed', String(currentUserData.attempts_used ?? 0));
    } else {
      ogParams.set('score', String(currentUserData.score ?? 0));
      ogParams.set('wordCount', String(currentUserData.word_count ?? 0));
    }

    const shareUrl = `${origin}/${language}/daily?share=${encodeURIComponent(ogParams.toString())}`;

    // Build share text based on game type
    const shareText = gameType === 'wordHunt'
      ? `🎯 I ranked #${currentUserData.rank_position} on LexiClash Word Hunt #${puzzleNumber}! ${currentUserData.solved ? `Solved in ${currentUserData.attempts_used}/10` : 'X/10'}\n\n`
      : `🎯 I ranked #${currentUserData.rank_position} on LexiClash Daily #${puzzleNumber}! ${currentUserData.score ?? 0} pts | ${currentUserData.word_count ?? 0} words\n\n`;

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

  // Filter out guests - only show authenticated users on leaderboard
  // For Word Hunt, also filter out failed attempts (only show solved)
  const authenticatedParticipants = participants.filter(p => {
    if (p.player_id === null) return false; // Filter out guests
    if (gameType === 'wordHunt' && !p.solved) return false; // Filter out failed attempts in Word Hunt
    return true;
  });

  // Determine which participants to show
  const visibleParticipants = expanded
    ? authenticatedParticipants
    : authenticatedParticipants.slice(0, maxVisible);

  const hasMore = authenticatedParticipants.length > maxVisible;

  // Empty state - no authenticated players on leaderboard (may have guests)
  if (!loading && authenticatedParticipants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95
          rounded-2xl border-2 border-slate-200 dark:border-slate-700
          ${compact ? 'p-3' : 'p-4 sm:p-5'}
          shadow-lg backdrop-blur-sm
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl border-2 border-indigo-600 shadow-md">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg uppercase tracking-wide text-slate-800 dark:text-white">
              {t('daily.todaysPlayers')}
            </h3>
            {totalAttempts > 0 && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                {totalAttempts} {totalAttempts === 1 ? t('daily.playerSingular') : t('daily.playersPlural')} {t('daily.tookChallenge') || 'took the challenge'}
              </p>
            )}
          </div>
        </div>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm sm:text-base">
            {totalAttempts > 0
              ? (t('daily.signUpToAppear') || 'Sign up to appear on the leaderboard!')
              : t('daily.beFirstToPlay')}
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
        bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95
        rounded-2xl border-2 border-slate-200 dark:border-slate-700
        ${compact ? 'p-3' : 'p-4 sm:p-5'}
        shadow-lg backdrop-blur-sm
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl border-2 border-indigo-600 shadow-md">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg uppercase tracking-wide text-slate-800 dark:text-white">
              {t('daily.todaysPlayers')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
              {totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}
              {totalAttempts > totalCount && (
                <span className="text-slate-500 dark:text-slate-500">
                  {' '}• {totalAttempts} {t('daily.totalAttempts') || 'total attempts'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Share Rank Button */}
        {currentUserData && (
          <Button
            onClick={handleShareRank}
            size="sm"
            className="px-3 py-1 h-8 bg-neo-purple hover:bg-neo-purple/90 text-white border-2 border-neo-black rounded-xl shadow-sm hover:-translate-y-0.5 transition-all"
            aria-label="Share your rank"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Current User Position Card - Shows when user is not in visible list */}
      {currentUserData && currentUserIndex >= maxVisible && !expanded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 rounded-xl bg-gradient-to-r from-neo-cyan/30 to-neo-cyan/10 border-2 border-neo-cyan shadow-[0_0_15px_rgba(0,255,255,0.2)]"
        >
          <div className="flex items-center gap-3">
            {/* Your Rank Badge */}
            <div className="w-12 h-12 rounded-xl bg-neo-cyan/30 border-2 border-neo-cyan flex items-center justify-center">
              <span className="font-black text-lg text-neo-cyan">#{currentUserData.rank_position}</span>
            </div>

            {/* Your Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neo-cyan uppercase tracking-wider">{t('daily.yourPosition')}</span>
                <span className="text-[10px] bg-neo-cyan text-neo-black px-2 py-0.5 rounded-full font-black animate-pulse">
                  YOU
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {currentUserData.profile_picture_url ? (
                  <img
                    src={currentUserData.profile_picture_url}
                    alt={currentUserData.display_name || 'Player'}
                    className="w-6 h-6 rounded-lg object-cover border border-neo-black/50"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-sm border border-neo-black/50"
                    style={{ backgroundColor: currentUserData.avatar_color || '#FFE135' }}
                  >
                    {currentUserData.avatar_emoji || '🎯'}
                  </div>
                )}
                <span className="font-bold text-slate-800 dark:text-white text-sm truncate">
                  {currentUserData.display_name || 'Player'}
                </span>
                {currentUserData.country_code && (
                  <span className="text-sm">{getCountryFlag(currentUserData.country_code)}</span>
                )}
              </div>
            </div>

            {/* Score/Status */}
            <div className="text-right">
              {gameType === 'wordHunt' ? (
                <div className={`font-bold text-sm ${currentUserData.solved ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {currentUserData.solved ? '✓ Solved' : '✗ Failed'}
                </div>
              ) : (
                <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {currentUserData.score} pts
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

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
              className="w-full mt-2 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-colors rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30 border border-indigo-200/50 dark:border-indigo-700/30"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t('daily.showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('daily.showMore')} ({authenticatedParticipants.length - maxVisible} {t('daily.more')})
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
