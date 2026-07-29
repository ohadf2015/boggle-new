/**
 * Rune Catalog — Pillar 3 of Adventure Mode Redesign
 *
 * Defines the 12 collectible runes (2 per effect channel), forging from
 * fragments, equip/unequip logic with slot limits, and aggregate effect
 * computation that replaces DEFAULT_RUNE_EFFECTS in useAdventureGameInit.
 */

import type { PlayerRune } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

export type RuneRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type RuneEffectChannel =
  | 'scoreMultiplier'
  | 'goldMultiplier'
  | 'timeBonus'
  | 'comboDecay'
  | 'hintBonus'
  | 'bossDamage';

export interface RuneDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  rarity: RuneRarity;
  effectChannel: RuneEffectChannel;
  /** The raw effect value. For multipliers, this IS the multiplier (e.g. 1.1).
   *  For additive channels (timeBonus, hintBonus), this is added to the base. */
  effectValue: number;
}

export interface RuneEffects {
  scoreMultiplier: number;
  goldMultiplier: number;
  timeBonus: number;
  comboDecay: number;
  hintBonus: number;
  bossDamage: number;
}

// ==============================================
// CONSTANTS
// ==============================================

export const MAX_EQUIPPED_RUNES = 3;

export const RUNE_FORGE_COSTS: Record<RuneRarity, number> = {
  common: 5,
  rare: 15,
  epic: 30,
  legendary: 50,
};

/** Channels where effects multiply (base 1.0). Others are additive (base 0). */
const MULTIPLICATIVE_CHANNELS = new Set<RuneEffectChannel>([
  'scoreMultiplier', 'goldMultiplier', 'comboDecay', 'bossDamage',
]);

const DEFAULT_EFFECTS: RuneEffects = {
  scoreMultiplier: 1.0,
  goldMultiplier: 1.0,
  timeBonus: 0,
  comboDecay: 1.0,
  hintBonus: 0,
  bossDamage: 1.0,
};

// ==============================================
// RUNE CATALOG (12 runes, 2 per channel)
// ==============================================

export const RUNE_CATALOG: readonly RuneDefinition[] = [
  // Score channel
  { id: 'ember',    nameKey: 'adventure.runes.ember.name',    descriptionKey: 'adventure.runes.ember.desc',    rarity: 'common',    effectChannel: 'scoreMultiplier', effectValue: 1.1 },
  { id: 'inferno',  nameKey: 'adventure.runes.inferno.name',  descriptionKey: 'adventure.runes.inferno.desc',  rarity: 'rare',      effectChannel: 'scoreMultiplier', effectValue: 1.25 },

  // Gold channel
  { id: 'midas',    nameKey: 'adventure.runes.midas.name',    descriptionKey: 'adventure.runes.midas.desc',    rarity: 'common',    effectChannel: 'goldMultiplier',  effectValue: 1.15 },
  { id: 'fortune',  nameKey: 'adventure.runes.fortune.name',  descriptionKey: 'adventure.runes.fortune.desc',  rarity: 'epic',      effectChannel: 'goldMultiplier',  effectValue: 1.4 },

  // Time channel (additive)
  { id: 'hourglass', nameKey: 'adventure.runes.hourglass.name', descriptionKey: 'adventure.runes.hourglass.desc', rarity: 'common', effectChannel: 'timeBonus',       effectValue: 5 },
  { id: 'eternity',  nameKey: 'adventure.runes.eternity.name',  descriptionKey: 'adventure.runes.eternity.desc',  rarity: 'epic',   effectChannel: 'timeBonus',       effectValue: 12 },

  // Combo decay channel (lower = slower decay = better)
  { id: 'flow',     nameKey: 'adventure.runes.flow.name',     descriptionKey: 'adventure.runes.flow.desc',     rarity: 'rare',      effectChannel: 'comboDecay',      effectValue: 0.85 },
  { id: 'torrent',  nameKey: 'adventure.runes.torrent.name',  descriptionKey: 'adventure.runes.torrent.desc',  rarity: 'legendary', effectChannel: 'comboDecay',      effectValue: 0.65 },

  // Hint channel (additive)
  { id: 'insight',  nameKey: 'adventure.runes.insight.name',  descriptionKey: 'adventure.runes.insight.desc',  rarity: 'common',    effectChannel: 'hintBonus',       effectValue: 1 },
  { id: 'oracle',   nameKey: 'adventure.runes.oracle.name',   descriptionKey: 'adventure.runes.oracle.desc',   rarity: 'rare',      effectChannel: 'hintBonus',       effectValue: 2 },

  // Boss damage channel
  { id: 'valor',       nameKey: 'adventure.runes.valor.name',       descriptionKey: 'adventure.runes.valor.desc',       rarity: 'rare',      effectChannel: 'bossDamage', effectValue: 1.2 },
  { id: 'dragonslayer', nameKey: 'adventure.runes.dragonslayer.name', descriptionKey: 'adventure.runes.dragonslayer.desc', rarity: 'legendary', effectChannel: 'bossDamage', effectValue: 1.5 },
] as const;

// Lookup map for O(1) access
const RUNE_MAP = new Map<string, RuneDefinition>(
  RUNE_CATALOG.map(r => [r.id, r])
);

// ==============================================
// FUNCTIONS
// ==============================================

// ==============================================
// ADAPTER: RuneDefinition ↔ RuneCardDef / RuneCard
// Allows reuse of WordForge's RunePicker & RuneBar in adventure forge levels.
// ==============================================

import type { RuneCardDef, RuneCard, RuneRarity as ForgeRuneRarity } from '@/types/wordForge';

