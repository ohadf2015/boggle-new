'use client';

import { useEffect, useState } from 'react';
import { useLiveRoomStats } from './useLiveRoomStats';
import { supabase } from '@/lib/supabase';

/**
 * Aggregates stats for the landing page social proof bar.
 * Uses live room stats for dynamic values, static values for game modes/languages.
 */
export function useLandingStats() {
  const { activePlayers, isLoading } = useLiveRoomStats();
  const [gamesToday, setGamesToday] = useState(0);

  useEffect(() => {
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
  }, []);

  return {
    activePlayers,
    gamesToday,
    gameModes: 4,   // static: Solo, Multiplayer, Daily Challenge, Adventure
    languages: 5,   // static: en, he, sv, ja, es
    loading: isLoading,
  };
}
