'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRecentClassroomGames, type RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import logger from '@/utils/logger';

export interface UseRecentClassroomGamesOptions {
  classroomId: string;
  /** How many recent games to load (default 5). */
  limit?: number;
}

interface State {
  games: RecentClassroomGame[];
  isLoading: boolean;
  error: Error | null;
}

export interface UseRecentClassroomGamesReturn extends State {
  refresh: () => Promise<void>;
}

/**
 * Recent live classroom games for the teacher's "Last class game" card.
 * Mirrors useClassroomAnalytics: loading → games | error, plus `refresh`.
 */
export function useRecentClassroomGames({
  classroomId,
  limit = 5,
}: UseRecentClassroomGamesOptions): UseRecentClassroomGamesReturn {
  const isMounted = useMounted();
  const { t } = useLanguage();
  // `t` identity can change with the active language; keep the fetch
  // callback stable so a language switch does not refetch the data.
  const tRef = useRef(t);
  tRef.current = t;

  const [state, setState] = useState<State>({ games: [], isLoading: true, error: null });

  const fetchGames = useCallback(async () => {
    if (!classroomId) {
      setState({ games: [], isLoading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { data, error } = await getRecentClassroomGames(classroomId, limit, {
        fallbackName: tRef.current('teacher.lastGame.studentFallback'),
      });
      if (!isMounted.current) return;
      if (error) {
        setState({ games: [], isLoading: false, error: new Error(error.message) });
        return;
      }
      setState({ games: data, isLoading: false, error: null });
    } catch (err) {
      logger.error('Error fetching recent classroom games:', err);
      if (isMounted.current) {
        setState({
          games: [],
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load recent games'),
        });
      }
    }
  }, [classroomId, limit, isMounted]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const refresh = useCallback(async () => {
    await fetchGames();
  }, [fetchGames]);

  return { ...state, refresh };
}

export type { RecentClassroomGame };
export default useRecentClassroomGames;
