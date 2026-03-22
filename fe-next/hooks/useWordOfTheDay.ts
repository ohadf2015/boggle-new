'use client';

/**
 * useWordOfTheDay Hook
 * Fetches the Word of the Day via Supabase REST.
 * Returns word, stats, whether current player found it, and loading state.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/** Curated word list — must match backend wordOfTheDayManager.ts WORD_POOL */
const WORD_POOL: string[] = [
  'crystal', 'garden', 'bridge', 'shadow', 'temple', 'forest', 'dragon', 'silver',
  'planet', 'frozen', 'castle', 'marble', 'throne', 'harbor', 'sunset', 'wizard',
  'beacon', 'riddle', 'anchor', 'shield', 'scroll', 'mystic', 'falcon', 'legend',
  'spirit', 'timber', 'orchid', 'voyage', 'prism', 'comet', 'pearl', 'raven',
  'blaze', 'coral', 'ember', 'frost', 'haven', 'ivory', 'jewel', 'karma',
  'lumen', 'maple', 'noble', 'oasis', 'pixel', 'quest', 'reign', 'solar',
  'torch', 'ultra', 'vivid', 'wrath', 'zephyr', 'abyss', 'bloom', 'cedar',
  'drift', 'eagle', 'flame', 'gleam', 'honor', 'index', 'jolly', 'knack',
  'lunar', 'mirth', 'nexus', 'omega', 'plume', 'quilt', 'roost', 'spine',
  'tidal', 'unity', 'vigor', 'whirl', 'yield', 'zodiac', 'atlas', 'brush',
  'chord', 'delta', 'epoch', 'fjord', 'glyph', 'helix', 'ionic', 'jinx',
  'kayak', 'lyric', 'mocha', 'niche', 'orbit', 'pulse', 'quartz', 'rustic',
  'siren', 'trove', 'umbra', 'vault', 'wraith', 'xenon', 'yonder', 'zenith',
  'bliss', 'charm', 'dusk', 'fable', 'grace', 'haste', 'kneel', 'latch',
  'mural', 'nerve', 'onset', 'pluck', 'realm', 'storm', 'twist', 'verge',
];

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface WotdData {
  word: string;
  date: string;
  stats: { foundCount: number; totalPlayers: number; foundPercent: number };
  playerFound: boolean;
  loading: boolean;
  error: string | null;
}

export function useWordOfTheDay(language: string): WotdData {
  const { user } = useAuth();
  const [stats, setStats] = useState({ foundCount: 0, totalPlayers: 0, foundPercent: 0 });
  const [playerFound, setPlayerFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = getTodayDate();
  const seed = `${today}-${language}-wotd`;
  const index = Math.floor(seededRandom(seed) * WORD_POOL.length);
  const word = WORD_POOL[index];

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch global stats
      const { data: wotdRow } = await supabase
        .from('daily_word_of_day')
        .select('found_count, total_players')
        .eq('date', today)
        .eq('language', language)
        .single();

      if (wotdRow) {
        const fc = wotdRow.found_count ?? 0;
        const tp = wotdRow.total_players ?? 0;
        setStats({
          foundCount: fc,
          totalPlayers: tp,
          foundPercent: tp > 0 ? Math.round((fc / tp) * 100) : 0,
        });
      }

      // Check if current player found it
      if (user?.id) {
        const { data: playerRow } = await supabase
          .from('daily_word_of_day_players')
          .select('found')
          .eq('player_id', user.id)
          .eq('date', today)
          .single();

        if (playerRow) {
          setPlayerFound(!!playerRow.found);
        }
      }
    } catch {
      setError('Failed to load Word of the Day');
    } finally {
      setLoading(false);
    }
  }, [today, language, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { word, date: today, stats, playerFound, loading, error };
}