/** Map adventure effect channels to word-forge rune categories. */
const CHANNEL_TO_CATEGORY: Record<RuneEffectChannel, import('@/types/wordForge').RuneCategory> = {
  scoreMultiplier: 'chip',
  goldMultiplier: 'mult',
  timeBonus: 'special',
  comboDecay: 'special',
  hintBonus: 'special',
  bossDamage: 'mult',
};

/** Emoji icons per rune ID for display in RunePicker / RuneBar. */
const RUNE_ICONS: Record<string, string> = {
  ember: '🔥', inferno: '🌋', midas: '💰', fortune: '🍀',
  hourglass: '⏳', eternity: '♾️', flow: '🌊', torrent: '🌀',
  insight: '💡', oracle: '🔮', valor: '⚔️', dragonslayer: '🐉',
};

/** Clamp adventure rarity to the forge rarity union (no 'epic'). */
function toForgeRarity(r: RuneRarity): ForgeRuneRarity {
  return r === 'epic' ? 'rare' : (r as ForgeRuneRarity);
}

/** Convert a RuneDefinition to a RuneCardDef for use in RunePicker. */
export function toRuneCardDef(def: RuneDefinition): RuneCardDef {
  return {
    id: def.id,
    name: def.nameKey, // RunePicker uses t() on descriptionKey; name is shown raw
    descriptionKey: def.descriptionKey,
    category: CHANNEL_TO_CATEGORY[def.effectChannel],
    rarity: toForgeRarity(def.rarity),
    icon: RUNE_ICONS[def.id] ?? '🔷',
    unlockTier: 0,
  };
}

/** Convert a PlayerRune to a RuneCard for use in RuneBar. */
export function toRuneCard(playerRune: PlayerRune): RuneCard | null {
  const def = RUNE_MAP.get(playerRune.runeId);
  if (!def) return null;
  return {
    def: toRuneCardDef(def),
    instanceId: `adv-${playerRune.runeId}`,
  };
}

/** Pick N random rune offerings from the catalog for the pre-level picker. */
export function pickRuneOffering(count = 3, excludeIds: string[] = []): RuneCardDef[] {
  const pool = RUNE_CATALOG.filter(r => !excludeIds.includes(r.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(toRuneCardDef);
}

/**
 * Compute aggregate rune effects from forge-picked RuneCardDefs.
 * Converts IDs back to RuneDefinitions and applies the same multiplicative/additive logic.
 */
export function computeForgePickEffects(picks: RuneCardDef[]): RuneEffects {
  const result: RuneEffects = { ...DEFAULT_EFFECTS };
  for (const pick of picks) {
    const def = RUNE_MAP.get(pick.id);
    if (!def) continue;
    const ch = def.effectChannel;
    if (MULTIPLICATIVE_CHANNELS.has(ch)) {
      result[ch] = (result[ch] as number) * def.effectValue;
    } else {
      result[ch] = (result[ch] as number) + def.effectValue;
    }
  }
  return result;
}

/** Get rune definition by ID, or undefined if not found. */
export function getRuneById(runeId: string): RuneDefinition | undefined {
  return RUNE_MAP.get(runeId);
}

/** Check if a rune can be forged given fragments and current inventory. */
export function canForgeRune(runeId: string, fragments: number, ownedRunes: PlayerRune[]): boolean {
  const def = RUNE_MAP.get(runeId);
  if (!def) return false;
  if (ownedRunes.some(r => r.runeId === runeId)) return false;
  return fragments >= RUNE_FORGE_COSTS[def.rarity];
}

/** Forge a rune. Returns new rune + remaining fragments, or null if cannot forge. */
export function forgeRune(
  runeId: string,
  fragments: number,
  ownedRunes: PlayerRune[],
): { newRune: PlayerRune; remainingFragments: number } | null {
  if (!canForgeRune(runeId, fragments, ownedRunes)) return null;
  const def = RUNE_MAP.get(runeId)!;
  return {
    newRune: { runeId, equipped: false },
    remainingFragments: fragments - RUNE_FORGE_COSTS[def.rarity],
  };
}

/** Equip a rune. Returns updated rune array, or null if invalid. */
export function equipRune(runeId: string, runes: PlayerRune[]): PlayerRune[] | null {
  const rune = runes.find(r => r.runeId === runeId);
  if (!rune || rune.equipped) return null;
  const equippedCount = runes.filter(r => r.equipped).length;
  if (equippedCount >= MAX_EQUIPPED_RUNES) return null;
  return runes.map(r => r.runeId === runeId ? { ...r, equipped: true } : { ...r });
}

/** Unequip a rune. Returns updated rune array, or null if invalid. */
export function unequipRune(runeId: string, runes: PlayerRune[]): PlayerRune[] | null {
  const rune = runes.find(r => r.runeId === runeId);
  if (!rune || !rune.equipped) return null;
  return runes.map(r => r.runeId === runeId ? { ...r, equipped: false } : { ...r });
}

/**
 * Compute aggregate rune effects from equipped runes.
 * Multiplicative channels (score, gold, comboDecay, bossDamage) multiply together.
 * Additive channels (timeBonus, hintBonus) sum together.
 */
export function computeRuneEffects(runes: PlayerRune[]): RuneEffects {
  const result: RuneEffects = { ...DEFAULT_EFFECTS };

  for (const playerRune of runes) {
    if (!playerRune.equipped) continue;
    const def = RUNE_MAP.get(playerRune.runeId);
    if (!def) continue;

    const ch = def.effectChannel;
    if (MULTIPLICATIVE_CHANNELS.has(ch)) {
      result[ch] = (result[ch] as number) * def.effectValue;
    } else {
      result[ch] = (result[ch] as number) + def.effectValue;
    }
  }

  return result;
}
