/**
 * useDynamicDifficulty Hook
 *
 * Fetches the difficulty offset for the current user and game mode.
 * Reports game results to update win rate tracking via Supabase RPC.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DifficultyTracking } from '@/shared/types/growth';

export interface UseDynamicDifficultyReturn {
  difficultyOffset: number;
  winRate: number;
  loading: boolean;
  reportGameResult: (won: boolean) => Promise<void>;
}

export function useDynamicDifficulty(gameMode: string): UseDynamicDifficultyReturn {
  const { user } = useAuth();
  const [tracking, setTracking] = useState<DifficultyTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;

  const fetchDifficulty = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('difficulty_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_mode', gameModeRef.current)
        .single();

      if (error || !data) {
        setTracking(null);
      } else {
        const row = data as Record<string, unknown>;
        setTracking({
          userId: row.user_id as string,
          gameMode: row.game_mode as string,
          recentWins: (row.recent_wins as number) ?? 0,
          recentGames: (row.recent_games as number) ?? 0,
          winRate: (row.win_rate as number) ?? 0,
          difficultyOffset: (row.difficulty_offset as number) ?? 0,
          lastAdjustmentAt: (row.last_adjustment_at as string) ?? '',
        });
      }
    } catch {
      setTracking(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchDifficulty();
  }, [fetchDifficulty]);

  const reportGameResult = useCallback(
    async (won: boolean): Promise<void> => {
      if (!user?.id || !supabase) return;

      try {
        const { data, error } = await supabase.rpc('update_difficulty_after_game', {
          p_user_id: user.id,
          p_game_mode: gameModeRef.current,
          p_won: won,
        });

        if (!error && data) {
          const row = data as Record<string, unknown>;
          setTracking({
            userId: user.id,
            gameMode: gameModeRef.current,
            recentWins: (row.recent_wins as number) ?? 0,
            recentGames: (row.recent_games as number) ?? 0,
            winRate: (row.win_rate as number) ?? 0,
            difficultyOffset: (row.difficulty_offset as number) ?? 0,
            lastAdjustmentAt: (row.last_adjustment_at as string) ?? '',
          });
        } else if (!error) {
          // RPC may not return data; refetch
          fetchedRef.current = false;
          fetchDifficulty();
        }
      } catch {
        // Best-effort
      }
    },
    [user?.id, fetchDifficulty],
  );

  return {
    difficultyOffset: tracking?.difficultyOffset ?? 0,
    winRate: tracking?.winRate ?? 0,
    loading,
    reportGameResult,
  };
}
