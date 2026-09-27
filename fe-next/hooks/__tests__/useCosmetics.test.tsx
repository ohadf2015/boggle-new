import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCosmetics } from '../useCosmetics';
import { COSMETICS } from '@/lib/cosmetics';

// Mock localStorage
const storage: Record<string, string> = {};
vi.mock('@/utils/storageHelpers', () => ({
  getJsonFromLocalStorage: (key: string, defaultValue: unknown) => {
    const val = storage[key];
    return val ? JSON.parse(val) : defaultValue;
  },
  saveJsonToLocalStorage: (key: string, value: unknown) => {
    storage[key] = JSON.stringify(value);
  },
}));

describe('useCosmetics', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  it('returns unlocked cosmetics based on player state', () => {
    const { result } = renderHook(() =>
      useCosmetics({ rankTier: 'Gold', streakDays: 0, coins: 0 })
    );
    // Gold unlocks: defaults + bronze + silver + gold rank items.
    // Tier ids are lowercase (LEADERBOARD_TIER_IDS); rankAtLeast lowercases both sides.
    const goldRankItems = COSMETICS.filter(
      (c) => c.unlockCondition.type === 'rank' &&
        ['bronze', 'silver', 'gold'].includes(c.unlockCondition.tier)
    );
    const defaults = COSMETICS.filter((c) => c.unlockCondition.type === 'default');
    expect(result.current.unlockedCosmetics.length).toBe(defaults.length + goldRankItems.length);
  });

  it('equips a cosmetic and persists to storage', () => {
    const { result } = renderHook(() =>
      useCosmetics({ rankTier: 'Gold', streakDays: 0, coins: 0 })
    );
    act(() => {
      result.current.equipCosmetic('tile-default');
    });
    expect(result.current.equippedCosmetics.tileSkin?.id).toBe('tile-default');
    // Persisted
    expect(storage['lexiclash_cosmetics_equipped']).toBeDefined();
  });

  it('getCosmeticsByCategory returns filtered list with unlock status', () => {
    const { result } = renderHook(() =>
      useCosmetics({ rankTier: 'Unranked', streakDays: 0, coins: 0 })
    );
    const tiles = result.current.getCosmeticsByCategory('tileSkin');
    expect(tiles.length).toBe(COSMETICS.filter((c) => c.category === 'tileSkin').length);
    // Default tile is unlocked
    const defaultTile = tiles.find((t) => t.id === 'tile-default');
    expect(defaultTile?.isUnlocked).toBe(true);
    // Neon tile (Silver rank) is locked
    const neonTile = tiles.find((t) => t.id === 'tile-neon');
    expect(neonTile?.isUnlocked).toBe(false);
  });

  it('purchaseCosmetic unlocks a purchasable item and deducts coins', async () => {
    const mockSpendCoins = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useCosmetics({ rankTier: 'Unranked', streakDays: 0, coins: 200, spendCoins: mockSpendCoins })
    );
    let success: boolean = false;
    await act(async () => {
      success = await result.current.purchaseCosmetic('tile-wooden');
    });
    expect(success).toBe(true);
    expect(mockSpendCoins).toHaveBeenCalledWith(expect.any(Number), 'cosmetic_purchase', { cosmeticId: 'tile-wooden' });
    expect(result.current.unlockedCosmetics.some((c) => c.id === 'tile-wooden')).toBe(true);
  });

  it('purchaseCosmetic fails if not enough coins', async () => {
    const { result } = renderHook(() =>
      useCosmetics({ rankTier: 'Unranked', streakDays: 0, coins: 10 })
    );
    let success: boolean = true;
    await act(async () => {
      success = await result.current.purchaseCosmetic('tile-wooden');
    });
    expect(success).toBe(false);
  });

  it('purchaseCosmetic fails if spendCoins rejects', async () => {
    const mockSpendCoins = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useCosmetics({ rankTier: 'Unranked', streakDays: 0, coins: 200, spendCoins: mockSpendCoins })
    );
    let success: boolean = true;
    await act(async () => {
      success = await result.current.purchaseCosmetic('tile-wooden');
    });
    expect(success).toBe(false);
    expect(result.current.unlockedCosmetics.some((c) => c.id === 'tile-wooden')).toBe(false);
  });
});
