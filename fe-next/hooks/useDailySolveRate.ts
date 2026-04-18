'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Module-level cache to prevent re-fetches on re-mount (e.g., navigating away and back)
const solveRateCache: { value: number | null; lang: string; ts: number } = { value: null, lang: '', ts: 0 };
const SOLVE_RATE_CACHE_TTL = 120_000; // 2 minutes

function getCachedSolveRate(language: string): number | null {
  if (solveRateCache.lang === language && (Date.now() - solveRateCache.ts) < SOLVE_RATE_CACHE_TTL) {
    return solveRateCache.value;
  }
  return null;
}

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
    initialSolveRate !== undefined ? initialSolveRate : (getCachedSolveRate(language))
  );
  const [loading, setLoading] = useState(initialSolveRate === undefined && getCachedSolveRate(language) === null);
  const seededRef = useRef(false);

  useEffect(() => {
    // Seed module cache from server-provided initialData (once)
    if (initialSolveRate !== undefined && !seededRef.current) {
      seededRef.current = true;
      solveRateCache.value = initialSolveRate;
      solveRateCache.lang = language;
      solveRateCache.ts = Date.now();
      return;
    }

    // Skip fetch when server data or fresh cache is available
    if (initialSolveRate !== undefined) return;
    if (getCachedSolveRate(language) !== null) return;

    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase!
        .from('daily_word_hunt_stats')
        .select('solve_rate')
        .eq('puzzle_date', today)
        .eq('language', language)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data?.solve_rate != null) {
        const rate = Math.round(data.solve_rate);
        solveRateCache.value = rate;
        solveRateCache.lang = language;
        solveRateCache.ts = Date.now();
        setSolveRate(rate);
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [language, initialSolveRate]);

  return { solveRate, loading };
}
