/**
 * Cross-Mode Synergy — adventure progress grants bonuses in other game modes.
 *
 * Prestige level → XP multiplier + cosmetic border in multiplayer
 * Boss trophies → unlock exclusive avatars/titles
 */

export interface CrossModeBonus {
  xpMultiplier: number;
  border: string | null; // cosmetic border ID
  title?: string;
}

export interface CosmeticUnlock {
  id: string;
  type: 'avatar' | 'border' | 'title';
  nameKey: string;
  source: 'bossTrophy' | 'prestige';
  requirement: number; // trophies or prestige level needed
}

const PRESTIGE_BORDERS = ['bronze', 'silver', 'gold', 'diamond', 'cosmic'];
const PRESTIGE_TITLES = [null, null, 'ASCENDED_ONE', 'TWICE_RISEN', 'THRICE_BLESSED', 'LEXICON_IMMORTAL'];

/** Get multiplayer bonuses from adventure prestige level */
export function getAdventureBonusesForMultiplayer(
  prestigeLevel: number,
  _bossTrophies: number,
): CrossModeBonus {
  if (prestigeLevel <= 0) {
    return { xpMultiplier: 1.0, border: null };
  }

  const clampedPrestige = Math.min(prestigeLevel, 5);
  const xpMultiplier = 1.0 + clampedPrestige * 0.05; // +5% per prestige
  const border = PRESTIGE_BORDERS[clampedPrestige - 1] ?? null;
  const title = PRESTIGE_TITLES[clampedPrestige] ?? undefined;

  return { xpMultiplier, border, title };
}

const COSMETIC_UNLOCKS: CosmeticUnlock[] = [
  // Boss trophy unlocks
  { id: 'avatar-boss-slayer', type: 'avatar', nameKey: 'adventure.cosmetic.bossSlayer', source: 'bossTrophy', requirement: 3 },
  { id: 'avatar-boss-hunter', type: 'avatar', nameKey: 'adventure.cosmetic.bossHunter', source: 'bossTrophy', requirement: 5 },
  { id: 'title-boss-conqueror', type: 'title', nameKey: 'adventure.cosmetic.bossConqueror', source: 'bossTrophy', requirement: 7 },
  { id: 'avatar-boss-legend', type: 'avatar', nameKey: 'adventure.cosmetic.bossLegend', source: 'bossTrophy', requirement: 10 },
  // Prestige unlocks
  { id: 'border-prestige-1', type: 'border', nameKey: 'adventure.cosmetic.prestigeBronze', source: 'prestige', requirement: 1 },
  { id: 'border-prestige-2', type: 'border', nameKey: 'adventure.cosmetic.prestigeSilver', source: 'prestige', requirement: 2 },
  { id: 'border-prestige-3', type: 'border', nameKey: 'adventure.cosmetic.prestigeGold', source: 'prestige', requirement: 3 },
  { id: 'title-prestige-master', type: 'title', nameKey: 'adventure.cosmetic.prestigeMaster', source: 'prestige', requirement: 4 },
  { id: 'border-prestige-5', type: 'border', nameKey: 'adventure.cosmetic.prestigeCosmic', source: 'prestige', requirement: 5 },
];

/** Get all cosmetics unlocked by boss trophies and prestige level */
export function getUnlockedCosmetics(
  bossTrophies: number,
  prestigeLevel: number,
): CosmeticUnlock[] {
  return COSMETIC_UNLOCKS.filter(c => {
    if (c.source === 'bossTrophy') return bossTrophies >= c.requirement;
    if (c.source === 'prestige') return prestigeLevel >= c.requirement;
    return false;
  });
}
