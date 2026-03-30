/**
 * Loot Chest configuration — generates chest rewards for level completion.
 *
 * Replaces flat gold with a chest opening sequence that reveals rewards one by one.
 */

export interface LootDrop {
  type: 'gold' | 'xp' | 'bonusGold';
  amount: number;
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
  _score: number,
  goldMultiplier: number
): LootChest {
  const drops: LootDrop[] = [];

  // Gold (always) — scales with world to prevent late-game gold drought
  const baseGold = (10 + worldId * 3) * stars;
  const perfectBonus = stars === 3 ? 50 : 0;
  // Gold multiplier only applies to base gold, not bonus/trophy (prevents runaway inflation)
  const gold = Math.floor((baseGold + perfectBonus) * goldMultiplier);
  drops.push({ type: 'gold', amount: gold, nameKey: 'adventure.loot.gold', rarity: 'common' });

  // XP (always)
  const xp = 25 + stars * 15;
  drops.push({ type: 'xp', amount: xp, nameKey: 'adventure.loot.xp', rarity: 'common' });

  // Bonus Gold (guaranteed on 3-star, 40% on 2-star) — scales with world, NOT affected by goldMultiplier
  if (stars === 3 || (stars === 2 && seededRandom(worldId * 100 + levelNumber) > 0.6)) {
    const bonusGold = 15 * worldId;
    drops.push({ type: 'bonusGold', amount: bonusGold, nameKey: 'adventure.loot.bonusGold', rarity: 'rare' });
  }

  // Extra Bonus Gold (boss levels with 3 stars — boss trophy reward, NOT affected by goldMultiplier)
  const isBossLevel = levelNumber === 7;
  if (isBossLevel && stars === 3) {
    const trophyGold = 30 * worldId;
    drops.push({ type: 'bonusGold', amount: trophyGold, nameKey: 'adventure.loot.bossTrophy', rarity: 'epic' });
  }

  const chestTier = stars === 3 ? 'golden' : stars === 2 ? 'silver' : 'wooden';

  return { drops, chestTier };
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
