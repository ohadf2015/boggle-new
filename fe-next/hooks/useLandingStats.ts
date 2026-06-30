'use client';

import { useEffect, useState } from 'react';
import { useLiveRoomStats } from './useLiveRoomStats';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_GAME_LANGUAGES } from '@/lib/languageConfig';

interface UseLandingStatsOptions {
  /** Pre-fetched server value — skips client fetch */
  initialGamesToday?: number;
}

/**
 * Aggregates stats for the landing page social proof bar.
 * Uses live room stats for dynamic values, static values for game modes/languages.
 * Pass `initialGamesToday` from server component to avoid a client-side Supabase round-trip.
 */
export function useLandingStats(options: UseLandingStatsOptions = {}) {
  const { initialGamesToday } = options;
  const { activePlayers, isLoading } = useLiveRoomStats();
  const [gamesToday, setGamesToday] = useState(initialGamesToday ?? 0);

  useEffect(() => {
    // Skip client fetch when server data was provided
    if (initialGamesToday !== undefined) return;

    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);

    supabase
      ?.from('game_results')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00Z`)
      .then(({ count }) => {
        if (!cancelled && count != null) setGamesToday(count);
      });

    return () => { cancelled = true; };
  }, [initialGamesToday]);

  return {
    activePlayers,
    gamesToday,
    gameModes: 4,   // static: Solo, Multiplayer, Daily Challenge, Adventure
    // Derive from the single source of truth so the count never drifts when a
    // language ships (it silently read "5" after Russian was added).
    languages: SUPPORTED_GAME_LANGUAGES.length,
    loading: isLoading,
  };
}
