/** Art paths + rarity frame styles shared by the loot / draft / HUD pieces. */
import type { PotionId, Rarity, RelicId } from '@/lib/adventure/play/relics';

export const relicArt = (id: RelicId) => `/images/adventure/relics/${id}.webp`;
export const potionArt = (id: PotionId) => `/images/adventure/potions/${id}.webp`;
export const COIN_ART = '/images/adventure/loot/gold-coin.webp';
export const CHEST_CLOSED_ART = '/images/adventure/loot/chest-closed.webp';
export const CHEST_OPEN_ART = '/images/adventure/loot/chest-open.webp';

/** Balatro-style frame colours: common cyan, rare pink, epic gold. */
export const RARITY_FRAME: Record<Rarity, { bg: string; ring: string; text: string; glow: string }> = {
  common: { bg: 'bg-neo-cyan', ring: 'ring-neo-cyan', text: 'text-neo-cyan', glow: 'rgba(0, 229, 255, 0.55)' },
  rare: { bg: 'bg-neo-pink', ring: 'ring-neo-pink', text: 'text-neo-pink', glow: 'rgba(255, 64, 160, 0.6)' },
  epic: { bg: 'bg-neo-yellow', ring: 'ring-neo-yellow', text: 'text-neo-yellow', glow: 'rgba(255, 214, 0, 0.75)' },
};
