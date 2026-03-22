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

      const { data, error } = await supabase!
        .from('daily_puzzle_attempts')
        .select('solved', { count: 'exact' })
        .eq('puzzle_date', today)
        .eq('language', language);

      if (cancelled) return;

      if (!error && data && data.length > 0) {
        const solved = data.filter((r: any) => r.solved).length;
        const rate = Math.round((solved / data.length) * 100);
        // Avoid showing "0% solved" when people actually solved it — show at least 1%
        setSolveRate(solved > 0 && rate === 0 ? 1 : rate);
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [language, initialSolveRate]);

  return { solveRate, loading };
}
