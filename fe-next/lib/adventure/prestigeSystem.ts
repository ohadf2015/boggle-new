/**
 * Prestige System — Endgame Loop for Adventure Mode
 *
 * After completing all 10 worlds, players can prestige:
 * - Reset world progress (completions, stars)
 * - Keep upgrades, gold, player level, word album
 * - Earn prestige rank + cosmetic badges
 * - Each prestige rank adds a permanent XP/gold multiplier
 *
 * Designed to create infinite replayability post-World 10.
 */

// ==============================================
// TYPES
// ==============================================

export interface PrestigeRank {
  /** Prestige level (1-based) */
  level: number;
  /** Display name translation key */
  nameKey: string;
  /** Badge color for world node borders */
  badgeColor: string;
  /** Permanent XP multiplier bonus (additive, e.g., 0.1 = +10%) */
  xpBonus: number;
  /** Permanent gold multiplier bonus */
  goldBonus: number;
  /** Title awarded to player */
  titleKey: string;
}

export interface PrestigeState {
  /** Current prestige level (0 = never prestiged) */
  level: number;
  /** Total stars earned across all prestige runs */
  lifetimeStars: number;
  /** Timestamps of each prestige */
  history: string[];
}

// ==============================================
// PRESTIGE RANKS
// ==============================================

export const PRESTIGE_RANKS: PrestigeRank[] = [
  {
    level: 1,
    nameKey: 'adventure.prestige.ranks.bronze',
    badgeColor: '#CD7F32',
    xpBonus: 0.1,
    goldBonus: 0.1,
    titleKey: 'adventure.prestige.titles.wordSmith',
  },
  {
    level: 2,
    nameKey: 'adventure.prestige.ranks.silver',
    badgeColor: '#C0C0C0',
    xpBonus: 0.2,
    goldBonus: 0.15,
    titleKey: 'adventure.prestige.titles.lexiconAdept',
  },
  {
    level: 3,
    nameKey: 'adventure.prestige.ranks.gold',
    badgeColor: '#FFD700',
    xpBonus: 0.3,
    goldBonus: 0.2,
    titleKey: 'adventure.prestige.titles.wordMaster',
  },
  {
    level: 4,
    nameKey: 'adventure.prestige.ranks.platinum',
    badgeColor: '#E5E4E2',
    xpBonus: 0.4,
    goldBonus: 0.25,
    titleKey: 'adventure.prestige.titles.grandLexicon',
  },
  {
    level: 5,
    nameKey: 'adventure.prestige.ranks.diamond',
    badgeColor: '#B9F2FF',
    xpBonus: 0.5,
    goldBonus: 0.3,
    titleKey: 'adventure.prestige.titles.eternalWordsmith',
  },
];

/** Max prestige level (diamond) */
export const MAX_PRESTIGE_LEVEL = PRESTIGE_RANKS.length;

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/** Get prestige rank config for a given level */
export function getPrestigeRank(level: number): PrestigeRank | null {
  if (level <= 0 || level > MAX_PRESTIGE_LEVEL) return null;
  return PRESTIGE_RANKS[level - 1];
}

/** Get the cumulative XP multiplier from prestige (stacks all ranks up to current) */
export function getPrestigeXpMultiplier(prestigeLevel: number): number {
  if (prestigeLevel <= 0) return 1;
  const capped = Math.min(prestigeLevel, MAX_PRESTIGE_LEVEL);
  return 1 + PRESTIGE_RANKS.slice(0, capped).reduce((sum, r) => sum + r.xpBonus, 0);
}

/** Get the cumulative gold multiplier from prestige (stacks all ranks up to current) */
export function getPrestigeGoldMultiplier(prestigeLevel: number): number {
  if (prestigeLevel <= 0) return 1;
  const capped = Math.min(prestigeLevel, MAX_PRESTIGE_LEVEL);
  return 1 + PRESTIGE_RANKS.slice(0, capped).reduce((sum, r) => sum + r.goldBonus, 0);
}

/** Check if player is eligible to prestige (completed all worlds) */
export function canPrestige(
  completions: Array<{ world: number; level: number; stars: number }>,
  currentPrestigeLevel: number
): boolean {
  if (currentPrestigeLevel >= MAX_PRESTIGE_LEVEL) return false;

  // Must have at least 1 star on every level in every world (70 completions)
  const completedLevels = new Set(
    completions.filter(c => c.stars >= 1).map(c => `${c.world}-${c.level}`)
  );

  // Check all 10 worlds × 7 levels
  for (let w = 1; w <= 10; w++) {
    for (let l = 1; l <= 7; l++) {
      if (!completedLevels.has(`${w}-${l}`)) return false;
    }
  }
  return true;
}

/** Calculate what the player keeps and loses on prestige */
export function getPrestigePreview(
  currentPrestigeLevel: number,
  totalStars: number
) {
  const nextLevel = Math.min(currentPrestigeLevel + 1, MAX_PRESTIGE_LEVEL);
  const nextRank = getPrestigeRank(nextLevel);

  return {
    nextLevel,
    nextRank,
    keeps: ['upgrades', 'gold', 'playerLevel', 'wordAlbum', 'skillTree'] as const,
    resets: ['worldCompletions', 'levelStars', 'questProgress'] as const,
    lifetimeStarsAdded: totalStars,
    newXpMultiplier: getPrestigeXpMultiplier(nextLevel),
    newGoldMultiplier: getPrestigeGoldMultiplier(nextLevel),
  };
}

/** Default prestige state for new players */
export const DEFAULT_PRESTIGE_STATE: PrestigeState = {
  level: 0,
  lifetimeStars: 0,
  history: [],
};
