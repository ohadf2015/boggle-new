/**
 * Equip a world tile skin for every grid mode. The equipped set lives in two
 * places (localStorage + profiles.equipped_cosmetics, which useCosmetics pulls
 * on mount), so write BOTH or the profile copy reverts it on next load.
 */
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import { EQUIPPED_KEY, PURCHASED_KEY, syncCosmeticsToSupabase } from '@/hooks/useCosmetics';
import type { CosmeticCategory } from '@/lib/cosmetics';
import { worldSkinId } from '@/lib/adventure/play/worldSkins';

type Equipped = Partial<Record<CosmeticCategory, string>>;

export function equipWorldSkin(world: number, userId: string | null) {
  const next: Equipped = { ...getJsonFromLocalStorage<Equipped>(EQUIPPED_KEY, {}), tileSkin: worldSkinId(world) };
  saveJsonToLocalStorage(EQUIPPED_KEY, next);
  if (userId) syncCosmeticsToSupabase(userId, next, getJsonFromLocalStorage<string[]>(PURCHASED_KEY, []));
  // useEquippedCosmetic listens for 'storage', which never fires in the writing tab.
  window.dispatchEvent(new StorageEvent('storage', { key: EQUIPPED_KEY }));
}

export function equippedWorld(): number | null {
  const m = /^tile-world-(\d+)$/.exec(getJsonFromLocalStorage<Equipped>(EQUIPPED_KEY, {}).tileSkin ?? '');
  return m ? Number(m[1]) : null;
}
