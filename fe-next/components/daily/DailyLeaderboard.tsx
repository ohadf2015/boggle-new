'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSafeInterval } from '@/hooks/useSafeTimeout';
import { m, AnimatePresence } from 'framer-motion';
import { Users, Trophy, ChevronDown, ChevronUp, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { getPuzzleNumber } from '@/utils/dailyChallenge';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { getCountryFlag } from '@/shared/utils';
import Avatar from '@/components/Avatar';
import type { Language } from '@/types';

import ParticipantRow from './DailyLeaderboardParticipantRow';
import VirtualizedParticipantList from './VirtualizedParticipantList';

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
  custom_avatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
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
  gameType?: 'puzzle' | 'wordHunt' | 'wordWheel';
}

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
  const [guestPlayerCount, setGuestPlayerCount] = useState(0);
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
        : gameType === 'wordWheel'
          ? `/api/daily-challenge/word-wheel/leaderboard`
          : `/api/daily-challenge/leaderboard`;
      const url = `${basePath}/${puzzleDate}/${language}?limit=50`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Leaderboard API error:', response.status, errorText);
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      // BUG-007: Wrap debug logs in dev check
      if (process.env.NODE_ENV === 'development') {
        console.log('Leaderboard data:', { url, date: puzzleDate, language, gameType, participants: data.data?.length, total: data.totalParticipants, totalAttempts: data.totalAttempts, guestPlayerCount: data.guestPlayerCount });
      }
      setParticipants(data.data || []);
      setTotalCount(data.totalParticipants || 0);
      setTotalAttempts(data.totalAttempts || 0);
      setGuestPlayerCount(data.guestPlayerCount || 0);

      if (onParticipantCountChange) {
        onParticipantCountChange(data.totalParticipants || 0);
      }
    } catch (err) {
      console.error('Failed to fetch daily leaderboard:', err);
      setError(t('errors.failedToLoadLeaderboard'));
    } finally {
      setLoading(false);
    }
  }, [puzzleDate, language, onParticipantCountChange, gameType, t]);

  // Initial fetch and polling - pause when tab is not visible
  const pollingInterval = useSafeInterval();

  useEffect(() => {
    fetchLeaderboard();

    const startPolling = () => {
      // Poll every 30 seconds for updates
      pollingInterval.start(fetchLeaderboard, 30000);
    };

    const stopPolling = () => {
      pollingInterval.stop();
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
  }, [fetchLeaderboard, pollingInterval]);

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

    // Add custom avatar image if available (for OG image rendering)
    if (currentUserData.avatar_image) {
      // Avatar image can be an ID like "broccoli-bob" or a filename like "broccoli-bob.png"
      const avatarFilename = currentUserData.avatar_image.endsWith('.png')
        ? currentUserData.avatar_image
        : `${currentUserData.avatar_image}.png`;
      ogParams.set('avatarImage', avatarFilename);
    }

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
    const gameLabel = gameType === 'wordHunt' ? 'Word Hunt'
      : gameType === 'wordWheel' ? 'Word Wheel'
      : 'Daily';
    const shareText = gameType === 'wordHunt'
      ? `🎯 I ranked #${currentUserData.rank_position} on LexiClash ${gameLabel} #${puzzleNumber}! ${currentUserData.solved ? `Solved in ${currentUserData.attempts_used}/10` : 'X/10'}\n\n`
      : `🎯 I ranked #${currentUserData.rank_position} on LexiClash ${gameLabel} #${puzzleNumber}! ${currentUserData.score ?? 0} pts | ${currentUserData.word_count ?? 0} words\n\n`;

    const result = await shareWithFallback({
      title: `LexiClash ${gameLabel} #${puzzleNumber}`,
      text: shareText,
      url: shareUrl,
      clipboardText: shareText + shareUrl,
    });

    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentUserData, puzzleDate, language, gameType]);

  // Filter out guests - only show authenticated users on leaderboard
  // For Word Hunt: only show authenticated players who SOLVED
  // For Puzzle: show all authenticated players
  const filteredParticipants = participants.filter(p => {
    if (p.player_id === null) return false; // Filter out guests
    if (gameType === 'wordHunt' && !p.solved) return false; // Filter out failed attempts in Word Hunt
    return true; // Show only authenticated players who succeeded
  });

  // Determine which participants to show
  const visibleParticipants = expanded
    ? filteredParticipants
    : filteredParticipants.slice(0, maxVisible);

  const hasMore = filteredParticipants.length > maxVisible;

  // Empty state - no successful players on leaderboard
  if (!loading && filteredParticipants.length === 0) {
    return (
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          bg-linear-to-br from-white/95 to-slate-50/95 dark:from-neo-navy/95 dark:to-neo-navy/90
          rounded-2xl border-2 border-slate-200 dark:border-slate-700
          ${compact ? 'p-3' : 'p-4 sm:p-5'}
          shadow-lg
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 sm:p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-xl border-2 border-indigo-600 shadow-md">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg uppercase tracking-wide text-slate-800 dark:text-white">
              {t('daily.todaysPlayers')}
            </h3>
            {(totalAttempts > 0 || guestPlayerCount > 0) && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                {totalAttempts} {totalAttempts === 1 ? t('daily.playerSingular') : t('daily.playersPlural')} {t('daily.tookChallenge')}
                {guestPlayerCount > 0 && (
                  <span className="text-slate-500 dark:text-slate-400">
                    {' '}({guestPlayerCount} {guestPlayerCount === 1 ? t('daily.guestSingular') : t('daily.guestsPlural')})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm sm:text-base">
            {totalAttempts > 0
              ? (t('daily.signUpToAppear'))
              : t('daily.beFirstToPlay')}
          </p>
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="region"
      aria-label={t('daily.todaysPlayers')}
      className={`
        bg-linear-to-br from-white/95 to-slate-50/95 dark:from-neo-navy/95 dark:to-neo-navy/90
        rounded-2xl border-2 border-slate-200 dark:border-slate-700
        ${compact ? 'p-3' : 'p-4 sm:p-5'}
        shadow-lg
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-xl border-2 border-indigo-600 shadow-md">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg uppercase tracking-wide text-slate-800 dark:text-white">
              {t('daily.todaysPlayers')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
              {totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}
              {guestPlayerCount > 0 && (
                <span className="text-slate-500 dark:text-slate-500">
                  {' '}• {guestPlayerCount} {guestPlayerCount === 1 ? t('daily.guestSingular') : t('daily.guestsPlural')}
                </span>
              )}
              {totalAttempts > totalCount + guestPlayerCount && (
                <span className="text-slate-500 dark:text-slate-500">
                  {' '}• {totalAttempts} {t('daily.totalAttempts')}
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
            className="px-3 py-1 h-8 bg-neo-pink hover:bg-neo-pink/90 text-white border-2 border-neo-black rounded-xl shadow-xs hover:-translate-y-0.5 transition-all"
            aria-label={t('common.share')}
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
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-3 rounded-xl bg-linear-to-r from-neo-cyan/30 to-neo-cyan/10 border-2 border-neo-cyan shadow-[0_0_15px_rgba(0,255,255,0.2)]"
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
                <div className="w-10 h-10 rounded-full border-2 border-neo-cyan overflow-hidden shadow-hard-sm shrink-0">
                  <Avatar

                    avatarImage={currentUserData.avatar_image ?? undefined}
                    customAvatar={currentUserData.custom_avatar ?? undefined}
                    size="lg"
                    className="w-full h-full"
                  />
                </div>
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
        </m.div>
      )}

      {/* Loading state */}
      {loading && participants.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader size="md" />
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
        <div>
          {expanded && visibleParticipants.length > 15 ? (
            <VirtualizedParticipantList
              participants={visibleParticipants}
              isCurrentUser={isCurrentUser}
              compact={compact}
              gameType={gameType}
              t={t}
            />
          ) : (
            <div className="space-y-2" role="list" aria-label={t('daily.todaysPlayers')}>
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
            </div>
          )}

          {/* Show more/less button */}
          {hasMore && (
            <m.button
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
                  {t('daily.showMore')} ({filteredParticipants.length - maxVisible} {t('daily.more')})
                </>
              )}
            </m.button>
          )}
        </div>
      )}
    </m.div>
  );
};

export default memo(DailyLeaderboard);
