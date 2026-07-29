/**
 * Loot Generator — determines drops for level completion.
 *
 * Drop rules:
 * - Gold: always (stars > 0), scales with stars + world difficulty
 * - Rune Fragment: 3-star completions only (1 per level, 70 max total)
 * - Lore Scroll: first completion of non-boss levels (60 total)
 * - Boss Trophy: first completion of boss levels (10 total)
 * - Golden Quill: 3-star first completion of any level (rare)
 * - World Essence: 3-star first boss defeat (legendary, 1 per world)
 * - Ancient Relic: 5% chance on 3-star first completion, worlds 5+ (legendary)
 * - Cosmic Shard: 3-star world 10 boss only (legendary, rarest item)
 */

import type { LootDrop } from '@/types/adventure';

export type { LootDrop };

export interface LootInput {
  world: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
  isFirstCompletion: boolean;
  isBossLevel: boolean;
}

/** World difficulty multiplier for gold scaling (W1=1.0, W10=2.0) */
const WORLD_GOLD_SCALE = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0];

/** Deterministic random from seed (same input → same output) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export function generateLevelLoot(input: LootInput): LootDrop[] {
  const { world, level, stars, score, isFirstCompletion, isBossLevel } = input;
  if (stars === 0) return [];

  const drops: LootDrop[] = [];
  const worldScale = WORLD_GOLD_SCALE[Math.min(world - 1, 9)];

  // Gold — always awarded for stars > 0
  const baseGold = 10 * stars;
  const perfectBonus = stars === 3 ? 50 : 0;
  const scoreBonus = Math.floor(score / 100);
  const goldAmount = Math.floor((baseGold + perfectBonus + scoreBonus) * worldScale);
  drops.push({ type: 'gold', quantity: goldAmount, rarity: 'common' });

  // Rune Fragment — 3-star only
  if (stars === 3) {
    drops.push({ type: 'runeFragment', quantity: 1, rarity: 'rare' });
  }

  // Lore Scroll — first completion of non-boss levels
  if (isFirstCompletion && !isBossLevel) {
    drops.push({ type: 'loreScroll', quantity: 1, rarity: 'common' });
  }

  // Boss Trophy — first boss defeat
  if (isFirstCompletion && isBossLevel) {
    drops.push({ type: 'bossTrophy', quantity: 1, rarity: 'epic' });
  }

  // Golden Quill — 3-star first completion of any level (rare)
  if (stars === 3 && isFirstCompletion && !isBossLevel) {
    drops.push({ type: 'goldenQuill', quantity: 1, rarity: 'rare' });
  }

  // World Essence — 3-star first boss defeat (legendary, 1 per world)
  if (stars === 3 && isFirstCompletion && isBossLevel) {
    drops.push({ type: 'worldEssence', quantity: 1, rarity: 'legendary' });
  }

  // Ancient Relic — 5% chance on 3-star first completion, worlds 5+
  if (stars === 3 && isFirstCompletion && world >= 5) {
    const roll = seededRandom(world * 1000 + level);
    if (roll < 0.05) {
      drops.push({ type: 'ancientRelic', quantity: 1, rarity: 'legendary' });
    }
  }

  // Cosmic Shard — 3-star world 10 boss (rarest item in the game)
  if (stars === 3 && isFirstCompletion && isBossLevel && world === 10) {
    drops.push({ type: 'cosmicShard', quantity: 1, rarity: 'legendary' });
  }

  return drops;
}
