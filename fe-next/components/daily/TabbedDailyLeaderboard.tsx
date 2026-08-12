'use client';

import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { useSafeInterval } from '@/hooks/useSafeTimeout';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp, Crown, Calendar, Users, Target, CircleDot } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFriends } from '@/hooks/useFriends';
import type { Language } from '@/types';
import { TodayParticipantRow, AllTimeParticipantRow, SkeletonRow } from './DailyLeaderboardRow';
import { WordWheelWordsModal } from './WordWheelWordsModal';
import { WordHuntWordsModal } from './WordHuntWordsModal';
import ChaseBanner from './ChaseBanner';
import type { ChaseParticipant } from './chaseTarget';

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
  words_discovered?: Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>;
  // Per-challenge breakdown for combined view
  word_hunt_score?: number;
  word_wheel_score?: number;
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
  custom_avatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  country_code?: string | null;
  total_efficiency_score: number;
  total_games: number;       // Number of challenges played
  games_won: number;         // Number of challenges solved
  avg_attempts: number | null;
  best_efficiency: number;   // Best efficiency score
  last_played_at: string;
  rank_position: number;
}

type LeaderboardTab = 'today' | 'alltime' | 'friends';
export type LeaderboardScope = 'combined' | 'word-hunt' | 'word-wheel';

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
  scope?: LeaderboardScope;
  /** Words the current player found in today's Word Wheel. When provided,
   *  rows become clickable for any participant with a wheel score and the
   *  modal shows only the words the opponent found that the player missed. */
  myWheelWordsFound?: string[];
  /** Words the current player discovered in today's Word Hunt (stepping-stone words).
   *  When provided, Word Hunt rows become clickable and open diff-mode modal. */
  myHuntWordsDiscovered?: string[];
}

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
      className="bg-neo-navy-light p-1 rounded-neo border-2 border-neo-black"
    >
      <ToggleGroupItem value="today" size="sm" className="text-xs px-3">
        <Calendar className="w-3.5 h-3.5 me-1.5" />
        {t('wordHunt.leaderboard.today')}
      </ToggleGroupItem>
      <ToggleGroupItem value="alltime" size="sm" className="text-xs px-3">
        <Crown className="w-3.5 h-3.5 me-1.5" />
        {t('wordHunt.leaderboard.allTime')}
      </ToggleGroupItem>
      <ToggleGroupItem value="friends" size="sm" className="text-xs px-3">
        <Users className="w-3.5 h-3.5 me-1.5" />
        {t('leaderboard.friends')}
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
  scope = 'combined',
  myWheelWordsFound,
  myHuntWordsDiscovered,
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(defaultTab);

  // Word Wheel words modal (lazy fetch of submitted words)
  const [wordsModalPlayer, setWordsModalPlayer] = useState<DailyParticipant | null>(null);
  const openWheelWords = useCallback((p: DailyParticipant) => setWordsModalPlayer(p), []);
  const closeWheelWords = useCallback(() => setWordsModalPlayer(null), []);

  // Word Hunt words modal (uses data already in leaderboard row — no fetch)
  const [huntWordsModalPlayer, setHuntWordsModalPlayer] = useState<DailyParticipant | null>(null);
  const openHuntWords = useCallback((p: DailyParticipant) => setHuntWordsModalPlayer(p), []);
  const closeHuntWords = useCallback(() => setHuntWordsModalPlayer(null), []);

  // Friends data for filtering
  const { friends } = useFriends();
  const friendUserIds = useMemo(() => new Set(friends.map(f => f.odUserId)), [friends]);

  // Today's leaderboard state
  const [todayParticipants, setTodayParticipants] = useState<DailyParticipant[]>([]);
  const [todayTotalCount, setTodayTotalCount] = useState(0);
  const [todayTotalSolved, setTodayTotalSolved] = useState(0);
  const [todayHuntSolved, setTodayHuntSolved] = useState(0);
  const [todayWheelSolved, setTodayWheelSolved] = useState(0);
  const [todayGuestCount, setTodayGuestCount] = useState(0);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);

  // All-time leaderboard state
  const [allTimeParticipants, setAllTimeParticipants] = useState<AllTimeParticipant[]>([]);
  const [allTimeTotalCount, setAllTimeTotalCount] = useState(0);
  const [allTimeLoading, setAllTimeLoading] = useState(true);
  const [allTimeError, setAllTimeError] = useState<string | null>(null);

  // Windowed pagination state — initialized around the current user
  const [windowRange, setWindowRange] = useState<{ start: number; end: number } | null>(null);

  // Stable refs for unstable parent props. Without this, every parent re-render
  // (from i18n `t`, inline-arrow callbacks, etc.) rebuilds the fetchers, which
  // re-fires the polling effect → instant re-fetch + interval restack → 429.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const onParticipantCountChangeRef = useRef(onParticipantCountChange);
  onParticipantCountChangeRef.current = onParticipantCountChange;
  const onCurrentUserRankChangeRef = useRef(onCurrentUserRankChange);
  onCurrentUserRankChangeRef.current = onCurrentUserRankChange;
  const tRef = useRef(t);
  tRef.current = t;

  // Fetch today's leaderboard — merges Word Hunt + Word Wheel into combined score
  const fetchTodayLeaderboard = useCallback(async () => {
    if (!puzzleDate) return;

    try {
      setTodayLoading(true);
      setTodayError(null);

      const wantHunt = scope !== 'word-wheel';
      const wantWheel = scope !== 'word-hunt';
      const [huntRes, wheelRes] = await Promise.all([
        wantHunt ? fetch(`/api/daily-challenge/word-hunt/leaderboard/${puzzleDate}/${language}?limit=100`) : Promise.resolve(null),
        wantWheel ? fetch(`/api/daily-challenge/word-wheel/leaderboard/${puzzleDate}/${language}?limit=100`) : Promise.resolve(null),
      ]);

      if ((wantHunt && !huntRes?.ok) && (wantWheel && !wheelRes?.ok)) {
        throw new Error('Failed to fetch leaderboard');
      }

      const huntJson = huntRes?.ok ? await huntRes.json() : { data: [], totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 };
      const wheelJson = wheelRes?.ok ? await wheelRes.json() : { data: [], totalParticipants: 0, guestPlayerCount: 0 };

      const huntRows: DailyParticipant[] = huntJson.data || [];
      const wheelRows: Array<DailyParticipant & { score: number }> = wheelJson.data || [];

      const keyOf = (p: { player_id: string | null; guest_fingerprint: string | null }) =>
        p.player_id ? `u:${p.player_id}` : p.guest_fingerprint ? `g:${p.guest_fingerprint}` : null;

      const merged = new Map<string, DailyParticipant>();

      for (const h of huntRows) {
        const k = keyOf(h);
        if (!k) continue;
        const hs = h.efficiency_score ?? h.score ?? 0;
        merged.set(k, {
          ...h,
          score: hs,
          word_hunt_score: hs,
          word_wheel_score: 0,
        });
      }

      for (const w of wheelRows) {
        const k = keyOf(w);
        if (!k) continue;
        const ws = w.score ?? 0;
        const existing = merged.get(k);
        if (existing) {
          merged.set(k, {
            ...existing,
            score: (existing.score ?? 0) + ws,
            word_wheel_score: ws,
            avatar_image: existing.avatar_image ?? w.avatar_image ?? null,
            custom_avatar: existing.custom_avatar ?? w.custom_avatar ?? null,
            profile_picture_url: existing.profile_picture_url ?? w.profile_picture_url ?? null,
            country_code: existing.country_code ?? w.country_code ?? null,
          });
        } else {
          merged.set(k, {
            ...w,
            score: ws,
            solved: undefined,
            attempts_used: undefined,
            efficiency_score: undefined,
            word_hunt_score: 0,
            word_wheel_score: ws,
          });
        }
      }

      // Sort by combined score desc, tie-break on completed_at asc, then re-rank
      const data: DailyParticipant[] = Array.from(merged.values())
        .sort((a, b) => {
          const s = (b.score ?? 0) - (a.score ?? 0);
          if (s !== 0) return s;
          return (a.completed_at || '').localeCompare(b.completed_at || '');
        })
        .map((p, i) => ({ ...p, rank_position: i + 1 }));

      const totalPlayers = Math.max(
        merged.size,
        huntJson.totalPlayers || 0,
        wheelJson.totalParticipants || 0,
      );
      const huntSolved = huntJson.totalSolved || 0;
      const wheelSolved = wheelJson.totalSolved || 0;
      // Single-scope keeps a single solved count. Combined renders per-mode in the
      // header to avoid the "solved > played" paradox when players solve both modes.
      const totalSolved = scope === 'word-hunt'
        ? huntSolved
        : scope === 'word-wheel'
          ? wheelSolved
          : huntSolved + wheelSolved;
      const guestCount = (huntJson.guestPlayerCount || 0) + (wheelJson.guestPlayerCount || 0);

      setTodayParticipants(data);
      setTodayTotalCount(totalPlayers);
      setTodayTotalSolved(totalSolved);
      setTodayHuntSolved(huntSolved);
      setTodayWheelSolved(wheelSolved);
      setTodayGuestCount(guestCount);

      const cb = onParticipantCountChangeRef.current;
      if (cb && activeTabRef.current === 'today') {
        cb(totalPlayers);
      }
    } catch (err) {
      console.error('Failed to fetch today leaderboard:', err);
      setTodayError(tRef.current('errors.failedToLoadLeaderboard'));
    } finally {
      setTodayLoading(false);
    }
  }, [puzzleDate, language, scope]);

  // Fetch all-time leaderboard — merges Word Hunt + Word Wheel
  const fetchAllTimeLeaderboard = useCallback(async () => {
    try {
      setAllTimeLoading(true);
      setAllTimeError(null);

      const wantHunt = scope !== 'word-wheel';
      const wantWheel = scope !== 'word-hunt';
      const [huntRes, wheelRes] = await Promise.all([
        wantHunt ? fetch(`/api/daily-challenge/word-hunt/alltime-leaderboard/${language}?limit=100`) : Promise.resolve(null),
        wantWheel ? fetch(`/api/daily-challenge/word-wheel/alltime-leaderboard/${language}?limit=100`) : Promise.resolve(null),
      ]);

      if ((wantHunt && !huntRes?.ok) && (wantWheel && !wheelRes?.ok)) {
        throw new Error('Failed to fetch all-time leaderboard');
      }

      const huntJson = huntRes?.ok ? await huntRes.json() : { data: [] };
      const wheelJson = wheelRes?.ok ? await wheelRes.json() : { data: [] };
      const huntRows: AllTimeParticipant[] = huntJson.data || [];
      const wheelRows: AllTimeParticipant[] = wheelJson.data || [];

      const keyOf = (p: { player_id: string | null; guest_fingerprint: string | null }) =>
        p.player_id ? `u:${p.player_id}` : p.guest_fingerprint ? `g:${p.guest_fingerprint}` : null;

      const merged = new Map<string, AllTimeParticipant>();

      for (const h of huntRows) {
        const k = keyOf(h);
        if (!k) continue;
        merged.set(k, { ...h });
      }

      for (const w of wheelRows) {
        const k = keyOf(w);
        if (!k) continue;
        const e = merged.get(k);
        if (e) {
          merged.set(k, {
            ...e,
            total_efficiency_score: (e.total_efficiency_score || 0) + (w.total_efficiency_score || 0),
            total_games: (e.total_games || 0) + (w.total_games || 0),
            games_won: (e.games_won || 0) + (w.games_won || 0),
            best_efficiency: Math.max(e.best_efficiency || 0, w.best_efficiency || 0),
            last_played_at: (e.last_played_at || '') > (w.last_played_at || '') ? e.last_played_at : w.last_played_at,
            avatar_image: e.avatar_image ?? w.avatar_image ?? null,
            custom_avatar: e.custom_avatar ?? w.custom_avatar ?? null,
            profile_picture_url: e.profile_picture_url ?? w.profile_picture_url ?? null,
            country_code: e.country_code ?? w.country_code ?? null,
          });
        } else {
          merged.set(k, { ...w });
        }
      }

      const data = Array.from(merged.values())
        .sort((a, b) => (b.total_efficiency_score || 0) - (a.total_efficiency_score || 0))
        .map((p, i) => ({ ...p, rank_position: i + 1 }));

      setAllTimeParticipants(data);
      setAllTimeTotalCount(data.length);

      const cb = onParticipantCountChangeRef.current;
      if (cb && activeTabRef.current === 'alltime') {
        cb(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch all-time leaderboard:', err);
      setAllTimeError(tRef.current('errors.failedToLoadLeaderboard'));
    } finally {
      setAllTimeLoading(false);
    }
  }, [language, scope]);

  // Initial fetch and polling
  const pollingInterval = useSafeInterval();

  useEffect(() => {
    fetchTodayLeaderboard();
    fetchAllTimeLeaderboard();

    const startPolling = () => {
      pollingInterval.start(() => {
        fetchTodayLeaderboard();
        fetchAllTimeLeaderboard();
      }, 30000);
    };

    const stopPolling = () => {
      pollingInterval.stop();
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
  }, [fetchTodayLeaderboard, fetchAllTimeLeaderboard, pollingInterval]);

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

  // Report current user's rank to parent (uses ref to keep deps stable)
  useEffect(() => {
    const cb = onCurrentUserRankChangeRef.current;
    if (cb && activeTab === 'today') {
      cb(currentUserTodayData?.rank_position ?? null);
    }
  }, [currentUserTodayData?.rank_position, activeTab]);

  // Get current data based on active tab
  // Filter all-time participants to only show those who have solved at least one challenge.
  // Memoized so its array identity is stable across renders — otherwise the anchorIndex
  // useMemo below (which depends on it) re-runs its findIndex over the whole list every render.
  const filteredAllTimeParticipants = useMemo(
    () => allTimeParticipants.filter(p => p.games_won > 0),
    [allTimeParticipants]
  );
  const friendsParticipants = useMemo(
    () => todayParticipants.filter(p => p.player_id && friendUserIds.has(p.player_id)),
    [todayParticipants, friendUserIds]
  );
  const participants = activeTab === 'today'
    ? todayParticipants
    : activeTab === 'friends'
      ? friendsParticipants
      : filteredAllTimeParticipants;
  const totalCount = activeTab === 'today' ? todayTotalCount : activeTab === 'friends' ? friendsParticipants.length : allTimeTotalCount;
  const totalSolvedCount = activeTab === 'today' ? todayTotalSolved : 0;
  const loading = activeTab === 'friends' ? todayLoading : activeTab === 'today' ? todayLoading : allTimeLoading;
  const error = activeTab === 'friends' ? todayError : activeTab === 'today' ? todayError : allTimeError;

  // Anchor index for current tab — where to center the visible window
  const anchorIndex = useMemo(() => {
    if (activeTab === 'today') return currentUserTodayIndex;
    if (activeTab === 'friends') return friendsParticipants.findIndex(isCurrentUserToday);
    return filteredAllTimeParticipants.findIndex(isCurrentUserAllTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUserTodayIndex, friendsParticipants, filteredAllTimeParticipants, currentPlayerId, currentGuestFingerprint]);

  // Reset window when switching tabs so each tab re-centers on its own anchor
  useEffect(() => {
    setWindowRange(null);
  }, [activeTab]);

  // Initialize window once per tab when data arrives — center on current user if present
  useEffect(() => {
    if (windowRange !== null) return;
    if (participants.length === 0) return;
    const half = Math.floor(maxVisible / 2);
    const anchor = anchorIndex >= 0 ? anchorIndex : 0;
    let start = Math.max(0, anchor - half);
    let end = Math.min(participants.length, start + maxVisible);
    // If we hit the bottom, expand the window backwards to keep it full
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
    setWindowRange({ start, end });
  }, [windowRange, participants.length, anchorIndex, maxVisible]);

  // Clamp the window if the participant count shrinks (e.g. polling brings smaller list)
  useEffect(() => {
    if (!windowRange) return;
    if (windowRange.end > participants.length) {
      setWindowRange({
        start: Math.min(windowRange.start, Math.max(0, participants.length - maxVisible)),
        end: participants.length,
      });
    }
  }, [participants.length, windowRange, maxVisible]);

  // Determine which participants to show
  const visibleParticipants = windowRange
    ? participants.slice(windowRange.start, windowRange.end)
    : participants.slice(0, maxVisible);
  const visibleStart = windowRange?.start ?? 0;

  const hasAbove = (windowRange?.start ?? 0) > 0;
  const hasBelow = (windowRange?.end ?? Math.min(maxVisible, participants.length)) < participants.length;
  const aboveCount = windowRange?.start ?? 0;
  const belowCount = participants.length - (windowRange?.end ?? Math.min(maxVisible, participants.length));

  const loadAbove = useCallback(() => {
    setWindowRange((prev) => {
      if (!prev) return prev;
      return { start: Math.max(0, prev.start - maxVisible), end: prev.end };
    });
  }, [maxVisible]);

  const loadBelow = useCallback(() => {
    setWindowRange((prev) => {
      if (!prev) return prev;
      return { start: prev.start, end: Math.min(participants.length, prev.end + maxVisible) };
    });
  }, [maxVisible, participants.length]);

  const isLoading = loading && participants.length === 0;
  const isEmpty = !loading && participants.length === 0;
  const prefersReducedMotion = useReducedMotion();

  // Crossfade+scale between loading/error/empty/list so switching tabs never
  // hard-cuts the content pane — the participant rows already animate their
  // own add/remove via the inner AnimatePresence below, but the branch itself
  // (e.g. loading -> list, or list -> empty when Friends has no one) swapped
  // instantly with zero transition. Keyed per branch + tab so every real state
  // change gets its own crossfade; reduced-motion collapses it to an instant cut.
  const contentKey = isLoading ? 'loading' : error ? 'error' : isEmpty ? `empty-${activeTab}` : `list-${activeTab}`;
  const contentTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const };
  const contentVariants = prefersReducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: { opacity: 0, scale: 0.98 },
        center: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
      };

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
        <div className="text-center text-neo-red py-4 text-sm">
          {error}
          <button
            type="button"
            onClick={activeTab === 'today' ? fetchTodayLeaderboard : fetchAllTimeLeaderboard}
            className="block mx-auto mt-3 px-4 py-1.5 text-xs font-bold uppercase rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm hover:shadow-hard active:translate-y-0.5 active:shadow-none transition-all"
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
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-neo-lg bg-neo-purple border-2 border-neo-black shadow-hard-sm">
            <Trophy aria-hidden className="h-7 w-7 text-neo-yellow" />
          </div>
          <p className="text-neo-white/80 font-bold text-sm sm:text-base">
            {activeTab === 'friends'
              ? t('leaderboard.noFriendsPlayed')
              : activeTab === 'today'
                ? t('daily.beFirstToPlay')
                : t('wordHunt.leaderboard.noPlayersYet')}
          </p>
        </div>
      );
    }

    // Participants list with windowed pagination (load-above + load-below)
    const loadMoreClass = 'w-full py-2 text-xs sm:text-sm font-bold text-neo-purple hover:text-neo-white flex items-center justify-center gap-1.5 transition-colors rounded-neo bg-neo-purple/10 hover:bg-neo-purple/20 border border-neo-purple/40';

    return (
      <div className={`space-y-2 pb-[calc(var(--admob-banner-height,0px)+var(--mobile-bottom-safe))] md:pb-6`}>
        {/* Load more above */}
        {hasAbove && (
          <button type="button" onClick={loadAbove} className={loadMoreClass}>
            <ChevronUp className="w-4 h-4" />
            {t('daily.showMore')} ({aboveCount} {t('daily.more')})
          </button>
        )}

        <AnimatePresence mode="popLayout">
          {activeTab !== 'alltime' ? (
            (visibleParticipants as DailyParticipant[]).map((participant, index) => (
              <TodayParticipantRow
                key={participant.player_id || participant.guest_fingerprint || `idx-${visibleStart + index}`}
                participant={participant}
                index={index}
                isCurrentUser={isCurrentUserToday(participant)}
                compact={compact}
                t={t}
                onViewWheelWords={myWheelWordsFound !== undefined ? openWheelWords : undefined}
                onViewHuntWords={myHuntWordsDiscovered !== undefined ? openHuntWords : undefined}
                scope={scope}
              />
            ))
          ) : (
            (visibleParticipants as AllTimeParticipant[]).map((participant, index) => (
              <AllTimeParticipantRow
                key={participant.player_identifier || `idx-${visibleStart + index}`}
                participant={participant}
                index={index}
                isCurrentUser={isCurrentUserAllTime(participant)}
                compact={compact}
                t={t}
              />
            ))
          )}
        </AnimatePresence>

        {/* Load more below */}
        {hasBelow && (
          <button type="button" onClick={loadBelow} className={loadMoreClass}>
            <ChevronDown className="w-4 h-4" />
            {t('daily.showMore')} ({belowCount} {t('daily.more')})
          </button>
        )}
      </div>
    );
  };

  return (
    <>
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`
        bg-neo-navy-light rounded-neo-lg border-2 border-neo-black
        ${compact ? 'p-3' : 'p-4 sm:p-5'}
        shadow-hard
      `}
    >
      {/* Header - always visible */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 sm:p-2.5 bg-neo-purple rounded-neo border-2 border-neo-black shadow-hard-sm">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-neo-yellow" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-base sm:text-lg uppercase tracking-wide text-neo-white flex items-center gap-2 flex-wrap">
            <span>{t('wordHunt.leaderboard.title')}</span>
            <span
              className={`
                inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border-2 border-neo-black shadow-xs normal-case tracking-normal
                ${scope === 'word-hunt' ? 'bg-neo-cyan text-neo-black' : ''}
                ${scope === 'word-wheel' ? 'bg-neo-purple text-white' : ''}
                ${scope === 'combined' ? 'bg-neo-lime text-neo-black' : ''}
              `}
              title={
                scope === 'combined'
                  ? t('wordHunt.leaderboard.scopeCombined')
                  : scope === 'word-hunt'
                    ? t('wordHunt.leaderboard.scopeWordHunt')
                    : t('wordHunt.leaderboard.scopeWordWheel')
              }
            >
              {scope === 'combined' && (
                <>
                  <Target aria-hidden className="w-3 h-3" />
                  <CircleDot aria-hidden className="w-3 h-3" />
                  {t('wordHunt.leaderboard.scopeCombined')}
                </>
              )}
              {scope === 'word-hunt' && (
                <>
                  <Target aria-hidden className="w-3 h-3" />
                  {t('wordHunt.leaderboard.scopeWordHunt')}
                </>
              )}
              {scope === 'word-wheel' && (
                <>
                  <CircleDot aria-hidden className="w-3 h-3" />
                  {t('wordHunt.leaderboard.scopeWordWheel')}
                </>
              )}
            </span>
          </h3>
          {!isLoading && !error && (
            <p className="text-xs sm:text-sm text-neo-white/60 font-medium truncate">
              {activeTab === 'today' && totalCount > 0 ? (
                <>
                  <span>{totalCount} {t('wordHunt.leaderboard.played')}</span>
                  <span className="mx-1.5">•</span>
                  {scope === 'combined' && todayHuntSolved > 0 && todayWheelSolved > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-neo-lime">
                        <Target aria-hidden className="w-3.5 h-3.5" />
                        {todayHuntSolved} {t('wordHunt.leaderboard.solved')}
                      </span>
                      <span className="mx-1.5">•</span>
                      <span className="inline-flex items-center gap-1 text-neo-lime">
                        <CircleDot aria-hidden className="w-3.5 h-3.5" />
                        {todayWheelSolved} {t('wordHunt.leaderboard.solved')}
                      </span>
                    </>
                  ) : (
                    <span className="text-neo-lime">{totalSolvedCount} {t('wordHunt.leaderboard.solved')}</span>
                  )}
                  {todayGuestCount > 0 && (
                    <>
                      <span className="mx-1.5">•</span>
                      <span className="text-neo-white/50">
                        {todayGuestCount} {todayGuestCount === 1 ? t('daily.guestSingular') : t('daily.guestsPlural')}
                      </span>
                    </>
                  )}
                </>
              ) : totalCount > 0 ? (
                <>{totalCount} {totalCount === 1 ? t('daily.playerSingular') : t('daily.playersPlural')}</>
              ) : null}
            </p>
          )}
        </div>
      </div>

      {/* Who to beat — the single closable gap, above the standings so the board
          reads as a target rather than a record. Today's tab only: the all-time
          and friends tabs rank on cumulative totals, where "one good word passes
          them" is not true. */}
      {activeTab === 'today' && (
        <ChaseBanner
          participants={participants as ChaseParticipant[]}
          playerId={currentPlayerId}
          guestFingerprint={currentGuestFingerprint}
          totalPlayers={totalCount}
          loading={isLoading}
          t={t}
          className="mb-4"
        />
      )}

      {/* Tabs - always visible, outside loading area */}
      <div className="mb-4">
        <LeaderboardTabs activeTab={activeTab} onTabChange={setActiveTab} t={t} />
      </div>

      {/* Content area - loading/empty/participants. Crossfades between branches
          (see contentKey/contentVariants above) so tab switches never hard-cut. */}
      <AnimatePresence mode="wait">
        <m.div
          key={contentKey}
          variants={contentVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={contentTransition}
        >
          {renderContent()}
        </m.div>
      </AnimatePresence>
    </m.div>

    <WordWheelWordsModal
      isOpen={!!wordsModalPlayer}
      onClose={closeWheelWords}
      puzzleDate={puzzleDate}
      language={language}
      playerId={wordsModalPlayer?.player_id ?? null}
      playerName={wordsModalPlayer?.display_name ?? ''}
      myWordsFound={myWheelWordsFound}
      t={t}
    />

    <WordHuntWordsModal
      isOpen={!!huntWordsModalPlayer}
      onClose={closeHuntWords}
      playerName={huntWordsModalPlayer?.display_name ?? ''}
      wordsDiscovered={huntWordsModalPlayer?.words_discovered ?? []}
      myWordsDiscovered={myHuntWordsDiscovered}
      t={t}
    />
    </>
  );
};

export default memo(TabbedDailyLeaderboard);
