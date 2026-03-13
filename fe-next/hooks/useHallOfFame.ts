'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface HallOfFameEntry {
  username: string;
  displayName: string | null;
  totalScore: number;
  avatarImage: string | null;
  avatarConfig: Record<string, string> | null;
  profilePictureUrl: string | null;
}

// Module-level cache for hall of fame data
const hallOfFameCache: {
  data: HallOfFameEntry[] | null;
  timestamp: number;
  limit: number;
} = { data: null, timestamp: 0, limit: 0 };

const HOF_CACHE_TTL_MS = 120_000; // 2 minutes

/**
 * Fetches top players from the past 7 days for the "Hall of Fame" section.
 * Uses the leaderboard table ordered by score.
 * Implements stale-while-revalidate caching for instant page loads.
 */
export function useHallOfFame(limit = 5) {
  const cached = hallOfFameCache.limit === limit ? hallOfFameCache.data : null;
  const isCacheFresh = () => cached && (Date.now() - hallOfFameCache.timestamp) < HOF_CACHE_TTL_MS;

  const [champions, setChampions] = useState<HallOfFameEntry[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Skip fetch if cache is fresh
    if (isCacheFresh()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      const { data, error } = await supabase!
        .from('leaderboard')
        .select('username, display_name, total_score, avatar_image, avatar_config, profile_picture_url')
        .order('total_score', { ascending: false })
        .limit(limit);

      if (cancelled) return;

      if (!error && data) {
        const mapped = data.map((row: any) => ({
          username: row.username,
          displayName: row.display_name,
          totalScore: row.total_score,
          avatarImage: row.avatar_image,
          avatarConfig: row.avatar_config,
          profilePictureUrl: row.profile_picture_url,
        }));
        setChampions(mapped);
        // Update module-level cache
        hallOfFameCache.data = mapped;
        hallOfFameCache.timestamp = Date.now();
        hallOfFameCache.limit = limit;
      }
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { champions, loading };
}
