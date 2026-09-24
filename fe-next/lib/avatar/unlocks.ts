/**
 * Level ladder for avatar parts — PURE, no IO.
 *
 * Until now every non-free part was gold-only, so the median player (level 1,
 * p75 = 2, p90 = 7) never earned anything for their avatar by playing. This
 * ladder grants EXISTING VIP / epic parts as the player levels up:
 *   - dense early: one or more unlocks at every level 2..10;
 *   - then roughly every 3-5 levels up to 40, rarer as it climbs;
 *   - legendary parts stay gold-only (never on the ladder).
 *
 * It only ever ADDS access: free parts stay free, the gold purchase path and
 * prices are untouched, and a part bought with gold stays owned regardless.
 *
 * Only parts every player can actually pick are eligible: no hidden parts, no
 * eyebrows (no picker tab), no facial hair (male-only), and hair only if it is
 * in BOTH gender pickers — otherwise an unlock is a no-show for some players.
 */
import {
  FEMALE_HAIR_STYLES,
  HIDDEN_PARTS,
  MALE_HAIR_STYLES,
  PREMIUM_CATEGORIES,
  getPremiumParts,
} from '@/shared/types/customAvatar';
import { getPartRarity, type VisualTier } from './rarity';
import { expandOwnedKeys } from './legacyMap';

export type UnlockCategory = 'base' | 'hair' | 'eyes' | 'mouth' | 'accessory' | 'bgColor';

export interface LevelUnlock {
  category: UnlockCategory;
  partId: string;
  level: number;
  rarity: VisualTier;
}

/** "category:partId" — same key format as profiles.premium_avatar_parts. */
export function partKey(category: string, partId: string): string {
  return `${category}:${partId}`;
}

const LADDER_SPEC: ReadonlyArray<readonly [number, UnlockCategory, string]> = [
  // ── Early, dense: one per level so the first unlock lands in game 1-2 ──
  [2, 'accessory', 'headphones'],
  [3, 'eyes', 'kawaii'],
  [4, 'hair', 'cottonCandy'],
  [5, 'accessory', 'cowboyHat'],
  [5, 'bgColor', '#4B0082'],
  [6, 'eyes', 'heartEye'], // first epic, inside p90 reach
  [7, 'mouth', 'fangs'],
  [8, 'accessory', 'duckHat'],
  [9, 'hair', 'vaporwave'],
  [10, 'accessory', 'frogHat'],
  [10, 'bgColor', '#000000'],
  // ── Then every 3-5 levels, rarer ──
  [13, 'base', 'slime'],
  [16, 'eyes', 'starEye'],
  [20, 'hair', 'lightning'],
  [24, 'accessory', 'butterflyWings'],
  [28, 'mouth', 'neonSmile'],
  [32, 'base', 'ghostFace'],
  [36, 'hair', 'rainbowMohawk'],
  [40, 'accessory', 'iceCrown'],
];

export const LEVEL_UNLOCK_LADDER: readonly LevelUnlock[] = LADDER_SPEC
  .map(([level, category, partId]) => ({ level, category, partId, rarity: getPartRarity(category, partId) }))
  .sort((a, b) => a.level - b.level);

const UNLOCK_LEVEL_BY_KEY: ReadonlyMap<string, number> = new Map(
  LEVEL_UNLOCK_LADDER.map(u => [partKey(u.category, u.partId), u.level]),
);

