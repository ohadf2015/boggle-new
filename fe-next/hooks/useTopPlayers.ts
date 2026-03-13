'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface TopPlayer {
  username: string;
  displayName: string | null;
  totalScore: number;
  avatarImage: string | null;
  avatarConfig: CustomAvatarConfig | null;
  profilePictureUrl: string | null;
}

// Module-level cache for top players
const topPlayersCache: {
  data: TopPlayer[] | null;
  timestamp: number;
  limit: number;
} = { data: null, timestamp: 0, limit: 0 };

const TOP_PLAYERS_CACHE_TTL_MS = 120_000; // 2 minutes

export function useTopPlayers(limit = 5) {
  const cached = topPlayersCache.limit === limit ? topPlayersCache.data : null;
  const isCacheFresh = () => cached && (Date.now() - topPlayersCache.timestamp) < TOP_PLAYERS_CACHE_TTL_MS;

  const [players, setPlayers] = useState<TopPlayer[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

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
        setPlayers(mapped);
        topPlayersCache.data = mapped;
        topPlayersCache.timestamp = Date.now();
        topPlayersCache.limit = limit;
      }
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return { players, loading };
}
