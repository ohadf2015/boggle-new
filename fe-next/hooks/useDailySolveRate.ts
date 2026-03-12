'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Fetches the solve rate for today's daily challenge.
 * Returns percentage of attempts that were solved.
 */
export function useDailySolveRate(language: string) {
  const [solveRate, setSolveRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        setSolveRate(Math.round((solved / data.length) * 100));
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [language]);

  return { solveRate, loading };
}
