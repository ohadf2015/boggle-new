'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, ChevronDown, ChevronUp, Sparkles, Crown, Calendar } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getRankDisplay } from '@/utils/rankingStyles';
import { formatDistanceToNow, getCountryFlag } from '@/shared/utils';
import Avatar from '@/components/Avatar';
import type { Language } from '@/types';

// ==========================================
// Types
// ==========================================

export interface DailyParticipant {
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string | null;
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

export interface AllTimeParticipant {
  player_id: string | null;
  guest_fingerprint: string | null;
  player_identifier: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string | null;
  profile_picture_url?: string | null;
  country_code?: string | null;
  total_efficiency_score: number;
  total_games: number;       // Number of challenges played
  games_won: number;         // Number of challenges solved
  avg_attempts: number | null;
  best_efficiency: number;   // Best efficiency score
  last_played_at: string;
  rank_position: number;
}

type LeaderboardTab = 'today' | 'alltime';

interface TabbedDailyLeaderboardProps {
  puzzleDate: string;
  language: Language;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  onParticipantCountChange?: (count: number) => void;
  onCurrentUserRankChange?: (rank: number | null) => void;
  compact?: boolean;
  maxVisible?: number;
  t: (key: string) => string;
  defaultTab?: LeaderboardTab;
}

// ==========================================
// Today's Participant Row
// ==========================================

const TodayParticipantRow = memo<{
  participant: DailyParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: (key: string) => string;
}>(({ participant, index, isCurrentUser, compact, t }) => {
  const rank = participant.rank_position;
  const countryFlag = getCountryFlag(participant.country_code);

  // Format time since completion
  const timeAgo = formatDistanceToNow(participant.completed_at, t);

  // Enhanced rank colors for better contrast
  const getRankColors = () => {
    if (isCurrentUser) {
      return 'bg-gradient-to-r from-neo-cyan/40 to-neo-cyan/20 border-neo-cyan shadow-[0_0_12px_rgba(0,255,255,0.3)] ring-2 ring-neo-cyan/60';
    }
    if (rank === 1) {
      return 'bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/20 border-amber-400 dark:border-amber-400';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-slate-100 to-gray-50 dark:from-slate-700/60 dark:to-slate-800/40 border-slate-400 dark:border-slate-400';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-orange-100 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/20 border-orange-400 dark:border-orange-500';
    }
    return 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500';
  };

  // Rank badge colors - high contrast for WCAG AA compliance
  const getRankBadgeColors = () => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-400 text-amber-900 border-amber-500';
    if (rank === 2) return 'bg-gradient-to-br from-slate-400 to-slate-500 text-white border-slate-600';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-500 text-orange-900 border-orange-600';
    return 'bg-slate-600 dark:bg-slate-600 text-white dark:text-slate-100 border-slate-500 dark:border-slate-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
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
        <div className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-neo-black/80 shadow-sm rounded-xl overflow-hidden">
          <Avatar
            profilePictureUrl={participant.profile_picture_url ?? undefined}
            avatarImage={participant.avatar_image ?? undefined}
            size="md"
            className="w-full h-full"
          />
        </div>
        {/* Country Flag Badge */}
        {countryFlag && (
          <div className="absolute -bottom-1 -right-1 text-sm sm:text-base drop-shadow-sm" title={participant.country_code || undefined}>
            {countryFlag}
          </div>
        )}
      </div>

      {/* Name & Stats */}
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
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-tier-gold shrink-0 animate-pulse" />
          )}
        </div>
        <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
          <span className={`font-bold ${participant.solved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {participant.solved ? `✓ ${participant.attempts_used}/10` : `✗ X/10`}
          </span>
          {/* Show efficiency score */}
          {participant.efficiency_score !== undefined && participant.efficiency_score > 0 && (
            <>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">
                {participant.efficiency_score} {t('wordHunt.leaderboard.pts')}
              </span>
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

TodayParticipantRow.displayName = 'TodayParticipantRow';

// ==========================================
// All-Time Participant Row
// ==========================================

const AllTimeParticipantRow = memo<{
  participant: AllTimeParticipant;
  index: number;
  isCurrentUser: boolean;
  compact: boolean;
  t: (key: string) => string;
}>(({ participant, index, isCurrentUser, compact, t }) => {
  const rank = participant.rank_position;
  const countryFlag = getCountryFlag(participant.country_code);

  // Enhanced rank colors
  const getRankColors = () => {
    if (isCurrentUser) {
      return 'bg-gradient-to-r from-neo-cyan/40 to-neo-cyan/20 border-neo-cyan shadow-[0_0_12px_rgba(0,255,255,0.3)] ring-2 ring-neo-cyan/60';
    }
    if (rank === 1) {
      return 'bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/20 border-amber-400 dark:border-amber-400';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-slate-100 to-gray-50 dark:from-slate-700/60 dark:to-slate-800/40 border-slate-400 dark:border-slate-400';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-orange-100 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/20 border-orange-400 dark:border-orange-500';
    }
    return 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500';
  };

  // Rank badge colors - high contrast for WCAG AA compliance
  const getRankBadgeColors = () => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-yellow-400 text-amber-900 border-amber-500';
    if (rank === 2) return 'bg-gradient-to-br from-slate-400 to-slate-500 text-white border-slate-600';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-amber-500 text-orange-900 border-orange-600';
    return 'bg-slate-600 dark:bg-slate-600 text-white dark:text-slate-100 border-slate-500 dark:border-slate-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
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
        <div className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-neo-black/80 shadow-sm rounded-xl overflow-hidden">
          <Avatar
            profilePictureUrl={participant.profile_picture_url ?? undefined}
            avatarImage={participant.avatar_image ?? undefined}
            size="md"
            className="w-full h-full"
          />
        </div>
        {/* Country Flag Badge */}
        {countryFlag && (
          <div className="absolute -bottom-1 -right-1 text-sm sm:text-base drop-shadow-sm" title={participant.country_code || undefined}>
            {countryFlag}
          </div>
        )}
      </div>

      {/* Name & Stats */}
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
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="text-xs sm:text-sm flex items-center gap-2 mt-0.5">
          {/* Total efficiency score - primary stat */}
          <span className="font-black text-purple-600 dark:text-purple-400">
            {participant.total_efficiency_score} {t('wordHunt.leaderboard.pts')}
          </span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          {/* Challenges solved */}
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {participant.games_won}/{participant.total_games} {t('wordHunt.leaderboard.solved')}
          </span>
        </div>
      </div>

      {/* Best Score Badge */}
      {!compact && (
        <div className="hidden sm:flex flex-col items-end text-xs">
          <div className="text-slate-500 dark:text-slate-400">{t('wordHunt.leaderboard.best')}</div>
          <div className="font-bold text-purple-600 dark:text-purple-400">{participant.best_efficiency}</div>
        </div>
      )}
    </motion.div>
  );
});

AllTimeParticipantRow.displayName = 'AllTimeParticipantRow';

// ==========================================
// Skeleton Loading Row
// ==========================================

const SkeletonRow = memo<{ index: number }>(({ index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
  >
    {/* Rank skeleton */}
    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
    {/* Avatar skeleton */}
    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
    {/* Name & stats skeleton */}
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  </motion.div>
));

SkeletonRow.displayName = 'SkeletonRow';

// ==========================================
// Tabs Component (Always Visible)
// ==========================================

const LeaderboardTabs = memo<{
  activeTab: LeaderboardTab;
  onTabChange: (tab: LeaderboardTab) => void;
  t: (key: string) => string;
}>(({ activeTab, onTabChange, t }) => (
  <div className="flex justify-center">
    <ToggleGroup
      type="single"
      value={activeTab}
      onValueChange={(value) => value && onTabChange(value as LeaderboardTab)}
      className="bg-slate-100 dark:bg-slate-800 p-1 rounded-neo border-2 border-neo-black"
    >
      <ToggleGroupItem value="today" size="sm" className="text-xs px-3">
        <Calendar className="w-3.5 h-3.5 me-1.5" />
        {t('wordHunt.leaderboard.today')}
      </ToggleGroupItem>
      <ToggleGroupItem value="alltime" size="sm" className="text-xs px-3">
        <Crown className="w-3.5 h-3.5 me-1.5" />
        {t('wordHunt.leaderboard.allTime')}
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
));

LeaderboardTabs.displayName = 'LeaderboardTabs';

// ==========================================
// Main Component
// ==========================================

const TabbedDailyLeaderboard: React.FC<TabbedDailyLeaderboardProps> = ({
  puzzleDate,
  language,
  currentPlayerId,
  currentGuestFingerprint,
  onParticipantCountChange,
  onCurrentUserRankChange,
  compact = false,
  maxVisible = 10,
  t,
  defaultTab = 'today',
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(defaultTab);

  // Today's leaderboard state
  const [todayParticipants, setTodayParticipants] = useState<DailyParticipant[]>([]);
  const [todayTotalCount, setTodayTotalCount] = useState(0);
  const [todayTotalSolved, setTodayTotalSolved] = useState(0);
  const [todayGuestCount, setTodayGuestCount] = useState(0);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  // All-time leaderboard state
  const [allTimeParticipants, setAllTimeParticipants] = useState<AllTimeParticipant[]>([]);
  const [allTimeTotalCount, setAllTimeTotalCount] = useState(0);
  const [allTimeLoading, setAllTimeLoading] = useState(true);
  const [allTimeError, setAllTimeError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);

  // Fetch today's leaderboard
  const fetchTodayLeaderboard = useCallback(async () => {
    // Guard against empty puzzleDate
    if (!puzzleDate) {
      return;
    }

    try {
      setTodayLoading(true);
      setTodayError(null);

      // Use API endpoint for reliable server-side data fetching
      const url = `/api/daily-challenge/word-hunt/leaderboard/${puzzleDate}/${language}?limit=50`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TabbedDailyLeaderboard] API error:', response.status, errorText);
        throw new Error('Failed to fetch leaderboard');
      }

      const responseData = await response.json();
      const data = responseData.data || [];
      // Use totalPlayers for ALL who attempted, totalSolved for ALL who solved (including guests)
      const totalPlayers = responseData.totalPlayers || responseData.totalParticipants || 0;
      const totalSolved = responseData.totalSolved || 0;
      const guestCount = responseData.guestPlayerCount || 0;

      setTodayParticipants(data);
      setTodayTotalCount(totalPlayers);
      setTodayTotalSolved(totalSolved);
      setTodayGuestCount(guestCount);

      if (onParticipantCountChange && activeTab === 'today') {
        onParticipantCountChange(totalPlayers);
      }
    } catch (err) {
      console.error('Failed to fetch today leaderboard:', err);
      setTodayError('Failed to load leaderboard');
    } finally {
      setTodayLoading(false);
    }
  }, [puzzleDate, language, onParticipantCountChange, activeTab]);

  // Fetch all-time leaderboard
  const fetchAllTimeLeaderboard = useCallback(async () => {
    try {
      setAllTimeLoading(true);
      setAllTimeError(null);

      // Use API endpoint for reliable server-side data fetching
      const url = `/api/daily-challenge/word-hunt/alltime-leaderboard/${language}?limit=50`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TabbedDailyLeaderboard] All-time API error:', response.status, errorText);
        throw new Error('Failed to fetch all-time leaderboard');
      }

      const responseData = await response.json();
      const data = responseData.data || [];
      const totalParticipants = responseData.totalParticipants || 0;

      setAllTimeParticipants(data);
      setAllTimeTotalCount(totalParticipants);

      if (onParticipantCountChange && activeTab === 'alltime') {
        onParticipantCountChange(totalParticipants);
      }
    } catch (err) {
      console.error('Failed to fetch all-time leaderboard:', err);
      setAllTimeError('Failed to load leaderboard');
    } finally {
      setAllTimeLoading(false);
    }
  }, [language, onParticipantCountChange, activeTab]);

  // Initial fetch and polling
  useEffect(() => {
    fetchTodayLeaderboard();
    fetchAllTimeLeaderboard();

    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        fetchTodayLeaderboard();
        fetchAllTimeLeaderboard();
      }, 30000);
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
        fetchTodayLeaderboard();
        fetchAllTimeLeaderboard();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTodayLeaderboard, fetchAllTimeLeaderboard]);

  // Check if current user is in today's list
  const isCurrentUserToday = (participant: DailyParticipant) => {
    if (currentPlayerId && participant.player_id === currentPlayerId) return true;
    if (currentGuestFingerprint && participant.guest_fingerprint === currentGuestFingerprint) return true;
    return false;
  };

  // Check if current user is in all-time list
  const isCurrentUserAllTime = (participant: AllTimeParticipant) => {
    if (currentPlayerId && participant.player_id === currentPlayerId) return true;
    if (currentGuestFingerprint && participant.guest_fingerprint === currentGuestFingerprint) return true;
    return false;
  };

  // Find current user's position in today's list
  const currentUserTodayIndex = todayParticipants.findIndex(isCurrentUserToday);
  const currentUserTodayData = currentUserTodayIndex >= 0 ? todayParticipants[currentUserTodayIndex] : null;

  // Report current user's rank to parent
  useEffect(() => {
    if (onCurrentUserRankChange && activeTab === 'today') {
      onCurrentUserRankChange(currentUserTodayData?.rank_position ?? null);
    }
  }, [currentUserTodayData?.rank_position, onCurrentUserRankChange, activeTab]);

  // Get current data based on active tab
  // Filter all-time participants to only show those who have solved at least one challenge
  // to avoid "shaming" users who attempted but never solved
  const filteredAllTimeParticipants = allTimeParticipants.filter(p => p.games_won > 0);
  const participants = activeTab === 'today' ? todayParticipants : filteredAllTimeParticipants;
  const totalCount = activeTab === 'today' ? todayTotalCount : allTimeTotalCount;
  const totalSolvedCount = activeTab === 'today' ? todayTotalSolved : 0;
  const loading = activeTab === 'today' ? todayLoading : allTimeLoading;
  const error = activeTab === 'today' ? todayError : allTimeError;

  // Determine which participants to show
  const visibleParticipants = expanded
    ? participants
    : participants.slice(0, maxVisible);

  const hasMore = participants.length > maxVisible;
  const isLoading = loading && participants.length === 0;
  const isEmpty = !loading && participants.length === 0;

  // Render content based on state
  const renderContent = () => {
    // Loading state - show skeleton rows
    if (isLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: Math.min(maxVisible, 3) }).map((_, index) => (
            <SkeletonRow key={`skeleton-${index}`} index={index} />
          ))}
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="text-center text-red-500 py-4 text-sm">
          {error}
          <button
            onClick={activeTab === 'today' ? fetchTodayLeaderboard : fetchAllTimeLeaderboard}
            className="block mx-auto mt-2 text-neo-cyan underline"
          >
            {t('common.retry')}
          </button>
        </div>
      );
    }

    // Empty state
    if (isEmpty) {
      return (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm sm:text-base">
            {activeTab === 'today' ? t('daily.beFirstToPlay') : t('wordHunt.leaderboard.noPlayersYet')}
          </p>
        </div>
      );
    }

    // Participants list
    return (
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {activeTab === 'today' ? (
            (visibleParticipants as DailyParticipant[]).map((participant, index) => (
              <TodayParticipantRow
                key={participant.player_id || participant.guest_fingerprint || index}
                participant={participant}
                index={index}
                isCurrentUser={isCurrentUserToday(participant)}
                compact={compact}
                t={t}
              />
            ))
          ) : (
            (visibleParticipants as AllTimeParticipant[]).map((participant, index) => (
              <AllTimeParticipantRow
                key={participant.player_identifier || index}
                participant={participant}
                index={index}
                isCurrentUser={isCurrentUserAllTime(participant)}
                compact={compact}
                t={t}
              />
            ))
          )}
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
                {t('daily.showMore')} ({participants.length - maxVisible} {t('daily.more')})
              </>
            )}
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`
        bg-white/95 dark:bg-slate-800/95
        rounded-2xl border-2 border-slate-200 dark:border-slate-700
        ${compact ? 'p-3' : 'p-4 sm:p-5'}
        shadow-lg backdrop-blur-sm
      `}
    >
      {/* Header - always visible */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl border-2 border-indigo-600 shadow-md">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-base sm:text-lg uppercase tracking-wide text-slate-800 dark:text-white">
            {t('wordHunt.leaderboard.title')}
          </h3>
          {!isLoading && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium truncate">
              {activeTab === 'today' && totalCount > 0 ? (
                <>
                  <span>{totalCount} {t('wordHunt.leaderboard.played')}</span>
                  <span className="mx-1.5">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{totalSolvedCount} {t('wordHunt.leaderboard.solved')}</span>
                  {todayGuestCount > 0 && (
                    <>
                      <span className="mx-1.5">•</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {todayGuestCount} {todayGuestCount === 1 ? t('daily.guestSingular') : t('daily.guestsPlural')}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>{totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Tabs - always visible, outside loading area */}
      <div className="mb-4">
        <LeaderboardTabs activeTab={activeTab} onTabChange={setActiveTab} t={t} />
      </div>

      {/* Content area - loading/empty/participants */}
      {renderContent()}
    </motion.div>
  );
};

export default memo(TabbedDailyLeaderboard);
