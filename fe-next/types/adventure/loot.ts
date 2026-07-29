/**
 * Loot drops from level completion.
 */

export type LootType =
  | 'gold'
  | 'runeFragment'
  | 'loreScroll'
  | 'bossTrophy'
  | 'goldenQuill'
  | 'worldEssence'
  | 'ancientRelic'
  | 'cosmicShard';

export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface LootDrop {
  type: LootType;
  quantity: number;
  rarity: LootRarity;
}
