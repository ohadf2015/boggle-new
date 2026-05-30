'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  GamesResponse,
  UnifiedGame,
  GameTypeFilter,
  SortField,
  SortOrder,
  GamesStats,
  GameLogSource,
} from '../types';
import {
  DEFAULT_PAGE_SIZE,
  AUTO_REFRESH_INTERVAL,
  getDateRangeStart,
  type DateRange,
} from '../constants';

interface UseTodayGamesOptions {
  authToken: string;
}

interface UseTodayGamesReturn {
  data: GamesResponse | null;
  filteredGames: UnifiedGame[];
  stats: GamesStats;
  lastRefresh: number;

  loading: boolean;
  error: string | null;

  languageFilter: string;
  gameTypeFilter: GameTypeFilter;
  rankedFilter: string;
  dateRange: DateRange;
  logSource: GameLogSource;
  setLanguageFilter: (filter: string) => void;
  setGameTypeFilter: (filter: GameTypeFilter) => void;
  setRankedFilter: (filter: string) => void;
  setDateRange: (range: DateRange) => void;
  setLogSource: (source: GameLogSource) => void;

  sortField: SortField;
  sortOrder: SortOrder;
  handleSort: (field: SortField) => void;

  page: number;
  pageSize: number;
  setPage: (page: number | ((prev: number) => number)) => void;

  refresh: () => void;
}

export function useTodayGames({ authToken }: UseTodayGamesOptions): UseTodayGamesReturn {
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all');
  const [rankedFilter, setRankedFilter] = useState<string>('all');
  const [dateRange, setDateRangeState] = useState<DateRange>('7d');
  const [logSource, setLogSourceState] = useState<GameLogSource>('analytics');

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  const fetchTodayGames = useCallback(async () => {
    try {
      const startDate = getDateRangeStart(dateRange);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy: sortField,
        sortOrder: sortOrder,
      });

      if (startDate) {
        params.set('startDate', startDate);
      }
      if (languageFilter !== 'all') {
        params.set('language', languageFilter);
      }
      if (rankedFilter !== 'all') {
        params.set('isRanked', rankedFilter);
      }
      if (gameTypeFilter !== 'all') {
        params.set('gameType', gameTypeFilter);
      }
      params.set('source', logSource);

      const response = await fetch(`/api/admin/game-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [authToken, page, pageSize, sortField, sortOrder, languageFilter, rankedFilter, gameTypeFilter, dateRange, logSource]);

  useEffect(() => {
    setLoading(true);
    fetchTodayGames();
  }, [fetchTodayGames]);

  // Auto-refresh only for the live "today" view — historical ranges are stable.
  useEffect(() => {
    if (dateRange !== 'today') return;
    const interval = setInterval(() => {
      fetchTodayGames();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTodayGames, dateRange]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchTodayGames();
  }, [fetchTodayGames]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  }, [sortField]);

  const handleSetLanguageFilter = useCallback((filter: string) => {
    setLanguageFilter(filter);
    setPage(1);
  }, []);

  const handleSetGameTypeFilter = useCallback((filter: GameTypeFilter) => {
    setGameTypeFilter(filter);
    setPage(1);
  }, []);

  const handleSetRankedFilter = useCallback((filter: string) => {
    setRankedFilter(filter);
    setPage(1);
  }, []);

  const handleSetDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
    setPage(1);
  }, []);

  const handleSetLogSource = useCallback((source: GameLogSource) => {
    setLogSourceState(source);
    setPage(1);
  }, []);

  // Server already applied gameType filter — no client-side narrowing needed.
  const filteredGames = useMemo(() => data?.games ?? [], [data?.games]);

  const stats = useMemo((): GamesStats => {
    if (!data?.breakdown) {
      return { total: 0, multiplayer: 0, wordHunt: 0, daily: 0, drills: 0, blast: 0, wordWheel: 0, practice: 0 };
    }
    const b = data.breakdown;
    const summed =
      b.authenticatedGames +
      b.guestGames +
      b.wordHuntGames +
      b.dailyChallengeGames +
      b.drillGames +
      (b.blastGames ?? 0) +
      (b.wordWheelGames ?? 0) +
      (b.practiceGames ?? 0);
    return {
      // The analytics source's per-mode buckets overlap (a game has an identity AND a
      // mode), so summing them double-counts. Trust the exact paginated totalCount when
      // present; only fall back to the disjoint-table sum for the legacy 'tables' source.
      total: data.pagination?.totalCount ?? summed,
      multiplayer: b.authenticatedGames + b.guestGames,
      wordHunt: b.wordHuntGames,
      daily: b.dailyChallengeGames,
      drills: b.drillGames,
      blast: b.blastGames ?? 0,
      wordWheel: b.wordWheelGames ?? 0,
      practice: b.practiceGames ?? 0,
    };
  }, [data?.breakdown, data?.pagination?.totalCount]);

  return {
    data,
    filteredGames,
    stats,
    lastRefresh,

    loading,
    error,

    languageFilter,
    gameTypeFilter,
    rankedFilter,
    dateRange,
    logSource,
    setLanguageFilter: handleSetLanguageFilter,
    setGameTypeFilter: handleSetGameTypeFilter,
    setRankedFilter: handleSetRankedFilter,
    setDateRange: handleSetDateRange,
    setLogSource: handleSetLogSource,

    sortField,
    sortOrder,
    handleSort,

    page,
    pageSize,
    setPage,

    refresh,
  };
}
