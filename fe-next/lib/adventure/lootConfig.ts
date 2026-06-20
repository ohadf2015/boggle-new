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

import {
  ADVENTURE_SURPRISES_ENABLED,
  rollLevelSurprise,
  applySurpriseToGold,
  type LevelSurprise,
} from './surpriseRewards';

export interface LootChest {
  drops: LootDrop[];
  chestTier: 'wooden' | 'silver' | 'golden';
  /** Unexpected variable-reward event this level rolled (flag-dark; undefined when off). */
  surprise?: LevelSurprise;
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
  // Symmetric additive variance (±2) so replaying feels non-identical.
  // Centered at 0.5: Math.random()*5-2.5 produces 0 when mocked to 0.5 (keeps
  // deterministic tests exact). World gap = 6 > max variance 2 → strictly monotonic.
  const baseGold = (10 + worldId * 3) * stars;
  // F4 audit (2026-05-01): early-world plenty. Boost only baseGold (not perfect/bonus/multiplier)
  // for W1-W2 so casual players feel rewarded fast and can afford T1 upgrades within 1-2 levels.
  const earlyWorldBoost = worldId <= 2 ? 1.5 : 1.0;
  const boostedBaseGold = baseGold * earlyWorldBoost;
  const perfectBonus = stars === 3 ? 50 : 0;
  // Gold multiplier only applies to base gold, not bonus/trophy (prevents runaway inflation)
  const variance = Math.round(Math.random() * 5 - 2.5); // –2 to +2 (0 when Math.random=0.5)
  const gold = Math.floor((boostedBaseGold + perfectBonus) * goldMultiplier) + variance;
  drops.push({ type: 'gold', amount: gold, nameKey: 'adventure.loot.gold', rarity: 'common' });

  // XP (always)
  const xp = 25 + stars * 15 + worldId * 10;
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

  // Rare bonus roll: fragment drop on worlds 3+, 15% chance on 3-star, 5% on 2-star
  if (worldId >= 3) {
    const fragmentChance = stars === 3 ? 0.15 : stars === 2 ? 0.05 : 0;
    if (fragmentChance > 0 && seededRandom(worldId * 1000 + levelNumber * 17 + stars) < fragmentChance) {
      drops.push({ type: 'bonusGold', amount: 25 * worldId, nameKey: 'adventure.loot.fragment', rarity: 'rare' });
    }
  }

  // Lucky bonus: 10% chance for a surprise gold drop (variable-ratio reinforcement)
  if (Math.random() < 0.10) {
    const luckyGold = 10 + worldId * 5;
    drops.push({ type: 'bonusGold', amount: luckyGold, nameKey: 'adventure.loot.luckyBonus', rarity: 'rare' });
  }

  const chestTier = stars === 3 ? 'golden' : stars === 2 ? 'silver' : 'wooden';

  // Variable-reward surprise (flag-dark): additive only — boosts the gold drop and
  // attaches the event for the level-complete UI to announce. Off → identical output.
  let surprise: LevelSurprise | undefined;
  if (ADVENTURE_SURPRISES_ENABLED) {
    surprise = rollLevelSurprise(worldId, levelNumber) ?? undefined;
    if (surprise) {
      const goldDrop = drops.find(d => d.type === 'gold');
      if (goldDrop) {
        const delta = applySurpriseToGold(goldDrop.amount, surprise) - goldDrop.amount;
        if (delta > 0) {
          drops.push({ type: 'bonusGold', amount: delta, nameKey: surprise.labelKey, rarity: 'epic' });
        }
      }
    }
  }

  return { drops, chestTier, surprise };
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
