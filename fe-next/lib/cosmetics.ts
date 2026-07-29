/**
 * Cosmetic Registry
 * Defines cosmetic items (tile skins, board themes, victory effects, profile frames)
 * unlocked via rank milestones, streaks, purchases, and season rewards.
 */

export type CosmeticCategory = 'tileSkin' | 'boardTheme' | 'victoryEffect' | 'profileFrame';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type UnlockCondition =
  | { type: 'rank'; tier: string }
  | { type: 'streak'; days: number }
  | { type: 'season'; seasonId: number; tier: string }
  | { type: 'purchase'; cost: number }
  | { type: 'default' };

export interface Cosmetic {
  id: string;
  category: CosmeticCategory;
  name: string;        // i18n key
  description: string; // i18n key
  rarity: CosmeticRarity;
  unlockCondition: UnlockCondition;
  preview: string;     // CSS class or image path
}

export interface PlayerCosmeticState {
  rankTier: string;
  streakDays: number;
  coins: number;
  seasonRewards: Array<{ seasonId: number; tier: string }>;
  purchasedIds: string[];
  equippedIds: Partial<Record<CosmeticCategory, string>>;
}

// Rank hierarchy for comparison
const RANK_ORDER: string[] = [
  'Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster',
];

function rankAtLeast(playerTier: string, requiredTier: string): boolean {
  return RANK_ORDER.indexOf(playerTier) >= RANK_ORDER.indexOf(requiredTier);
}

/**
 * All cosmetic items in the game.
 */
export const COSMETICS: Cosmetic[] = [
  // ── Tile Skins (5) ──
  {
    id: 'tile-default',
    category: 'tileSkin',
    name: 'cosmetics.items.tileDefault',
    description: 'cosmetics.items.tileDefaultDesc',
    rarity: 'common',
    unlockCondition: { type: 'default' },
    preview: 'tile-skin-default',
  },
  {
    id: 'tile-neon',
    category: 'tileSkin',
    name: 'cosmetics.items.tileNeon',
    description: 'cosmetics.items.tileNeonDesc',
    rarity: 'rare',
    unlockCondition: { type: 'rank', tier: 'Silver' },
    preview: 'tile-skin-neon',
  },
  {
    id: 'tile-wooden',
    category: 'tileSkin',
    name: 'cosmetics.items.tileWooden',
    description: 'cosmetics.items.tileWoodenDesc',
    rarity: 'common',
    unlockCondition: { type: 'purchase', cost: 100 },
    preview: 'tile-skin-wooden',
  },
  {
    id: 'tile-crystal',
    category: 'tileSkin',
    name: 'cosmetics.items.tileCrystal',
    description: 'cosmetics.items.tileCrystalDesc',
    rarity: 'epic',
    unlockCondition: { type: 'rank', tier: 'Diamond' },
    preview: 'tile-skin-crystal',
  },
  {
    id: 'tile-fire',
    category: 'tileSkin',
    name: 'cosmetics.items.tileFire',
    description: 'cosmetics.items.tileFireDesc',
    rarity: 'legendary',
    unlockCondition: { type: 'rank', tier: 'Master' },
    preview: 'tile-skin-fire',
  },

  // ── Board Themes (4) ──
  {
    id: 'board-classic',
    category: 'boardTheme',
    name: 'cosmetics.items.boardClassic',
    description: 'cosmetics.items.boardClassicDesc',
    rarity: 'common',
    unlockCondition: { type: 'default' },
    preview: 'board-theme-classic',
  },
  {
    id: 'board-dark',
    category: 'boardTheme',
    name: 'cosmetics.items.boardDark',
    description: 'cosmetics.items.boardDarkDesc',
    rarity: 'common',
    unlockCondition: { type: 'purchase', cost: 50 },
    preview: 'board-theme-dark',
  },
  {
    id: 'board-ocean',
    category: 'boardTheme',
    name: 'cosmetics.items.boardOcean',
    description: 'cosmetics.items.boardOceanDesc',
    rarity: 'rare',
    unlockCondition: { type: 'streak', days: 7 },
    preview: 'board-theme-ocean',
  },
  {
    id: 'board-galaxy',
    category: 'boardTheme',
    name: 'cosmetics.items.boardGalaxy',
    description: 'cosmetics.items.boardGalaxyDesc',
    rarity: 'epic',
    unlockCondition: { type: 'rank', tier: 'Platinum' },
    preview: 'board-theme-galaxy',
  },

  // ── Victory Effects (3) ──
  {
    id: 'victory-confetti',
    category: 'victoryEffect',
    name: 'cosmetics.items.victoryConfetti',
    description: 'cosmetics.items.victoryConfettiDesc',
    rarity: 'common',
    unlockCondition: { type: 'default' },
    preview: 'victory-effect-confetti',
  },
  {
    id: 'victory-fireworks',
    category: 'victoryEffect',
    name: 'cosmetics.items.victoryFireworks',
    description: 'cosmetics.items.victoryFireworksDesc',
    rarity: 'rare',
    unlockCondition: { type: 'rank', tier: 'Gold' },
    preview: 'victory-effect-fireworks',
  },
  {
    id: 'victory-lightning',
    category: 'victoryEffect',
    name: 'cosmetics.items.victoryLightning',
    description: 'cosmetics.items.victoryLightningDesc',
    rarity: 'epic',
    unlockCondition: { type: 'streak', days: 30 },
    preview: 'victory-effect-lightning',
  },

  // ── Profile Frames (5) ──
  {
    id: 'frame-none',
    category: 'profileFrame',
    name: 'cosmetics.items.frameNone',
    description: 'cosmetics.items.frameNoneDesc',
    rarity: 'common',
    unlockCondition: { type: 'default' },
    preview: 'frame-none',
  },
  {
    id: 'frame-bronze',
    category: 'profileFrame',
    name: 'cosmetics.items.frameBronze',
    description: 'cosmetics.items.frameBronzeDesc',
    rarity: 'common',
    unlockCondition: { type: 'rank', tier: 'Bronze' },
    preview: 'frame-bronze-ring',
  },
  {
    id: 'frame-silver',
    category: 'profileFrame',
    name: 'cosmetics.items.frameSilver',
    description: 'cosmetics.items.frameSilverDesc',
    rarity: 'rare',
    unlockCondition: { type: 'rank', tier: 'Silver' },
    preview: 'frame-silver-ring',
  },
  {
    id: 'frame-gold',
    category: 'profileFrame',
    name: 'cosmetics.items.frameGold',
    description: 'cosmetics.items.frameGoldDesc',
    rarity: 'rare',
    unlockCondition: { type: 'rank', tier: 'Gold' },
    preview: 'frame-gold-crown',
  },
  {
    id: 'frame-diamond',
    category: 'profileFrame',
    name: 'cosmetics.items.frameDiamond',
    description: 'cosmetics.items.frameDiamondDesc',
    rarity: 'epic',
    unlockCondition: { type: 'rank', tier: 'Diamond' },
    preview: 'frame-diamond-halo',
  },
];

