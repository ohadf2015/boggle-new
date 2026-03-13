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

export function useTopPlayers(limit = 5) {
  const [players, setPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      const { data, error } = await supabase!
        .from('leaderboard')
        .select('username, display_name, total_score, avatar_image, avatar_config, profile_picture_url')
        .order('total_score', { ascending: false })
        .limit(limit);

      if (cancelled) return;

      if (!error && data) {
        setPlayers(
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

  return { players, loading };
}
