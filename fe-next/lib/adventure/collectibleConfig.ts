/**
 * Collectible Item Configuration — all collectible items in adventure mode.
 *
 * Categories:
 * - trophy: Boss defeat rewards (1 per world boss)
 * - scroll: Lore scrolls found on first level completion
 * - rune: Rune fragments from 3-star completions
 * - relic: Super rare items from special achievements
 *
 * Rarities: common → rare → epic → legendary
 */

export type CollectibleRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CollectibleCategory = 'trophy' | 'scroll' | 'rune' | 'relic';

export interface CollectibleItem {
  id: string;
  nameKey: string;
  descriptionKey: string;
  category: CollectibleCategory;
  rarity: CollectibleRarity;
  icon: string;
  /** World this item is tied to (undefined = any world) */
  sourceWorld?: number;
  /** Max quantity a player can own (undefined = unlimited) */
  maxQuantity?: number;
}

// ==============================================
// BOSS TROPHIES — 1 per world (10 total)
// ==============================================

const BOSS_TROPHIES: CollectibleItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: `boss-trophy-w${i + 1}`,
  nameKey: `adventure.collection.bossTrophy.w${i + 1}`,
  descriptionKey: `adventure.collection.bossTrophyDesc.w${i + 1}`,
  category: 'trophy' as const,
  rarity: 'epic' as const,
  icon: '🏆',
  sourceWorld: i + 1,
  maxQuantity: 1,
}));

// ==============================================
// LORE SCROLLS — 1 per non-boss level (60 total: 6 per world × 10 worlds)
// ==============================================

const LORE_SCROLLS: CollectibleItem[] = Array.from({ length: 10 }, (_, w) =>
  Array.from({ length: 6 }, (_, l) => ({
    id: `lore-scroll-w${w + 1}-l${l + 1}`,
    nameKey: `adventure.collection.loreScroll.w${w + 1}`,
    descriptionKey: `adventure.collection.loreScrollDesc.w${w + 1}.l${l + 1}`,
    category: 'scroll' as const,
    rarity: 'common' as const,
    icon: '📜',
    sourceWorld: w + 1,
    maxQuantity: 1,
  }))
).flat();

// ==============================================
// RUNE FRAGMENTS — generic, stackable
// ==============================================

const RUNE_ITEMS: CollectibleItem[] = [
  {
    id: 'rune-fragment',
    nameKey: 'adventure.collection.runeFragment',
    descriptionKey: 'adventure.collection.runeFragmentDesc',
    category: 'rune',
    rarity: 'rare',
    icon: '💎',
  },
];

// ==============================================
// RELICS — Super rare items
// ==============================================

const RELIC_ITEMS: CollectibleItem[] = [
  // Golden Quill — 3-star first completion of any level
  {
    id: 'golden-quill',
    nameKey: 'adventure.collection.goldenQuill',
    descriptionKey: 'adventure.collection.goldenQuillDesc',
    category: 'relic',
    rarity: 'rare',
    icon: '✒️',
  },
  // World Essences — 1 per world, 3-star first boss defeat
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `world-essence-w${i + 1}`,
    nameKey: `adventure.collection.worldEssence.w${i + 1}`,
    descriptionKey: `adventure.collection.worldEssenceDesc.w${i + 1}`,
    category: 'relic' as const,
    rarity: 'legendary' as const,
    icon: '🌟',
    sourceWorld: i + 1,
    maxQuantity: 1,
  })),
  // Ancient Relics — rare drops from 3-star worlds 5+ (5% chance)
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `ancient-relic-w${i + 5}`,
    nameKey: `adventure.collection.ancientRelic.w${i + 5}`,
    descriptionKey: `adventure.collection.ancientRelicDesc.w${i + 5}`,
    category: 'relic' as const,
    rarity: 'legendary' as const,
    icon: '🗿',
    sourceWorld: i + 5,
    maxQuantity: 1,
  })),
  // Cosmic Shard — world 10 boss with 3 stars (rarest item in the game)
  {
    id: 'cosmic-shard',
    nameKey: 'adventure.collection.cosmicShard',
    descriptionKey: 'adventure.collection.cosmicShardDesc',
    category: 'relic',
    rarity: 'legendary',
    icon: '💫',
    sourceWorld: 10,
    maxQuantity: 1,
  },
];

// ==============================================
// COMBINED CATALOG
// ==============================================

export const COLLECTIBLE_ITEMS: CollectibleItem[] = [
  ...BOSS_TROPHIES,
  ...LORE_SCROLLS,
  ...RUNE_ITEMS,
  ...RELIC_ITEMS,
];

const itemById = new Map(COLLECTIBLE_ITEMS.map(i => [i.id, i]));

export function getCollectibleById(id: string): CollectibleItem | undefined {
  return itemById.get(id);
}

export function getCollectiblesByCategory(category: CollectibleCategory): CollectibleItem[] {
  return COLLECTIBLE_ITEMS.filter(i => i.category === category);
}

export function getCollectiblesByRarity(rarity: CollectibleRarity): CollectibleItem[] {
  return COLLECTIBLE_ITEMS.filter(i => i.rarity === rarity);
}
