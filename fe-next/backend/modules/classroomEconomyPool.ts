/**
 * What a chest can hand out: a wearable avatar part the catalog already names
 * in every locale. Only the level ladder carries those names, so the pool is
 * drawn from it. Legendary parts stay gold-only and never appear here.
 */

import { LEVEL_UNLOCK_LADDER, type LevelUnlock, type UnlockCategory } from '@/lib/avatar/unlocks';
import type { VisualTier } from '@/lib/avatar/rarity';
import type { ChestRarity } from '@/shared/constants/classroomEconomy';

export const CHEST_PART_TIER: Record<ChestRarity, Exclude<VisualTier, 'common' | 'legendary'>> = {
  common: 'rare',
  rare: 'rare',
  epic: 'epic',
};

const WEARABLE: ReadonlySet<string> = new Set<UnlockCategory>(['base', 'hair', 'eyes', 'mouth', 'accessory', 'bgColor']);

const POOLS: Record<ChestRarity, string[]> = { common: [], rare: [], epic: [] };

for (const unlock of LEVEL_UNLOCK_LADDER) {
  if (!WEARABLE.has(unlock.category)) continue;
  for (const rarity of Object.keys(CHEST_PART_TIER) as ChestRarity[]) {
    if (CHEST_PART_TIER[rarity] === unlock.rarity) POOLS[rarity].push(`${unlock.category}:${unlock.partId}`);
  }
}

export function chestPartPool(rarity: ChestRarity): string[] {
  return POOLS[rarity];
}

/** Parses a stored item id. Null for legacy cosmetic ids and anything off the wearable list. */
export function chestPartUnlock(itemId: string): LevelUnlock | null {
  const sep = itemId.indexOf(':');
  if (sep <= 0) return null;
  const category = itemId.slice(0, sep);
  const partId = itemId.slice(sep + 1);
  if (!WEARABLE.has(category) || !partId) return null;
  const match = LEVEL_UNLOCK_LADDER.find((u) => u.category === category && u.partId === partId);
  return match ? { ...match } : null;
}
