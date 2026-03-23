/**
 * usePlayerRecap Hook
 *
 * Fetches weekly and monthly player recaps. If no pre-computed recap
 * exists in the player_recaps table, computes one from game_results.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { PlayerRecap } from '@/shared/types/growth';

export interface UsePlayerRecapReturn {
  weeklyRecap: PlayerRecap | null;
  monthlyRecap: PlayerRecap | null;
  loading: boolean;
}

function parseRecap(row: Record<string, unknown>): PlayerRecap {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    periodType: row.period_type as PlayerRecap['periodType'],
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    totalGames: (row.total_games as number) ?? 0,
    totalScore: (row.total_score as number) ?? 0,
    totalWords: (row.total_words as number) ?? 0,
    longestWord: row.longest_word as string | undefined,
    rarestWord: row.rarest_word as string | undefined,
    bestScore: (row.best_score as number) ?? 0,
    bestCombo: (row.best_combo as number) ?? 0,
    streakDays: (row.streak_days as number) ?? 0,
    rankChange: (row.rank_change as number) ?? 0,
    gamesWon: (row.games_won as number) ?? 0,
    favoriteMode: row.favorite_mode as string | undefined,
    uniqueWordsFound: (row.unique_words_found as number) ?? 0,
    improvementPercent: (row.improvement_percent as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

async function computeRecapFromResults(
  userId: string,
  periodStart: string,
  periodEnd: string,
  periodType: 'weekly' | 'monthly',
): Promise<PlayerRecap | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('score, words_found, best_word, combo_max, game_mode, won, created_at')
      .eq('user_id', userId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    const rows = data as Record<string, unknown>[];
    let totalScore = 0;
    let totalWords = 0;
    let bestScore = 0;
    let bestCombo = 0;
    let gamesWon = 0;
    let longestWord = '';
    const modeCounts: Record<string, number> = {};
    const wordSet = new Set<string>();

    for (const row of rows) {
      const score = (row.score as number) ?? 0;
      totalScore += score;
      if (score > bestScore) bestScore = score;

      const combo = (row.combo_max as number) ?? 0;
      if (combo > bestCombo) bestCombo = combo;

      if (row.won) gamesWon++;

      const mode = (row.game_mode as string) ?? 'classic';
      modeCounts[mode] = (modeCounts[mode] ?? 0) + 1;

      const words = row.words_found;
      if (Array.isArray(words)) {
        totalWords += words.length;
        for (const w of words) {
          const word = String(w);
          wordSet.add(word);
          if (word.length > longestWord.length) longestWord = word;
        }
      }
    }

    const favoriteMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      id: `computed-${periodType}-${periodStart}`,
      userId,
      periodType,
      periodStart,
      periodEnd,
      totalGames: rows.length,
      totalScore,
      totalWords,
      longestWord: longestWord || undefined,
      rarestWord: undefined,
      bestScore,
      bestCombo,
      streakDays: 0,
      rankChange: 0,
      gamesWon,
      favoriteMode,
      uniqueWordsFound: wordSet.size,
      improvementPercent: 0,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function usePlayerRecap(): UsePlayerRecapReturn {
  const { user } = useAuth();
  const [weeklyRecap, setWeeklyRecap] = useState<PlayerRecap | null>(null);
  const [monthlyRecap, setMonthlyRecap] = useState<PlayerRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchRecaps = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const weekStart = getWeekStart();
      const monthStart = getMonthStart();

      // Try fetching pre-computed recaps
      const { data: precomputed } = await supabase
        .from('player_recaps')
        .select('*')
        .eq('user_id', user.id)
        .in('period_start', [weekStart, monthStart]);

      const rows = (precomputed ?? []) as Record<string, unknown>[];
      let weekly: PlayerRecap | null = null;
      let monthly: PlayerRecap | null = null;

      for (const row of rows) {
        const recap = parseRecap(row);
        if (recap.periodType === 'weekly') weekly = recap;
        if (recap.periodType === 'monthly') monthly = recap;
      }

      // Compute from game_results if no pre-computed recap
      const now = new Date().toISOString();

      if (!weekly) {
        weekly = await computeRecapFromResults(user.id, weekStart, now, 'weekly');
      }
      if (!monthly) {
        monthly = await computeRecapFromResults(user.id, monthStart, now, 'monthly');
      }

      setWeeklyRecap(weekly);
      setMonthlyRecap(monthly);
    } catch {
      setWeeklyRecap(null);
      setMonthlyRecap(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchRecaps();
  }, [fetchRecaps]);

  return { weeklyRecap, monthlyRecap, loading };
}