/**
 * Check if a specific cosmetic is unlocked for a player.
 */
export function isUnlocked(cosmeticId: string, state: PlayerCosmeticState): boolean {
  const cosmetic = COSMETICS.find((c) => c.id === cosmeticId);
  if (!cosmetic) return false;

  const cond = cosmetic.unlockCondition;
  switch (cond.type) {
    case 'default':
      return true;
    case 'rank':
      return rankAtLeast(state.rankTier, cond.tier);
    case 'streak':
      return state.streakDays >= cond.days;
    case 'purchase':
      return state.purchasedIds.includes(cosmeticId);
    case 'season':
      return state.seasonRewards.some(
        (r) => r.seasonId === cond.seasonId && rankAtLeast(r.tier, cond.tier)
      );
  }
}

/**
 * Get all cosmetics unlocked for a player.
 */
export function getUnlockedCosmetics(state: PlayerCosmeticState): Cosmetic[] {
  return COSMETICS.filter((c) => isUnlocked(c.id, state));
}

/**
 * Get currently equipped cosmetics per category.
 */
export function getEquippedCosmetics(
  state: PlayerCosmeticState
): Partial<Record<CosmeticCategory, Cosmetic>> {
  const result: Partial<Record<CosmeticCategory, Cosmetic>> = {};
  for (const [cat, id] of Object.entries(state.equippedIds)) {
    const cosmetic = COSMETICS.find((c) => c.id === id);
    if (cosmetic) {
      result[cat as CosmeticCategory] = cosmetic;
    }
  }
  return result;
}

/**
 * Get all cosmetics in a given category.
 */
export function getCosmeticsByCategory(category: CosmeticCategory): Cosmetic[] {
  return COSMETICS.filter((c) => c.category === category);
}

/**
 * Translation hint for an unlock condition.
 * Returns null for `default` (no hint to show).
 * Caller passes `key`+`params` straight to t().
 */
export function formatUnlockHint(
  cosmetic: Cosmetic,
): { key: string; params?: Record<string, string | number> } | null {
  const cond = cosmetic.unlockCondition;
  switch (cond.type) {
    case 'default':
      return null;
    case 'rank':
      return { key: 'cosmetics.unlock.rank', params: { tier: cond.tier } };
    case 'streak':
      return { key: 'cosmetics.unlock.streak', params: { days: cond.days } };
    case 'purchase':
      return { key: 'cosmetics.unlock.purchase', params: { cost: cond.cost } };
    case 'season':
      return { key: 'cosmetics.unlock.season' };
  }
}

/**
 * Progress hint toward an unlock — turns a static "Reach Gold rank" into a
 * felt "you're 23/30 days there". Only grind-based conditions (rank, streak)
 * return progress; purchase/default/season return null (nothing to chase).
 */
export function formatUnlockProgress(
  cosmetic: Cosmetic,
  state: { rankTier: string; streakDays: number },
): { key: string; params?: Record<string, string | number> } | null {
  const cond = cosmetic.unlockCondition;
  if (cond.type === 'streak') {
    return {
      key: 'cosmetics.progress.streak',
      params: { current: Math.min(state.streakDays, cond.days), target: cond.days },
    };
  }
  if (cond.type === 'rank') {
    return {
      key: 'cosmetics.progress.rank',
      params: { current: state.rankTier, tier: cond.tier },
    };
  }
  return null;
}

/**
 * Cosmetics newly unlocked between two player states.
 * Used for awarding/notifying after rank-ups, streak milestones, etc.
 */
export function diffNewlyUnlocked(
  before: PlayerCosmeticState,
  after: PlayerCosmeticState,
): Cosmetic[] {
  return COSMETICS.filter((c) => !isUnlocked(c.id, before) && isUnlocked(c.id, after));
}

/**
 * Rarity color mapping for UI.
 */
export const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: 'text-neo-cream/60 border-neo-cream/30',
  rare: 'text-neo-cyan border-neo-cyan',
  epic: 'text-neo-purple border-neo-purple',
  legendary: 'text-neo-lime border-neo-lime',
};
