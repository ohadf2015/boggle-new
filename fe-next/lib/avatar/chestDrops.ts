/**
 * Avatar parts out of reward chests — PURE, no IO.
 *
 * Every chest (daily day-clear box, daily all-clear box, weekly 7-day chest)
 * now carries one avatar part on top of its coins. The roll:
 *   1. rarity from the chest's published odds (shown on the chest, honest);
 *   2. a part of that rarity the player can't use yet (owned, bought or
 *      level-unlocked parts are skipped), picked by the same seed;
 *   3. if they already have every part of that rarity, it is a duplicate and
 *      pays coins instead (DUPLICATE_COINS), so a roll is never wasted.
 *
 * The roll is a pure hash of (player, source, sourceKey), so a retry rolls the
 * same rarity. Chests are earned by playing only: no purchase opens one.
 *
 * Common parts are free for everyone, so chests drop rare / epic / legendary.
 * Celebrity-lookalike cues stay out of chests (shop-only), and only parts every
 * player can equip are in the pool (see COLLECTIBLE_PART_KEYS).
 */
import { COLLECTIBLE_PART_KEYS, isPartUsable } from './unlocks';
import { getPartRarity, type VisualTier } from './rarity';
import { COSMETICS } from '@/lib/cosmetics';

export type ChestDropRarity = Exclude<VisualTier, 'common'>;
export const CHEST_DROP_RARITIES: readonly ChestDropRarity[] = ['rare', 'epic', 'legendary'];

/** Where a part came from. One drop per (player, source, sourceKey). */
export type ChestDropSource = 'day_clear' | 'day_perfect' | 'weekly_bronze' | 'weekly_silver' | 'weekly_gold';
export const CHEST_DROP_SOURCES: readonly ChestDropSource[] = [
  'day_clear', 'day_perfect', 'weekly_bronze', 'weekly_silver', 'weekly_gold',
];

/** Whole-percent odds per chest, shown to players as-is. Each row sums to 100. */
export const CHEST_DROP_ODDS: Record<ChestDropSource, Record<ChestDropRarity, number>> = {
  day_clear: { rare: 80, epic: 17, legendary: 3 },
  day_perfect: { rare: 65, epic: 28, legendary: 7 },
  weekly_bronze: { rare: 60, epic: 32, legendary: 8 },
  weekly_silver: { rare: 40, epic: 45, legendary: 15 },
  weekly_gold: { rare: 15, epic: 55, legendary: 30 },
};

/** Coins paid instead when every part of the rolled rarity is already theirs. */
export const DUPLICATE_COINS: Record<ChestDropRarity, number> = { rare: 75, epic: 200, legendary: 500 };

/** Shop-only celebrity-lookalike cues: never in a chest. */
const CHEST_EXCLUDED = new Set<string>([
  'hair:trumpSwoop', 'hair:recedingHair', 'hair:highAndTight', 'accessory:microphone', 'accessory:earsOut',
]);

/** Categories the reveal can show and every player can wear. */
const CHEST_CATEGORIES = new Set(['base', 'hair', 'eyes', 'mouth', 'accessory', 'bgColor']);

export type ChestPartCategory = 'base' | 'hair' | 'eyes' | 'mouth' | 'accessory' | 'bgColor';

function splitKey(key: string): [string, string] {
  const sep = key.indexOf(':');
  return [key.slice(0, sep), key.slice(sep + 1)];
}

/** The chest pool per rarity, in a stable order (the seed indexes into it). */
export const CHEST_POOL: Record<ChestDropRarity, readonly string[]> = (() => {
  const pool: Record<ChestDropRarity, string[]> = { rare: [], epic: [], legendary: [] };
  for (const key of COLLECTIBLE_PART_KEYS) {
    const [cat, id] = splitKey(key);
    if (!CHEST_CATEGORIES.has(cat) || CHEST_EXCLUDED.has(key)) continue;
    const rarity = getPartRarity(cat, id);
    if (rarity === 'common') continue;
    pool[rarity].push(key);
  }
  return pool;
})();

export function isChestDropSource(v: unknown): v is ChestDropSource {
  return typeof v === 'string' && (CHEST_DROP_SOURCES as readonly string[]).includes(v);
}

export function weeklyChestSource(tier: 'bronze' | 'silver' | 'gold'): ChestDropSource {
  return `weekly_${tier}`;
}

/** FNV-1a 32-bit: stable across runtimes. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function uniform(seed: string): number {
  return hash32(seed) / 0x100000000;
}

export function rollChestRarity(source: ChestDropSource, seed: string): ChestDropRarity {
  const odds = CHEST_DROP_ODDS[source];
  const r = uniform(`${seed}#rarity`) * 100;
  if (r < odds.legendary) return 'legendary';
  if (r < odds.legendary + odds.epic) return 'epic';
  return 'rare';
}

export interface ChestPartDrop {
  /** "category:partId", the premium_avatar_parts key. */
  key: string;
  category: ChestPartCategory;
  partId: string;
  rarity: ChestDropRarity;
  /** Already theirs: no new part, `refundCoins` paid instead. */
  duplicate: boolean;
  refundCoins: number;
}

export interface RollChestPartInput {
  source: ChestDropSource;
  /** Usually `${playerId}|${sourceKey}`. */
  seed: string;
  /** profiles.premium_avatar_parts */
  ownedKeys: readonly string[];
  level: number | null | undefined;
}

