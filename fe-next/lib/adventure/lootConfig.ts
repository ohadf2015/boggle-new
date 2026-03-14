/**
 * Loot Chest configuration — generates chest rewards for level completion.
 *
 * Replaces flat gold with a chest opening sequence that reveals rewards one by one.
 */

export interface LootDrop {
  type: 'gold' | 'xp' | 'runeFragment' | 'loreScroll';
  amount: number;
  /** For lore scrolls — which scroll was found */
  scrollId?: string;
  /** Translation key for display name */
  nameKey: string;
  /** Rarity for visual treatment */
  rarity: 'common' | 'rare' | 'epic';
}

export interface LootChest {
  drops: LootDrop[];
  chestTier: 'wooden' | 'silver' | 'golden';
}

/**
 * Generate loot drops based on level completion.
 */
export function generateLootChest(
  worldId: number,
  levelNumber: number,
  stars: number,
  score: number,
  goldMultiplier: number
): LootChest {
  const drops: LootDrop[] = [];

  // Gold (always)
  const baseGold = 10 * stars;
  const perfectBonus = stars === 3 ? 50 : 0;
  const gold = Math.floor((baseGold + perfectBonus) * goldMultiplier);
  drops.push({ type: 'gold', amount: gold, nameKey: 'adventure.loot.gold', rarity: 'common' });

  // XP (always)
  const xp = 25 + stars * 15;
  drops.push({ type: 'xp', amount: xp, nameKey: 'adventure.loot.xp', rarity: 'common' });

  // Rune Fragment (guaranteed on 3-star, 40% on 2-star)
  if (stars === 3 || (stars === 2 && seededRandom(worldId * 100 + levelNumber) > 0.6)) {
    drops.push({ type: 'runeFragment', amount: 1, nameKey: 'adventure.loot.runeFragment', rarity: 'rare' });
  }

  // Lore Scroll (non-boss levels, stars >= 1)
  const isBossLevel = levelNumber === 5 || levelNumber === 7;
  if (!isBossLevel && stars >= 1) {
    const scrollId = `scroll-w${worldId}-l${levelNumber}`;
    drops.push({ type: 'loreScroll', amount: 1, scrollId, nameKey: 'adventure.loot.loreScroll', rarity: 'epic' });
  }

  const chestTier = stars === 3 ? 'golden' : stars === 2 ? 'silver' : 'wooden';

  return { drops, chestTier };
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
