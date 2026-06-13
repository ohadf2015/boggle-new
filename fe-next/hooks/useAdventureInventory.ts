/**
 * useAdventureInventory — read-only fetch of player inventory from
 * /api/adventure/inventory. Server is source of truth; no localStorage.
 *
 * Consumers: AdventureView (collectionCount badge), AdventureViewModals
 * (CollectionPanel). Inventory rows mirror the `player_inventory` Supabase
 * table columns returned by the API route.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';

export interface InventoryItem {
  item_id: string;
  item_type: string;
  category: string;
  rarity: string;
  quantity: number;
  source_world: number | null;
  source_level: number | null;
  earned_at: string;
}

export interface UseAdventureInventoryReturn {
  inventory: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdventureInventory(): UseAdventureInventoryReturn {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/adventure/inventory');
      if (!res.ok) {
        if (mountedRef.current) {
          setError(`Failed to fetch inventory (${res.status})`);
          setIsLoading(false);
        }
        return;
      }
      const data = await res.json();
      if (mountedRef.current) {
        setInventory(Array.isArray(data?.items) ? data.items : []);
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchInventory();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchInventory]);

  return { inventory, isLoading, error, refresh: fetchInventory };
}
