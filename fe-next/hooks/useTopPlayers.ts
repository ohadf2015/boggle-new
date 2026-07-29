'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface TopPlayer {
  id: string;
  username: string;
  displayName: string | null;
  totalScore: number;
  avatarImage: string | null;
  avatarConfig: CustomAvatarConfig | null;
  prestigeLevel: number;
}

// Module-level cache for top players
const topPlayersCache: {
  data: TopPlayer[] | null;
  timestamp: number;
  limit: number;
} = { data: null, timestamp: 0, limit: 0 };

const TOP_PLAYERS_CACHE_TTL_MS = 120_000; // 2 minutes

interface UseTopPlayersOptions {
  /** Pre-fetched server data — skips client fetch when fresh */
  initialData?: TopPlayer[];
}

export function useTopPlayers(limit = 5, options: UseTopPlayersOptions = {}) {
  const { initialData } = options;

  // Seed module cache with server-provided data so subsequent renders skip fetch
  if (
    initialData &&
    initialData.length > 0 &&
    topPlayersCache.data === null
  ) {
    topPlayersCache.data = initialData;
    topPlayersCache.timestamp = Date.now();
    topPlayersCache.limit = limit;
  }

  const cached = topPlayersCache.limit === limit ? topPlayersCache.data : null;
  const isCacheFresh = () => cached && (Date.now() - topPlayersCache.timestamp) < TOP_PLAYERS_CACHE_TTL_MS;

  const [players, setPlayers] = useState<TopPlayer[]>(cached || initialData || []);
  const [loading, setLoading] = useState(!cached && !initialData);

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
      const seasonResp = await supabase!.rpc('get_current_season_id');
      const seasonId = (seasonResp?.data as number | null) ?? 1;
      const { data, error } = await supabase!
        .from('leaderboard')
        .select('player_id, username, display_name, total_score, avatar_image, avatar_config, profiles!leaderboard_player_id_fkey(prestige_level)')
        .eq('season_id', seasonId)
        .gt('total_score', 0)
        .order('total_score', { ascending: false })
        .limit(limit);

      if (cancelled) return;

      if (!error && data) {
        const mapped = data.map((row: any) => {
          // PostgREST embed returns either an object or array depending on cardinality
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            id: row.player_id,
            username: row.username,
            displayName: row.display_name,
            totalScore: row.total_score,
            avatarImage: row.avatar_image,
            avatarConfig: row.avatar_config,
            prestigeLevel: profile?.prestige_level ?? 0,
          };
        });
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
