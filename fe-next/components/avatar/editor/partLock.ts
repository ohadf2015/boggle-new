/**
 * Why a part is locked and how the player gets it — PURE.
 *
 * Lock state itself comes from `premium.isPartUnlocked` (the ONE usability
 * predicate in lib/avatar/unlocks, via useAvatarPremium), so the editor can
 * never disagree with the rest of the app. This only adds the "unlock path":
 * a level on the ladder ("Lv 6") and/or a gold price.
 */
import { getPartRarity, type VisualTier } from '@/lib/avatar/rarity';
import { getUnlockLevel } from '@/lib/avatar/unlocks';
import { getCatalogPart, getPalette, type PaletteId } from '@/lib/avatar/catalog';

export interface LockPremium {
  isPartUnlocked: (category: string, value: string) => boolean;
  coins: number;
  level?: number;
}

export type UnlockPath = 'free' | 'owned' | 'level' | 'gold';

export interface PartLockInfo {
  locked: boolean;
  path: UnlockPath;
  rarity: VisualTier;
  /** Gold price (0 for free parts). */
  price: number;
  /** Ladder level that grants it, or null. */
  unlockLevel: number | null;
  /** Levels still to play, or null when the player level is unknown / not on the ladder. */
  levelsToGo: number | null;
  affordable: boolean;
  /** Gold still missing to buy it (0 when affordable). */
  goldShort: number;
}

function priceOf(category: string, id: string): number {
  const part = getCatalogPart(category, id);
  if (part) return part.price ?? 0;
  const color = getPalette(category as PaletteId).find(c => c.hex === id);
  return color?.price ?? 0;
}

export function getPartLockInfo(category: string, id: string, premium: LockPremium | null): PartLockInfo {
  const rarity = id === 'none' ? 'common' : getPartRarity(category, id);
  const unlockLevel = getUnlockLevel(category, id);
  const price = rarity === 'common' ? 0 : priceOf(category, id);
  const coins = premium?.coins ?? 0;
  const base = {
    rarity,
    price,
    unlockLevel,
    affordable: coins >= price,
    goldShort: Math.max(0, price - coins),
  };
  if (rarity === 'common') return { ...base, locked: false, path: 'free', levelsToGo: null };
  const locked = premium ? !premium.isPartUnlocked(category, id) : true;
  if (!locked) return { ...base, locked, path: 'owned', levelsToGo: null };
  const levelsToGo = unlockLevel != null && typeof premium?.level === 'number'
    ? Math.max(0, unlockLevel - premium.level)
    : null;
  return { ...base, locked, path: unlockLevel != null ? 'level' : 'gold', levelsToGo };
}

const PATH_RANK: Record<UnlockPath, number> = { free: 0, owned: 0, level: 1, gold: 2 };

/**
 * Grid order: 'none', then everything usable (catalog order), then level
 * unlocks nearest-first, then gold parts cheapest-first. The player sees what
 * they can wear immediately, and the next thing they'll earn right after it.
 */
export function sortPartsForGrid(category: string, ids: readonly string[], premium: LockPremium | null): string[] {
  const rows = ids.map((id, index) => ({ id, index, info: getPartLockInfo(category, id, premium) }));
  rows.sort((a, b) => {
    if (a.id === 'none' || b.id === 'none') return a.id === 'none' ? (b.id === 'none' ? 0 : -1) : 1;
    const ra = a.info.locked ? PATH_RANK[a.info.path] : 0;
    const rb = b.info.locked ? PATH_RANK[b.info.path] : 0;
    if (ra !== rb) return ra - rb;
    if (ra === 1) return (a.info.unlockLevel ?? 0) - (b.info.unlockLevel ?? 0) || a.index - b.index;
    if (ra === 2) return a.info.price - b.info.price || a.index - b.index;
    return a.index - b.index;
  });
  return rows.map(r => r.id);
}
