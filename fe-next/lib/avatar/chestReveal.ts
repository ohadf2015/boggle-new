/**
 * Chest drop → the same fullscreen rarity reveal a level-up uses, marked as a
 * chest find (no "Lv N reward" tag). Pure; no React.
 */
import type { ChestDropSource, ChestPartDrop } from './chestDrops';
import type { UnlockReveal } from './revealTrigger';

export function chestDropToReveal(drop: ChestPartDrop, source: ChestDropSource): UnlockReveal {
  return {
    key: `chest:${source}:${drop.key}`,
    fromLevel: 0,
    level: 0,
    unlocks: [{ category: drop.category, partId: drop.partId, level: 0, rarity: drop.rarity }],
    rarity: drop.rarity,
    source: 'chest',
  };
}

/** t() key for a part's display name in the chest strings (fallback after revealUnlock.parts). */
export function chestPartNameKey(part: Pick<ChestPartDrop, 'category' | 'partId'>): string {
  const id = part.category === 'bgColor' ? `bg${part.partId.replace('#', '').toUpperCase()}` : part.partId;
  return `avatarChest.parts.${part.category}.${id}`;
}
