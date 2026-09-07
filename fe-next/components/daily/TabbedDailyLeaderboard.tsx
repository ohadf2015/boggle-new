'use client';

import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { useSafeInterval } from '@/hooks/useSafeTimeout';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp, Crown, Calendar, Users, Target, CircleDot, Globe, Sparkles } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFriends } from '@/hooks/useFriends';
import type { Language } from '@/types';
import { LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { getCurrentSeasonDynamic, getSeasonIdentity } from '@/lib/seasons';
import { getCountryFlag } from '@/shared/utils';
import { TodayParticipantRow, AllTimeParticipantRow, SeasonParticipantRow, SkeletonRow } from './DailyLeaderboardRow';
import { WordWheelWordsModal } from './WordWheelWordsModal';
import { WordHuntWordsModal } from './WordHuntWordsModal';
import ChaseBanner from './ChaseBanner';
import type { ChaseParticipant } from './chaseTarget';
import { DailySeasonRibbon } from './DailySeasonRibbon';
import { participantKey, computeRankMovements, collectCountries, type RankMovement } from './leaderboardLive';

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
  /** Language the row was played in — set on the cross-language board. */
  language?: string | null;
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

/** One player's season row, hunt + wheel folded together. */
export interface SeasonParticipant {
  player_id: string;
  player_identifier: string;
  guest_fingerprint: null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string | null;
  profile_picture_url?: string | null;
  custom_avatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
  country_code?: string | null;
  season_score: number;
  days_played: number;
  solves: number;
  languages: string[];
  last_played_at: string | null;
  rank_position: number;
  word_hunt_score: number;
  word_wheel_score: number;
}

export interface DailySeasonSummary {
  id: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
}

type LeaderboardTab = 'today' | 'season' | 'alltime' | 'friends';
export type LeaderboardScope = 'combined' | 'word-hunt' | 'word-wheel';
type LanguageScope = 'all' | 'mine';

const LANGUAGE_SCOPE_STORAGE_KEY = 'lexiclash_daily_lb_language_scope';

/**
 * The app's `t`: key plus either a fallback string or interpolation params.
 * Declared through a method signature so parameters are checked bivariantly —
 * callers hand in `t`s typed `(key) => string`, `(key, params?) => string` and
 * `(key, fallback?) => string`, all of which are the same runtime function.
 */
type T = { bivarianceHack(key: string, fallbackOrParams?: string | Record<string, string | number>): string }['bivarianceHack'];

interface TabbedDailyLeaderboardProps {
  puzzleDate: string;
  language: Language;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
  onParticipantCountChange?: (count: number) => void;
  onCurrentUserRankChange?: (rank: number | null) => void;
  compact?: boolean;
  maxVisible?: number;
  t: T;
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
// Helpers
// ==========================================

function readStoredLanguageScope(): LanguageScope {
  if (typeof window === 'undefined') return 'all';
  try {
    return window.localStorage.getItem(LANGUAGE_SCOPE_STORAGE_KEY) === 'mine' ? 'mine' : 'all';
  } catch {
    return 'all';
  }
}

function writeStoredLanguageScope(scope: LanguageScope): void {
  try {
    window.localStorage.setItem(LANGUAGE_SCOPE_STORAGE_KEY, scope);
  } catch {
    /* storage may be unavailable (private mode, quota) — the choice still applies this session */
  }
}

/** Client-side fallback when /seasons is unreachable: the season the calendar says we are in. */
function fallbackSeasons(): { seasons: DailySeasonSummary[]; currentSeasonId: number } {
  const s = getCurrentSeasonDynamic();
  return {
    currentSeasonId: s.id,
    seasons: [{
      id: s.id,
      name: s.name,
      theme: s.theme,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      status: 'active',
      isCurrent: true,
    }],
  };
}

// ==========================================
// Tabs Component (Always Visible)
// ==========================================

const LeaderboardTabs = memo<{
  activeTab: LeaderboardTab;
  onTabChange: (tab: LeaderboardTab) => void;
  t: T;
}>(({ activeTab, onTabChange, t }) => (
  <div className="flex justify-center">
    <ToggleGroup
      type="single"
      value={activeTab}
      onValueChange={(value) => value && onTabChange(value as LeaderboardTab)}
      className="bg-neo-navy-light p-1 rounded-neo border-2 border-neo-black flex-wrap justify-center"
    >
      <ToggleGroupItem value="today" size="sm" className="text-xs px-2 sm:px-3">
        <Calendar className="w-3.5 h-3.5 me-1 sm:me-1.5" />
        {t('wordHunt.leaderboard.today')}
      </ToggleGroupItem>
      <ToggleGroupItem value="season" size="sm" className="text-xs px-2 sm:px-3">
        <Sparkles className="w-3.5 h-3.5 me-1 sm:me-1.5" />
        {t('wordHunt.leaderboard.season')}
      </ToggleGroupItem>
      <ToggleGroupItem value="alltime" size="sm" className="text-xs px-2 sm:px-3">
        <Crown className="w-3.5 h-3.5 me-1 sm:me-1.5" />
        {t('wordHunt.leaderboard.allTime')}
      </ToggleGroupItem>
      <ToggleGroupItem value="friends" size="sm" className="text-xs px-2 sm:px-3">
        <Users className="w-3.5 h-3.5 me-1 sm:me-1.5" />
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

  // Language scope. The board is GLOBAL by default: every daily leaderboard used
  // to be scoped to whatever language the surface happened to be mounted with —
  // the hub used the UI locale — so a player who solved today's Hebrew puzzle
  // opened an English hub and did not see themselves. `all` asks the server for
  // everyone who played today; `mine` narrows to the puzzle language.
  const [languageScope, setLanguageScope] = useState<LanguageScope>(readStoredLanguageScope);
  const fetchLanguage = languageScope === 'mine' ? language : 'all';

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

  // Rank movements between polls — the "who just passed whom" layer.
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const movementsRef = useRef<Map<string, RankMovement>>(new Map());
  const [movements, setMovements] = useState<Map<string, RankMovement>>(new Map());

  const toggleLanguageScope = useCallback(() => {
    setLanguageScope((prev) => {
      const next: LanguageScope = prev === 'all' ? 'mine' : 'all';
      writeStoredLanguageScope(next);
      return next;
    });
    // A different population — previous ranks mean nothing for movement diffs.
    prevRanksRef.current = new Map();
    movementsRef.current = new Map();
    setMovements(new Map());
  }, []);

  // All-time leaderboard state
  const [allTimeParticipants, setAllTimeParticipants] = useState<AllTimeParticipant[]>([]);
  const [allTimeTotalCount, setAllTimeTotalCount] = useState(0);
  const [allTimeLoading, setAllTimeLoading] = useState(true);
  const [allTimeError, setAllTimeError] = useState<string | null>(null);

  // Season state — loaded lazily the first time the Season tab opens.
  const [seasons, setSeasons] = useState<DailySeasonSummary[] | null>(null);
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [seasonParticipants, setSeasonParticipants] = useState<SeasonParticipant[]>([]);
  const [seasonTotalCount, setSeasonTotalCount] = useState(0);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState<string | null>(null);

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
        wantHunt ? fetch(`/api/daily-challenge/word-hunt/leaderboard/${puzzleDate}/${fetchLanguage}?limit=100`) : Promise.resolve(null),
        wantWheel ? fetch(`/api/daily-challenge/word-wheel/leaderboard/${puzzleDate}/${fetchLanguage}?limit=100`) : Promise.resolve(null),
      ]);

      if ((wantHunt && !huntRes?.ok) && (wantWheel && !wheelRes?.ok)) {
        throw new Error('Failed to fetch leaderboard');
      }

      const huntJson = huntRes?.ok ? await huntRes.json() : { data: [], totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 };
      const wheelJson = wheelRes?.ok ? await wheelRes.json() : { data: [], totalParticipants: 0, guestPlayerCount: 0 };

      const huntRows: DailyParticipant[] = huntJson.data || [];
      const wheelRows: Array<DailyParticipant & { score: number }> = wheelJson.data || [];

      const merged = new Map<string, DailyParticipant>();

      for (const h of huntRows) {
        const k = participantKey(h);
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
        const k = participantKey(w);
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
            language: existing.language ?? w.language ?? null,
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

      // Who moved since the previous snapshot.
      const live = computeRankMovements(prevRanksRef.current, movementsRef.current, data, Date.now());
      prevRanksRef.current = live.ranks;
      movementsRef.current = live.movements;
      setMovements(live.movements);

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
  }, [puzzleDate, fetchLanguage, scope]);

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

      const merged = new Map<string, AllTimeParticipant>();

      for (const h of huntRows) {
        const k = participantKey(h);
        if (!k) continue;
        merged.set(k, { ...h });
      }

      for (const w of wheelRows) {
        const k = participantKey(w);
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

  // Season list — the seasons that have started, newest first.
  const fetchSeasons = useCallback(async () => {
    try {
      const res = await fetch('/api/daily-challenge/seasons');
      if (!res.ok) throw new Error('Failed to fetch seasons');
      const json = await res.json() as { seasons?: DailySeasonSummary[]; currentSeasonId?: number };
      const list = Array.isArray(json.seasons) && json.seasons.length > 0 ? json.seasons : fallbackSeasons().seasons;
      const current = typeof json.currentSeasonId === 'number' ? json.currentSeasonId : (list.find(s => s.isCurrent)?.id ?? list[0].id);
      setSeasons(list);
      setCurrentSeasonId(current);
      setSelectedSeasonId((prev) => prev ?? current);
    } catch (err) {
      console.error('Failed to fetch seasons:', err);
      const fb = fallbackSeasons();
      setSeasons(fb.seasons);
      setCurrentSeasonId(fb.currentSeasonId);
      setSelectedSeasonId((prev) => prev ?? fb.currentSeasonId);
    }
  }, []);

  // Season board — merges Word Hunt + Word Wheel season points per player.
  const fetchSeasonLeaderboard = useCallback(async (seasonId: number) => {
    try {
      setSeasonLoading(true);
      setSeasonError(null);

      const wantHunt = scope !== 'word-wheel';
      const wantWheel = scope !== 'word-hunt';
      const qs = `?season=${seasonId}&limit=100`;
      const [huntRes, wheelRes] = await Promise.all([
        wantHunt ? fetch(`/api/daily-challenge/word-hunt/season-leaderboard/${fetchLanguage}${qs}`) : Promise.resolve(null),
        wantWheel ? fetch(`/api/daily-challenge/word-wheel/season-leaderboard/${fetchLanguage}${qs}`) : Promise.resolve(null),
      ]);

      if ((wantHunt && !huntRes?.ok) && (wantWheel && !wheelRes?.ok)) {
        throw new Error('Failed to fetch season leaderboard');
      }

      type SeasonRow = Omit<SeasonParticipant, 'word_hunt_score' | 'word_wheel_score'>;
      const huntJson = huntRes?.ok ? await huntRes.json() : { data: [] };
      const wheelJson = wheelRes?.ok ? await wheelRes.json() : { data: [] };
      const huntRows: SeasonRow[] = huntJson.data || [];
      const wheelRows: SeasonRow[] = wheelJson.data || [];

      const merged = new Map<string, SeasonParticipant>();
      for (const h of huntRows) {
        if (!h.player_id) continue;
        merged.set(h.player_id, {
          ...h,
          season_score: h.season_score || 0,
          days_played: h.days_played || 0,
          solves: h.solves || 0,
          languages: h.languages || [],
          word_hunt_score: h.season_score || 0,
          word_wheel_score: 0,
        });
      }
      for (const w of wheelRows) {
        if (!w.player_id) continue;
        const e = merged.get(w.player_id);
        const ws = w.season_score || 0;
        if (e) {
          merged.set(w.player_id, {
            ...e,
            season_score: e.season_score + ws,
            days_played: e.days_played + (w.days_played || 0),
            languages: Array.from(new Set([...e.languages, ...(w.languages || [])])),
            last_played_at: (e.last_played_at || '') > (w.last_played_at || '') ? e.last_played_at : (w.last_played_at ?? null),
            word_wheel_score: ws,
            avatar_image: e.avatar_image ?? w.avatar_image ?? null,
            custom_avatar: e.custom_avatar ?? w.custom_avatar ?? null,
            profile_picture_url: e.profile_picture_url ?? w.profile_picture_url ?? null,
            country_code: e.country_code ?? w.country_code ?? null,
          });
        } else {
          merged.set(w.player_id, {
            ...w,
            season_score: ws,
            days_played: w.days_played || 0,
            solves: 0,
            languages: w.languages || [],
            word_hunt_score: 0,
            word_wheel_score: ws,
          });
        }
      }

      const data = Array.from(merged.values())
        .sort((a, b) => {
          if (b.season_score !== a.season_score) return b.season_score - a.season_score;
          if (b.solves !== a.solves) return b.solves - a.solves;
          return (a.last_played_at || '').localeCompare(b.last_played_at || '');
        })
        .map((p, i) => ({ ...p, rank_position: i + 1 }));

      setSeasonParticipants(data);
      setSeasonTotalCount(data.length);

      const cb = onParticipantCountChangeRef.current;
      if (cb && activeTabRef.current === 'season') {
        cb(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch season leaderboard:', err);
      setSeasonError(tRef.current('errors.failedToLoadLeaderboard'));
    } finally {
      setSeasonLoading(false);
    }
  }, [fetchLanguage, scope]);

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

  // Season data loads when the tab is opened (and when the selection / scope changes).
  useEffect(() => {
    if (activeTab !== 'season') return;
    if (seasons === null) {
      setSeasonLoading(true);
      fetchSeasons();
    }
  }, [activeTab, seasons, fetchSeasons]);

  useEffect(() => {
    if (activeTab !== 'season' || selectedSeasonId === null) return;
    fetchSeasonLeaderboard(selectedSeasonId);
  }, [activeTab, selectedSeasonId, fetchSeasonLeaderboard]);

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

  const isCurrentUserSeason = (participant: SeasonParticipant) =>
    !!currentPlayerId && participant.player_id === currentPlayerId;

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
  const participants: Array<DailyParticipant | AllTimeParticipant | SeasonParticipant> = activeTab === 'today'
    ? todayParticipants
    : activeTab === 'friends'
      ? friendsParticipants
      : activeTab === 'season'
        ? seasonParticipants
        : filteredAllTimeParticipants;
  const totalCount = activeTab === 'today'
    ? todayTotalCount
    : activeTab === 'friends'
      ? friendsParticipants.length
      : activeTab === 'season'
        ? seasonTotalCount
        : allTimeTotalCount;
  const totalSolvedCount = activeTab === 'today' ? todayTotalSolved : 0;
  // How many people actually solved today, whether or not they are rankable. Guests are the whole
  // point: they are recorded but filtered out of the board, so on a guest-heavy day the ranked list
  // is empty while this is not. max() rather than a sum — a guest is already inside totalSolved when
  // the server counted them there, and double-counting would turn an honest number into a new lie.
  const todaySolversToday = Math.max(todayTotalSolved, todayGuestCount);
  const loading = activeTab === 'friends' || activeTab === 'today'
    ? todayLoading
    : activeTab === 'season'
      ? seasonLoading
      : allTimeLoading;
  const error = activeTab === 'friends' || activeTab === 'today'
    ? todayError
    : activeTab === 'season'
      ? seasonError
      : allTimeError;

  // Countries on today's board — the "all countries" strip.
  const countries = useMemo(() => collectCountries(todayParticipants), [todayParticipants]);

  // Season identity for the card accent + ribbon. Before /seasons resolves, the
  // calendar season is the best guess (and matches the server in practice).
  const accentSeasonId = currentSeasonId ?? getCurrentSeasonDynamic().id;
  const accentIdentity = getSeasonIdentity(accentSeasonId);
  const selectedSeason = useMemo(
    () => seasons?.find(s => s.id === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId],
  );
  const selectedIdentity = selectedSeason ? getSeasonIdentity(selectedSeason.id) : accentIdentity;

  // Anchor index for current tab — where to center the visible window
  const anchorIndex = useMemo(() => {
    if (activeTab === 'today') return currentUserTodayIndex;
    if (activeTab === 'friends') return friendsParticipants.findIndex(isCurrentUserToday);
    if (activeTab === 'season') return seasonParticipants.findIndex(isCurrentUserSeason);
    return filteredAllTimeParticipants.findIndex(isCurrentUserAllTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUserTodayIndex, friendsParticipants, filteredAllTimeParticipants, seasonParticipants, currentPlayerId, currentGuestFingerprint]);

  // Reset window when switching tabs (or seasons) so each re-centers on its own anchor
  useEffect(() => {
    setWindowRange(null);
  }, [activeTab, selectedSeasonId]);

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

  // Keep the window honest as polling changes the list: clamp when it shrinks,
  // and grow it when there is still room under maxVisible — a new entrant on a
  // 2-player board must appear, not hide behind a "show more" button.
  useEffect(() => {
    if (!windowRange) return;
    if (windowRange.end > participants.length) {
      setWindowRange({
        start: Math.min(windowRange.start, Math.max(0, participants.length - maxVisible)),
        end: participants.length,
      });
      return;
    }
    const room = maxVisible - (windowRange.end - windowRange.start);
    if (room > 0 && windowRange.end < participants.length) {
      setWindowRange({
        start: windowRange.start,
        end: Math.min(participants.length, windowRange.end + room),
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

  const retry = useCallback(() => {
    if (activeTab === 'season') {
      if (selectedSeasonId !== null) fetchSeasonLeaderboard(selectedSeasonId);
      else fetchSeasons();
    } else if (activeTab === 'alltime') {
      fetchAllTimeLeaderboard();
    } else {
      fetchTodayLeaderboard();
    }
  }, [activeTab, selectedSeasonId, fetchSeasonLeaderboard, fetchSeasons, fetchAllTimeLeaderboard, fetchTodayLeaderboard]);

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

  const languageCfg = LANGUAGE_CONFIG[language];
  const showLanguageToggle = activeTab === 'today' || activeTab === 'season' || activeTab === 'friends';

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
            onClick={retry}
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
              : activeTab === 'season'
                ? t('wordHunt.leaderboard.seasonNoPlayers')
                : activeTab === 'today'
                  // "Be the first today!" was a lie on a GLOBAL board: the server may have
                  // counted solvers it could not rank (guestPlayerCount). Say the true thing
                  // and make the sign-in the reason it's worth doing. `{count}` stays INSIDE
                  // the translated string so each language can place the number where its
                  // grammar needs it.
                  ? todaySolversToday > 0
                    ? t('daily.guestsSolvedSignIn').replace('{count}', String(todaySolversToday))
                    : t('daily.beFirstToPlay')
                  : t('wordHunt.leaderboard.noPlayersYet')}
          </p>
        </div>
      );
    }

    // Participants list with windowed pagination (load-above + load-below)
    const loadMoreClass = 'w-full py-2 text-xs sm:text-sm font-bold text-neo-purple hover:text-neo-white flex items-center justify-center gap-1.5 transition-colors rounded-neo bg-neo-purple/10 hover:bg-neo-purple/20 border border-neo-purple/40';

    return (
      // The AdMob banner is fixed to the viewport bottom and was covering the
      // "load more" button at the end of the list. --bottom-stack-height is the
      // repo's own composed offset for exactly this (globals.css): it clamps each
      // layer to 120px so a pathological Android 15+ safe-area inset cannot open a
      // huge empty band, and it does not double-count safe-area the way
      // admob-banner-height + mobile-bottom-safe would.
      <div className="space-y-2 pb-[var(--bottom-stack-height)] md:pb-6">
        {/* Load more above */}
        {hasAbove && (
          <button type="button" onClick={loadAbove} className={loadMoreClass}>
            <ChevronUp className="w-4 h-4" />
            {t('daily.showMore')} ({aboveCount} {t('daily.more')})
          </button>
        )}

        <AnimatePresence mode="popLayout">
          {activeTab === 'today' || activeTab === 'friends' ? (
            (visibleParticipants as DailyParticipant[]).map((participant, index) => {
              // The "words you missed" diff only makes sense against the SAME puzzle:
              // on the cross-language board a row may come from another language's board.
              const sameLanguage = !participant.language || participant.language === language;
              const key = participantKey(participant);
              return (
                <TodayParticipantRow
                  key={key || `idx-${visibleStart + index}`}
                  participant={participant}
                  index={index}
                  isCurrentUser={isCurrentUserToday(participant)}
                  compact={compact}
                  t={t}
                  onViewWheelWords={myWheelWordsFound !== undefined && sameLanguage ? openWheelWords : undefined}
                  onViewHuntWords={myHuntWordsDiscovered !== undefined && sameLanguage ? openHuntWords : undefined}
                  scope={scope}
                  showLanguage={languageScope === 'all'}
                  movement={key ? movements.get(key) ?? null : null}
                />
              );
            })
          ) : activeTab === 'season' ? (
            (visibleParticipants as SeasonParticipant[]).map((participant, index) => (
              <SeasonParticipantRow
                key={participant.player_identifier || `idx-${visibleStart + index}`}
                participant={participant}
                index={index}
                isCurrentUser={isCurrentUserSeason(participant)}
                compact={compact}
                t={t}
                accentColor={selectedIdentity.accentColor}
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
        relative overflow-hidden
        bg-neo-navy-light rounded-neo-lg border-2 border-neo-black
        ${compact ? 'p-3' : 'p-4 sm:p-5'}
        shadow-hard
        ${accentIdentity.gridSkinClass}
      `}
      data-season-skin={accentIdentity.gridSkinClass}
    >
      {/* Season accent — the month's color runs along the top of every daily board. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accentIdentity.accentColor }}
      />

      {/* Header - always visible */}
      <div className="flex items-center gap-3 mb-3 mt-0.5">
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
            {activeTab === 'today' && !isLoading && !error && (
              <span
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black normal-case tracking-normal text-neo-lime"
                data-testid="live-indicator"
              >
                <span aria-hidden className="relative flex h-2 w-2">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neo-lime" />
                </span>
                {t('wordHunt.leaderboard.live')}
              </span>
            )}
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
        {showLanguageToggle && (
          <button
            type="button"
            onClick={toggleLanguageScope}
            title={t('wordHunt.leaderboard.languageScope')}
            className={`
              shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-neo-black
              text-[10px] sm:text-xs font-black shadow-hard-sm transition-all
              hover:-translate-y-px hover:shadow-hard active:translate-y-0.5 active:shadow-none
              ${languageScope === 'all' ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black'}
            `}
            data-testid="language-scope-toggle"
            data-scope={languageScope}
          >
            {languageScope === 'all' ? (
              <>
                <Globe aria-hidden className="w-3.5 h-3.5" />
                <span>{t('wordHunt.leaderboard.allLanguages')}</span>
              </>
            ) : (
              <>
                <span aria-hidden>{languageCfg?.flag ?? '🌐'}</span>
                <span>{t('wordHunt.leaderboard.myLanguage')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Countries on today's board */}
      {activeTab === 'today' && !isLoading && !error && countries.length > 0 && (
        <div
          className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-neo border border-neo-white/15 bg-neo-navy/60 text-xs sm:text-sm"
          data-testid="countries-strip"
        >
          <span className="flex items-center gap-0.5 leading-none" aria-hidden>
            {countries.slice(0, 8).map((code) => (
              <span key={code} title={code}>{getCountryFlag(code)}</span>
            ))}
          </span>
          <span className="text-neo-white/70 font-bold">
            {countries.length === 1
              ? t('wordHunt.leaderboard.countrySingular')
              : t('wordHunt.leaderboard.countries').replace('{count}', String(countries.length))}
          </span>
        </div>
      )}

      {/* Who to beat — the single closable gap, above the standings so the board
          reads as a target rather than a record. Today's tab only: the other
          tabs rank on cumulative totals, where "one good word passes them" is
          not true. */}
      {activeTab === 'today' && (
        <ChaseBanner
          participants={todayParticipants as ChaseParticipant[]}
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

      {/* Season identity + picker */}
      {activeTab === 'season' && (
        <div className="mb-4 space-y-2.5">
          {selectedSeason && (
            <DailySeasonRibbon
              season={selectedSeason}
              isCurrent={selectedSeason.isCurrent}
              t={t}
            />
          )}
          {seasons && seasons.length > 1 && (
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5"
              role="group"
              aria-label={t('wordHunt.leaderboard.seasonPicker')}
            >
              {seasons.map((s) => {
                const active = s.id === selectedSeasonId;
                const identity = getSeasonIdentity(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSeasonId(s.id)}
                    aria-pressed={active}
                    title={s.name}
                    className={`
                      shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-neo border-2 border-neo-black
                      text-[11px] sm:text-xs font-black transition-all shadow-hard-sm
                      hover:-translate-y-px hover:shadow-hard active:translate-y-0.5 active:shadow-none
                      ${active ? 'text-neo-black' : 'bg-neo-navy text-neo-white/80'}
                    `}
                    style={active ? { backgroundColor: identity.accentColor } : undefined}
                  >
                    <span aria-hidden>{identity.twist.emoji}</span>
                    <span>{t('wordHunt.leaderboard.season')} {s.id}</span>
                    {s.isCurrent && (
                      <span className="ms-0.5 px-1 rounded-full bg-neo-black/80 text-neo-lime text-[9px] uppercase tracking-wide">
                        {t('wordHunt.leaderboard.currentSeason')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

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
