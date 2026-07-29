import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  COSMETICS,
  getUnlockedCosmetics,
  getEquippedCosmetics,
  isUnlocked,
  getCosmeticsByCategory as getCosmeticsByCat,
  type Cosmetic,
  type CosmeticCategory,
  type PlayerCosmeticState,
} from '@/lib/cosmetics';
import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
} from '@/utils/storageHelpers';

const EQUIPPED_KEY = 'lexiclash_cosmetics_equipped';
const PURCHASED_KEY = 'lexiclash_cosmetics_purchased';

interface UseCosmeticsInput {
  rankTier: string;
  streakDays: number;
  coins: number;
  spendCoins?: (amount: number, reason: string, metadata?: Record<string, string | number>) => Promise<boolean>;
}

interface CosmeticWithStatus extends Cosmetic {
  isUnlocked: boolean;
  isEquipped: boolean;
}

function syncCosmeticsToSupabase(
  userId: string,
  equipped: Partial<Record<CosmeticCategory, string>>,
  purchased: string[],
): void {
  if (!supabase) return;
  void supabase
    .from('profiles')
    .update({ equipped_cosmetics: equipped, purchased_cosmetics: purchased })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.error('[Cosmetics] Supabase sync failed:', error.message);
    }, (err) => {
      console.error('[Cosmetics] Supabase sync error:', err);
    });
}

export function useCosmetics(input: UseCosmeticsInput) {
  const { user, isAuthenticated } = useAuth();
  const hasSyncedRef = useRef(false);

  const [purchasedIds, setPurchasedIds] = useState<string[]>(() =>
    getJsonFromLocalStorage<string[]>(PURCHASED_KEY, [])
  );
  const [equippedIds, setEquippedIds] = useState<Partial<Record<CosmeticCategory, string>>>(() =>
    getJsonFromLocalStorage<Partial<Record<CosmeticCategory, string>>>(EQUIPPED_KEY, {})
  );

  // Fetch from Supabase on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || hasSyncedRef.current || !supabase) return;
    hasSyncedRef.current = true;

    supabase
      .from('profiles')
      .select('equipped_cosmetics, purchased_cosmetics')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        if (data.equipped_cosmetics) {
          const eq = data.equipped_cosmetics as Partial<Record<CosmeticCategory, string>>;
          setEquippedIds(eq);
          saveJsonToLocalStorage(EQUIPPED_KEY, eq);
        }
        if (data.purchased_cosmetics) {
          const pc = data.purchased_cosmetics as string[];
          setPurchasedIds(pc);
          saveJsonToLocalStorage(PURCHASED_KEY, pc);
        }
      }, () => {});
  }, [isAuthenticated, user?.id]);

  const playerState: PlayerCosmeticState = useMemo(
    () => ({
      rankTier: input.rankTier,
      streakDays: input.streakDays,
      coins: input.coins,
      seasonRewards: [],
      purchasedIds,
      equippedIds,
    }),
    [input.rankTier, input.streakDays, input.coins, purchasedIds, equippedIds]
  );

  const unlockedCosmetics = useMemo(
    () => getUnlockedCosmetics(playerState),
    [playerState]
  );

  const equippedCosmetics = useMemo(
    () => getEquippedCosmetics(playerState),
    [playerState]
  );

  const equipCosmetic = useCallback(
    (cosmeticId: string) => {
      const cosmetic = COSMETICS.find((c) => c.id === cosmeticId);
      if (!cosmetic) return;
      if (!isUnlocked(cosmeticId, playerState)) return;

      const next = { ...equippedIds, [cosmetic.category]: cosmeticId };
      setEquippedIds(next);
      saveJsonToLocalStorage(EQUIPPED_KEY, next);
      if (isAuthenticated && user?.id) syncCosmeticsToSupabase(user.id, next, purchasedIds);
    },
    [equippedIds, playerState, isAuthenticated, user, purchasedIds]
  );

  const purchaseCosmetic = useCallback(
    async (cosmeticId: string): Promise<boolean> => {
      const cosmetic = COSMETICS.find((c) => c.id === cosmeticId);
      if (!cosmetic) return false;
      if (cosmetic.unlockCondition.type !== 'purchase') return false;
      const cost = cosmetic.unlockCondition.cost;
      if (input.coins < cost) return false;
      if (purchasedIds.includes(cosmeticId)) return false;

      // Deduct coins via CoinContext
      if (input.spendCoins) {
        const success = await input.spendCoins(cost, 'cosmetic_purchase', { cosmeticId });
        if (!success) return false;
      }

      const next = [...purchasedIds, cosmeticId];
      setPurchasedIds(next);
      saveJsonToLocalStorage(PURCHASED_KEY, next);
      if (isAuthenticated && user?.id) syncCosmeticsToSupabase(user.id, equippedIds, next);
      return true;
    },
    [input, purchasedIds, isAuthenticated, user, equippedIds]
  );

  const getCosmeticsByCategory = useCallback(
    (category: CosmeticCategory): CosmeticWithStatus[] => {
      return getCosmeticsByCat(category).map((c) => ({
        ...c,
        isUnlocked: isUnlocked(c.id, playerState),
        isEquipped: equippedIds[category] === c.id,
      }));
    },
    [playerState, equippedIds]
  );

  return {
    unlockedCosmetics,
    equippedCosmetics,
    equipCosmetic,
    purchaseCosmetic,
    getCosmeticsByCategory,
  };
}
