'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseDailySolveRateOptions {
  /** Pre-fetched server value — skips client fetch when provided */
  initialSolveRate?: number | null;
}

/**
 * Fetches the solve rate for today's daily Word Hunt challenge.
 * Returns percentage (0-100) of players who solved the puzzle.
 * Pass `initialSolveRate` from a server component to eliminate the client-side fetch.
 */
export function useDailySolveRate(language: string, options: UseDailySolveRateOptions = {}) {
  const { initialSolveRate } = options;
  const [solveRate, setSolveRate] = useState<number | null>(
    initialSolveRate !== undefined ? initialSolveRate : null
  );
  const [loading, setLoading] = useState(initialSolveRate === undefined);

  useEffect(() => {
    // Skip client fetch when server data was provided
    if (initialSolveRate !== undefined) return;

    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const today = new Date().toISOString().split('T')[0];

      // Query the precomputed solve_rate from daily_word_hunt_stats view
      const { data, error } = await supabase!
        .from('daily_word_hunt_stats')
        .select('solve_rate')
        .eq('puzzle_date', today)
        .eq('language', language)
        .single();

      if (cancelled) return;

      if (!error && data?.solve_rate != null) {
        setSolveRate(Math.round(data.solve_rate));
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [language, initialSolveRate]);

  return { solveRate, loading };
}
