'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlayerCollectible, CollectibleItem } from '@/contexts/auth/authTypes';

interface UsePlayerCollectiblesReturn {
  collectibles: PlayerCollectible[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching player's collectibles
 */
export function usePlayerCollectibles(userId: string | undefined): UsePlayerCollectiblesReturn {
  const [collectibles, setCollectibles] = useState<PlayerCollectible[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCollectibles = useCallback(async () => {
    if (!userId || !supabase) {
      setCollectibles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('player_collectibles')
        .select(`
          id,
          collectible_id,
          acquired_at,
          is_equipped,
          equipped_slot,
          collectible:collectible_items (
            id,
            name_key,
            description_key,
            icon,
            image_url,
            category,
            rarity,
            cost,
            unlock_requirement,
            sort_order,
            is_active
          )
        `)
        .eq('player_id', userId)
        .order('acquired_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        // Transform the data to match our type
        const transformedCollectibles: PlayerCollectible[] = data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          collectible_id: item.collectible_id as string,
          acquired_at: item.acquired_at as string,
          is_equipped: item.is_equipped as boolean,
          equipped_slot: item.equipped_slot as string | null,
          collectible: item.collectible as CollectibleItem | undefined
        }));
        setCollectibles(transformedCollectibles);
      }
    } catch (err) {
      console.error('Error fetching collectibles:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch collectibles'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCollectibles();
  }, [fetchCollectibles]);

  return {
    collectibles,
    isLoading,
    error,
    refetch: fetchCollectibles
  };
}

export default usePlayerCollectibles;
