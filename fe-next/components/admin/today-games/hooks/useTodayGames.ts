'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  GamesResponse,
  UnifiedGame,
  GameTypeFilter,
  SortField,
  SortOrder,
  GamesStats,
} from '../types';
import {
  getTodayDateString,
  DEFAULT_PAGE_SIZE,
  AUTO_REFRESH_INTERVAL,
} from '../constants';

interface UseTodayGamesOptions {
  authToken: string;
}

interface UseTodayGamesReturn {
  // Data
  data: GamesResponse | null;
  filteredGames: UnifiedGame[];
  stats: GamesStats;
  lastRefresh: number;

  // Loading/Error states
  loading: boolean;
  error: string | null;

  // Filters
  languageFilter: string;
  gameTypeFilter: GameTypeFilter;
  rankedFilter: string;
  setLanguageFilter: (filter: string) => void;
  setGameTypeFilter: (filter: GameTypeFilter) => void;
  setRankedFilter: (filter: string) => void;

  // Sorting
  sortField: SortField;
  sortOrder: SortOrder;
  handleSort: (field: SortField) => void;

  // Pagination
  page: number;
  pageSize: number;
  setPage: (page: number | ((prev: number) => number)) => void;

  // Actions
  refresh: () => void;
}

export function useTodayGames({ authToken }: UseTodayGamesOptions): UseTodayGamesReturn {
  // Data state
  const [data, setData] = useState<GamesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Filter state
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all');
  const [rankedFilter, setRankedFilter] = useState<string>('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  // Fetch games data
  const fetchTodayGames = useCallback(async () => {
    try {
      const todayDate = getTodayDateString();
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        startDate: todayDate,
        endDate: todayDate,
        sortBy: sortField,
        sortOrder: sortOrder,
      });

      if (languageFilter !== 'all') {
        params.set('language', languageFilter);
      }
      if (rankedFilter !== 'all') {
        params.set('isRanked', rankedFilter);
      }

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
  }, [authToken, page, pageSize, sortField, sortOrder, languageFilter, rankedFilter]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    setLoading(true);
    fetchTodayGames();
  }, [fetchTodayGames]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayGames();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTodayGames]);

  // Manual refresh handler
  const refresh = useCallback(() => {
    setLoading(true);
    fetchTodayGames();
  }, [fetchTodayGames]);

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  }, [sortField]);

  // Filter setters that reset page
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

  // Filter games by type client-side (API doesn't have gameType filter)
  const filteredGames = useMemo(() => {
    if (!data?.games) return [];
    if (gameTypeFilter === 'all') return data.games;

    return data.games.filter((game) => {
      switch (gameTypeFilter) {
        case 'multiplayer':
          return game.mode === 'ranked' || game.mode === 'casual';
        case 'word_hunt':
          return game.mode === 'word_hunt';
        case 'daily_challenge':
          return game.mode === 'daily_challenge';
        case 'drill':
          return game.mode === 'drill';
        default:
          return true;
      }
    });
  }, [data?.games, gameTypeFilter]);

  // Calculate stats from breakdown
  const stats = useMemo((): GamesStats => {
    if (!data?.breakdown) {
      return { total: 0, multiplayer: 0, wordHunt: 0, daily: 0, drills: 0 };
    }
    const b = data.breakdown;
    return {
      total:
        b.authenticatedGames +
        b.guestGames +
        b.wordHuntGames +
        b.dailyChallengeGames +
        b.drillGames,
      multiplayer: b.authenticatedGames + b.guestGames,
      wordHunt: b.wordHuntGames,
      daily: b.dailyChallengeGames,
      drills: b.drillGames,
    };
  }, [data?.breakdown]);

  return {
    // Data
    data,
    filteredGames,
    stats,
    lastRefresh,

    // Loading/Error states
    loading,
    error,

    // Filters
    languageFilter,
    gameTypeFilter,
    rankedFilter,
    setLanguageFilter: handleSetLanguageFilter,
    setGameTypeFilter: handleSetGameTypeFilter,
    setRankedFilter: handleSetRankedFilter,

    // Sorting
    sortField,
    sortOrder,
    handleSort,

    // Pagination
    page,
    pageSize,
    setPage,

    // Actions
    refresh,
  };
}
