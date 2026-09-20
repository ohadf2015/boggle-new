/**
 * Shop stock for a merchant node — the run gold sink. Pure and seeded from the
 * run seed + node id, so the server re-derives the same shelf on every request
 * and never has to carry the listing inside the run token.
 *
 * Prices fold into the button label (StS rule): the client shows "<price> gold"
 * on the item itself, never a separate tag to cross-reference.
 */
import { makeRng } from './rng';
import {
  RELICS, RELIC_IDS, POTION_IDS, POTION_HEAL, type RelicId, type PotionId, type Rarity,
} from './relics';

export type ShopItem =
  | { type: 'relic'; id: RelicId; price: number }
  | { type: 'potion'; id: PotionId; price: number }
  | { type: 'heal'; amount: number; price: number };

/** Spec bands: relic 60-150, potion 25-50, heal 40. */
export const RELIC_PRICE: Record<Rarity, { min: number; max: number }> = {
  common: { min: 60, max: 85 },
  rare: { min: 90, max: 120 },
  epic: { min: 125, max: 150 },
};
export const POTION_PRICE_MIN = 25;
export const POTION_PRICE_MAX = 50;
export const SHOP_HEAL_PRICE = 40;

export const SHOP_RELIC_SLOTS = 3;
export const SHOP_POTION_SLOTS = 2;

const between = (rand: () => number, min: number, max: number) =>
  min + Math.round(rand() * (max - min));

/** Up to 3 unowned relics + 2 potions + one heal, in a fixed slot order the UI can trust. */
export function shopStock(seed: string, nodeId: string, owned: readonly RelicId[]): ShopItem[] {
  const rand = makeRng(`${seed}:shop:${nodeId}`);
  const items: ShopItem[] = [];

  const pool = RELIC_IDS.filter((id) => !owned.includes(id));
  for (let i = 0; i < SHOP_RELIC_SLOTS && pool.length; i++) {
    const id = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const band = RELIC_PRICE[RELICS[id].rarity];
    items.push({ type: 'relic', id, price: between(rand, band.min, band.max) });
  }

  const potions = [...POTION_IDS];
  for (let i = 0; i < SHOP_POTION_SLOTS && potions.length; i++) {
    const id = potions.splice(Math.floor(rand() * potions.length), 1)[0];
    items.push({ type: 'potion', id, price: between(rand, POTION_PRICE_MIN, POTION_PRICE_MAX) });
  }

  items.push({ type: 'heal', amount: POTION_HEAL, price: SHOP_HEAL_PRICE });
  return items;
}
