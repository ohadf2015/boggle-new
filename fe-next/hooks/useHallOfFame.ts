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

/**
 * Fetches top players from the past 7 days for the "Hall of Fame" section.
 * Uses the leaderboard table ordered by score.
 */
export function useHallOfFame(limit = 5) {
  const [champions, setChampions] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      // For now, use top leaderboard players as "champions"
      // A proper weekly champions table can be added later
      const { data, error } = await supabase!
        .from('leaderboard')
        .select('username, display_name, total_score, avatar_image, avatar_config, profile_picture_url')
        .order('total_score', { ascending: false })
        .limit(limit);

      if (cancelled) return;

      if (!error && data) {
        setChampions(
          data.map((row: any) => ({
            username: row.username,
            displayName: row.display_name,
            totalScore: row.total_score,
            avatarImage: row.avatar_image,
            avatarConfig: row.avatar_config,
            profilePictureUrl: row.profile_picture_url,
          }))
        );
      }
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [limit]);

  return { champions, loading };
}
