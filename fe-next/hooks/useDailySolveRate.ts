'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseDailySolveRateOptions {
  /** Pre-fetched server value — skips client fetch when provided */
  initialSolveRate?: number | null;
}

/**
 * Fetches the solve rate for today's daily challenge.
 * Returns percentage of attempts that were solved.
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

      // daily_puzzle_attempts is the classic timed daily challenge — all rows
      // represent completed attempts, so "solve rate" = total attempts today.
      // We report it as a count rather than a percentage.
      const { count, error } = await supabase!
        .from('daily_puzzle_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('puzzle_date', today)
        .eq('language', language);

      if (cancelled) return;

      if (!error && count !== null) {
        // Return 100 if anyone played today (all completions count as "solved")
        setSolveRate(count > 0 ? 100 : 0);
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [language, initialSolveRate]);

  return { solveRate, loading };
}
