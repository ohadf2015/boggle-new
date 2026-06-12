import { GEM_COLORS, type AbilityCard, type AbilityKind, type GemRarity } from './types';
import { mulberry32 } from '@/lib/rng/seededRandom';

export const SHOP_SIZE = 3;

/**
 * Ability catalog. Each entry defines the rarity of the gem cost and the
 * description key for i18n. Color is rolled at shop-time so the same ability
 * can demand different colors across runs.
 */
export const ABILITY_CATALOG: Record<AbilityKind, { rarity: GemRarity }> = {
  portal: { rarity: 1 },
  joker: { rarity: 2 },
  reroll: { rarity: 1 },
};

const ABILITY_POOL: AbilityKind[] = ['portal', 'portal', 'joker', 'reroll', 'reroll'];

export interface RollShopArgs {
  seed: number;
  turnIndex: number;
}

export function rollShop({ seed, turnIndex }: RollShopArgs): AbilityCard[] {
  // Mix turn into seed so each turn rerolls deterministically.
  const rand = mulberry32(seed + turnIndex * 1597);
  const cards: AbilityCard[] = [];
  for (let i = 0; i < SHOP_SIZE; i++) {
    const kind = ABILITY_POOL[Math.floor(rand() * ABILITY_POOL.length)];
    const color = GEM_COLORS[Math.floor(rand() * GEM_COLORS.length)];
    const rarity = ABILITY_CATALOG[kind].rarity;
    cards.push({
      id: `shop-${seed}-${turnIndex}-${i}`,
      kind,
      cost: { color, rarity },
    });
  }
  return cards;
}
