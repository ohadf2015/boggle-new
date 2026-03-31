import { useState, useCallback, useMemo } from 'react';
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
}

interface CosmeticWithStatus extends Cosmetic {
  isUnlocked: boolean;
  isEquipped: boolean;
}

export function useCosmetics(input: UseCosmeticsInput) {
  const [purchasedIds, setPurchasedIds] = useState<string[]>(() =>
    getJsonFromLocalStorage<string[]>(PURCHASED_KEY, [])
  );
  const [equippedIds, setEquippedIds] = useState<Partial<Record<CosmeticCategory, string>>>(() =>
    getJsonFromLocalStorage<Partial<Record<CosmeticCategory, string>>>(EQUIPPED_KEY, {})
  );

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
    },
    [equippedIds, playerState]
  );

  const purchaseCosmetic = useCallback(
    (cosmeticId: string): boolean => {
      const cosmetic = COSMETICS.find((c) => c.id === cosmeticId);
      if (!cosmetic) return false;
      if (cosmetic.unlockCondition.type !== 'purchase') return false;
      if (input.coins < cosmetic.unlockCondition.cost) return false;
      if (purchasedIds.includes(cosmeticId)) return false;

      const next = [...purchasedIds, cosmeticId];
      setPurchasedIds(next);
      saveJsonToLocalStorage(PURCHASED_KEY, next);
      return true;
    },
    [input.coins, purchasedIds]
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
