'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface TierPositionNeighbor {
  player_id: string;
  display_name: string | null;
  total_score: number;
  avatar_image: string | null;
  avatar_config: unknown | null;
  rank_in_tier: number;
}

export interface TierPosition {
  tier_id: 'stone' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'grandmaster';
  rank_in_tier: number;
  tier_population: number;
  neighbors: TierPositionNeighbor[];
}

export function useTierPosition(userId: string | undefined, seasonId?: number) {
  return useQuery<TierPosition | null>({
    queryKey: ['tier-position', userId, seasonId ?? 'current'],
    queryFn: async () => {
      if (!supabase) throw new Error('supabase client not initialized');
      const { data, error } = await supabase.rpc('get_user_tier_position', {
        p_user_id: userId,
        p_season_id: seasonId ?? null,
      });
      if (error) throw error;
      return data as TierPosition | null;
    },
    enabled: !!userId && !!supabase,
    staleTime: 60_000,
    retry: false,
  });
}
