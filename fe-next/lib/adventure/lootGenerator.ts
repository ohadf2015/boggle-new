/**
 * Loot Generator — determines drops for level completion.
 *
 * Drop rules:
 * - Gold: always (stars > 0), scales with stars + world difficulty
 * - Rune Fragment: 3-star completions only (1 per level, 70 max total)
 * - Lore Scroll: first completion of non-boss levels (60 total)
 * - Boss Trophy: first completion of boss levels (10 total)
 */

import type { LootDrop } from '@/types/adventure';

export type { LootDrop };

interface LootInput {
  world: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
  score: number;
  isFirstCompletion: boolean;
  isBossLevel: boolean;
}

/** World difficulty multiplier for gold scaling (W1=1.0, W10=2.0) */
const WORLD_GOLD_SCALE = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0];

export function generateLevelLoot(input: LootInput): LootDrop[] {
  const { world, stars, score, isFirstCompletion, isBossLevel } = input;
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

  return drops;
}