export function rollChestPart({ source, seed, ownedKeys, level }: RollChestPartInput): ChestPartDrop {
  const rarity = rollChestRarity(source, seed);
  const pool = CHEST_POOL[rarity];
  const owned = new Set(ownedKeys);
  const fresh = pool.filter(key => {
    const [cat, id] = splitKey(key);
    return !isPartUsable(cat, id, { ownedKeys: owned, level });
  });
  const list = fresh.length > 0 ? fresh : pool;
  const key = list[hash32(`${seed}#part`) % list.length];
  const [category, partId] = splitKey(key);
  const duplicate = fresh.length === 0;
  return {
    key,
    category: category as ChestPartCategory,
    partId,
    rarity,
    duplicate,
    refundCoins: duplicate ? DUPLICATE_COINS[rarity] : 0,
  };
}

// ── Tile skins and board themes ─────────────────────────────────────────────
//
// Some rolls hand out a tile skin or board theme instead of an avatar part.
// Same rarity roll and odds; the item is one the player does not own yet. With
// none left at that rarity the chest falls back to an avatar part, so a
// cosmetic never comes as a duplicate.

export type ChestCosmeticCategory = 'tileSkin' | 'boardTheme';

/** Percent chance that a chest's item is a tile skin or board theme, per chest. */
export const CHEST_COSMETIC_ODDS: Record<ChestDropSource, number> = {
  day_clear: 15,
  day_perfect: 25,
  weekly_bronze: 25,
  weekly_silver: 30,
  weekly_gold: 35,
};

/** Ledger key prefix: `cosmetic:<id>` in avatar_part_drops.part_key. */
export const COSMETIC_KEY_PREFIX = 'cosmetic:';

/** Skins and themes a chest can hold, by rarity (commons are cheap in the shop, so never). */
export const CHEST_COSMETIC_POOL: Record<ChestDropRarity, readonly string[]> = (() => {
  const pool: Record<ChestDropRarity, string[]> = { rare: [], epic: [], legendary: [] };
  for (const c of COSMETICS) {
    if (c.category !== 'tileSkin' && c.category !== 'boardTheme') continue;
    if (c.rarity === 'common') continue;
    pool[c.rarity].push(c.id);
  }
  return pool;
})();

export interface ChestCosmeticDrop {
  kind: 'cosmetic';
  /** `cosmetic:<id>`, the ledger key. */
  key: string;
  cosmeticId: string;
  cosmeticCategory: ChestCosmeticCategory;
  rarity: ChestDropRarity;
  /** Always false: only unowned items drop. Kept for the shared ledger shape. */
  duplicate: false;
  refundCoins: 0;
}

/** Anything a chest can hold besides coins. */
export type ChestItemDrop = ChestPartDrop | ChestCosmeticDrop;

export function cosmeticDrop(cosmeticId: string, rarity: ChestDropRarity): ChestCosmeticDrop | null {
  const c = COSMETICS.find((x) => x.id === cosmeticId);
  if (!c || (c.category !== 'tileSkin' && c.category !== 'boardTheme')) return null;
  return {
    kind: 'cosmetic',
    key: `${COSMETIC_KEY_PREFIX}${c.id}`,
    cosmeticId: c.id,
    cosmeticCategory: c.category,
    rarity,
    duplicate: false,
    refundCoins: 0,
  };
}

export interface RollChestItemInput extends RollChestPartInput {
  /** profiles.purchased_cosmetics */
  ownedCosmetics: readonly string[];
}

/**
 * The chest's item: a tile skin or board theme on a CHEST_COSMETIC_ODDS roll
 * when one of the rolled rarity is still unowned, else an avatar part.
 */
export function rollChestItem(input: RollChestItemInput): ChestItemDrop {
  const { source, seed, ownedCosmetics } = input;
  if (uniform(`${seed}#kind`) * 100 < CHEST_COSMETIC_ODDS[source]) {
    const rarity = rollChestRarity(source, seed);
    const owned = new Set(ownedCosmetics);
    const fresh = CHEST_COSMETIC_POOL[rarity].filter((id) => !owned.has(id));
    if (fresh.length > 0) {
      const drop = cosmeticDrop(fresh[hash32(`${seed}#cosmetic`) % fresh.length], rarity);
      if (drop) return drop;
    }
  }
  return rollChestPart(input);
}

export function isChestCosmeticDrop(v: unknown): v is ChestCosmeticDrop {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  return (
    d.kind === 'cosmetic' &&
    typeof d.cosmeticId === 'string' &&
    (d.cosmeticCategory === 'tileSkin' || d.cosmeticCategory === 'boardTheme') &&
    (CHEST_DROP_RARITIES as readonly unknown[]).includes(d.rarity)
  );
}

/** Shape a claim route answers with (`part` on the prize). */
export function isChestPartDrop(v: unknown): v is ChestPartDrop {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.key === 'string' &&
    typeof d.partId === 'string' &&
    typeof d.category === 'string' && CHEST_CATEGORIES.has(d.category) &&
    (CHEST_DROP_RARITIES as readonly unknown[]).includes(d.rarity) &&
    typeof d.duplicate === 'boolean' &&
    typeof d.refundCoins === 'number'
  );
}

/** An avatar part or a tile skin / board theme, as a claim route answers it. */
export function isChestItemDrop(v: unknown): v is ChestItemDrop {
  return isChestCosmeticDrop(v) || isChestPartDrop(v);
}
