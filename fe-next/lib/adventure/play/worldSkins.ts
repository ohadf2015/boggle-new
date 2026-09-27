/**
 * World tile skins — one per world, unlocked by that world's boss trophy.
 * Styles live in app/cosmetics.css under [data-tile-skin='world-N'].
 */
import { WORLD_SKIN_ITEM } from './progress';
import { WORLD_COUNT } from './levels';

export const worldSkinId = (world: number) => `tile-world-${world}`;

export const WORLD_SKIN_WORLDS = Array.from({ length: WORLD_COUNT }, (_, i) => i + 1);

/** Unlock truth = the boss trophy row in player_inventory (single source). */
export function unlockedWorldSkins(inventoryItemIds: string[]): Set<number> {
  const ids = new Set(inventoryItemIds);
  return new Set(WORLD_SKIN_WORLDS.filter((w) => ids.has(WORLD_SKIN_ITEM(w))));
}