/** Guest / unknown / garbage → 1. Floors fractional levels. */
export function normalizeLevel(level: unknown): number {
  const n = typeof level === 'string' ? Number(level) : level;
  if (typeof n !== 'number' || !Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

/** All "category:partId" keys granted at or below this level. */
export function getLevelUnlocks(level: number): ReadonlySet<string> {
  const lvl = normalizeLevel(level);
  const out = new Set<string>();
  for (const u of LEVEL_UNLOCK_LADDER) {
    if (u.level > lvl) break;
    out.add(partKey(u.category, u.partId));
  }
  return out;
}

/** The level that grants this part, or null if it is not on the ladder. */
export function getUnlockLevel(category: string, partId: string): number | null {
  return UNLOCK_LEVEL_BY_KEY.get(partKey(category, partId)) ?? null;
}

/** Parts granted by going from prevLevel to newLevel (prev < level <= new), ordered by level. */
export function getNewUnlocksBetween(prevLevel: number, newLevel: number): LevelUnlock[] {
  const from = normalizeLevel(prevLevel);
  const to = normalizeLevel(newLevel);
  if (to <= from) return [];
  return LEVEL_UNLOCK_LADDER.filter(u => u.level > from && u.level <= to);
}

export interface UsableContext {
  /** profiles.premium_avatar_parts (bought / claimed) + any temp unlocks. */
  ownedKeys: readonly string[] | ReadonlySet<string>;
  /** profiles.current_level; guests / unknown → 1. */
  level: number | null | undefined;
}

function hasKey(owned: UsableContext['ownedKeys'], key: string): boolean {
  if ('has' in owned ? owned.has(key) : owned.includes(key)) return true;
  // A part bought before the 2026-09 redraw may be retired: owning it also
  // owns the part it now renders as (lib/avatar/legacyMap).
  return expandOwnedKeys([...owned]).includes(key);
}

/**
 * THE usability predicate: a part is usable if it is free, OR owned
 * (bought / claimed), OR level-unlocked. Every builder `premium` object must
 * route through this so the lock state can't diverge between surfaces.
 */
export function isPartUsable(category: string, partId: string, ctx: UsableContext): boolean {
  if (getPartRarity(category, partId) === 'common') return true;
  const key = partKey(category, partId);
  if (hasKey(ctx.ownedKeys, key)) return true;
  const unlockAt = UNLOCK_LEVEL_BY_KEY.get(key);
  return unlockAt !== undefined && normalizeLevel(ctx.level) >= unlockAt;
}

// ── Collection ──

const HAIR_PICKABLE = new Set<string>([...FEMALE_HAIR_STYLES, ...MALE_HAIR_STYLES]);
/** eyebrows have no picker tab — premium eyebrows can't be equipped, so they don't count. */
const NON_COLLECTIBLE_CATEGORIES = new Set(['eyebrows']);

function isCollectible(category: string, partId: string): boolean {
  if (NON_COLLECTIBLE_CATEGORIES.has(category)) return false;
  const hidden = (HIDDEN_PARTS as Record<string, readonly string[]>)[category] ?? [];
  if (hidden.includes(partId)) return false;
  if (category === 'hair' && !HAIR_PICKABLE.has(partId)) return false;
  return true;
}

/** Every premium part a player can actually equip somewhere — the collection's denominator. */
export const COLLECTIBLE_PART_KEYS: readonly string[] = PREMIUM_CATEGORIES.flatMap(cat =>
  getPremiumParts(cat).filter(id => isCollectible(cat, id)).map(id => partKey(cat, id)),
);

type CollectibleRarity = Exclude<VisualTier, 'common'>;

export interface CollectionProgress {
  owned: number;
  total: number;
  byRarity: Record<CollectibleRarity, { owned: number; total: number }>;
}

export function getCollectionProgress(ownedPremiumKeys: readonly string[], level: number | null | undefined): CollectionProgress {
  const have = new Set<string>([...expandOwnedKeys(ownedPremiumKeys), ...getLevelUnlocks(normalizeLevel(level))]);
  const byRarity: CollectionProgress['byRarity'] = {
    rare: { owned: 0, total: 0 },
    epic: { owned: 0, total: 0 },
    legendary: { owned: 0, total: 0 },
  };
  let owned = 0;
  for (const key of COLLECTIBLE_PART_KEYS) {
    const sep = key.indexOf(':');
    const rarity = getPartRarity(key.slice(0, sep), key.slice(sep + 1));
    if (rarity === 'common') continue;
    byRarity[rarity].total += 1;
    if (have.has(key)) {
      byRarity[rarity].owned += 1;
      owned += 1;
    }
  }
  return { owned, total: COLLECTIBLE_PART_KEYS.length, byRarity };
}
