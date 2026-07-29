/**
 * XP & Leveling System Manager
 * Handles XP calculation, level progression, and rewards
 */

// XP Configuration
export const XP_CONFIG = {
  // Base XP rewards
  GAME_COMPLETION: 50,    // Base XP for completing a game
  SCORE_MULTIPLIER: 0.15, // XP per point scored (reduced from 0.5 to prevent inflation)
  WIN_BONUS: 50,          // Bonus XP for winning (1st place in multiplayer)
  ACHIEVEMENT_XP: 100,    // XP per achievement earned in-game

  // Per-game XP caps
  SINGLEPLAYER_CAP: 300,  // Max XP from a single singleplayer game
  MULTIPLAYER_CAP: 400,   // Max XP from a single multiplayer game
  ACHIEVEMENT_CAP: 200,   // Max achievement XP per game (2 achievements worth)

  // Daily XP cap thresholds (applied server-side in increment_player_xp)
  DAILY_FULL_RATE: 1500,     // First 1500 XP/day at 100%
  DAILY_HALF_RATE: 3000,     // 1500-3000 XP/day at 50%
  // Above 3000 XP/day: 25% rate

  // Level-based diminishing returns
  DIMINISHING_RETURNS: {
    25: 1.0,   // Levels 1-25: 100%
    50: 0.85,  // Levels 26-50: 85%
    75: 0.70,  // Levels 51-75: 70%
    100: 0.55, // Levels 76-100: 55%
  } as Record<number, number>,

  // Level curve: XP needed = 100 * level^exponent
  LEVEL_EXPONENT: 1.5,
  LEVEL_BASE: 100,

  // Max level (optional cap)
  MAX_LEVEL: 100,
} as const;

// Prestige System Configuration
export const PRESTIGE_CONFIG = {
  MAX_PRESTIGE: 5,
  REQUIRED_LEVEL: 100, // Must be max level to prestige

  // XP multipliers for each prestige level
  MULTIPLIERS: {
    0: 1.00,
    1: 1.05,
    2: 1.10,
    3: 1.15,
    4: 1.20,
    5: 1.25,
  } as Record<number, number>,

  // Exclusive titles for each prestige level
  TITLES: {
    1: 'ASCENDED_ONE',
    2: 'TWICE_RISEN',
    3: 'THRICE_BLESSED',
    4: 'ETERNAL_WARRIOR',
    5: 'LEXICON_IMMORTAL',
  } as Record<number, string>,

  // Display info for prestige levels
  DISPLAY: {
    1: { name: 'Prestige I', color: '#CD7F32', icon: '⭐' },    // Bronze
    2: { name: 'Prestige II', color: '#C0C0C0', icon: '🌟' },   // Silver
    3: { name: 'Prestige III', color: '#FFD700', icon: '✨' },  // Gold
    4: { name: 'Prestige IV', color: '#B9F2FF', icon: '💫' },   // Diamond
    5: { name: 'Prestige V', color: '#9B59B6', icon: '🌌' },    // Cosmic
  } as Record<number, { name: string; color: string; icon: string }>,
} as const;

// Player titles unlocked at specific levels
export const LEVEL_TITLES: Record<number, string | null> = {
  1: null,
  5: 'WORD_SEEKER',
  10: 'LETTER_SCOUT',
  15: 'VOCAB_WARRIOR',
  20: 'WORD_KNIGHT',
  25: 'LEXICAL_MASTER',
  35: 'DICTIONARY_LORD',
  50: 'WORD_LEGEND',
  75: 'LEXICON_KING',
  90: 'GRANDMASTER',
  100: 'ETERNAL_CHAMPION',
};

export type LevelTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface GameStats {
  score?: number;
  isWinner?: boolean;
  achievementCount?: number;
  playerCount?: number;
}

export interface XpBreakdown {
  gameCompletion: number;
  scoreXp: number;
  winBonus: number;
  achievementXp: number;
}

export interface XpResult {
  totalXp: number;
  breakdown: XpBreakdown;
}

export interface XpProgress {
  currentLevel: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

export interface LevelUpResult {
  leveledUp: boolean;
  levelsGained: number;
  newTitles: string[];
  newLevel?: number;
}

export interface NextMilestone {
  nextMilestoneLevel: number;
  xpNeeded: number;
  titleUnlock: string | null;
}

/**
 * Calculate XP earned from a game (with per-game caps)
 */
export function calculateGameXp(gameStats: GameStats): XpResult {
  const { score = 0, isWinner = false, achievementCount = 0, playerCount = 1 } = gameStats;

  const breakdown: XpBreakdown = {
    gameCompletion: XP_CONFIG.GAME_COMPLETION,
    scoreXp: Math.round(score * XP_CONFIG.SCORE_MULTIPLIER),
    winBonus: 0,
    achievementXp: Math.min(achievementCount * XP_CONFIG.ACHIEVEMENT_XP, XP_CONFIG.ACHIEVEMENT_CAP),
  };

  // Only award win bonus for multiplayer games
  if (isWinner && playerCount > 1) {
    breakdown.winBonus = XP_CONFIG.WIN_BONUS;
  }

  const rawTotal = breakdown.gameCompletion + breakdown.scoreXp + breakdown.winBonus + breakdown.achievementXp;

  // Apply per-game cap based on mode
  const isMultiplayer = playerCount > 1;
  const cap = isMultiplayer ? XP_CONFIG.MULTIPLAYER_CAP : XP_CONFIG.SINGLEPLAYER_CAP;
  const totalXp = Math.min(rawTotal, cap);

  return {
    totalXp,
    breakdown,
  };
}

/**
 * Whether a multiplayer game had a real opponent to play against.
 *
 * Multiplayer XP is only granted when at least one OTHER real (non-bot) player
 * was in the game — a lobby filled out with bots (a lone human) grants no XP.
 * `realPlayerCount` is the number of non-bot participants (bots already filtered
 * out upstream in gameResults.ts). This does NOT govern single-player play,
 * which awards XP through a separate path.
 */
export function hasRealOpponent(realPlayerCount: number | null | undefined): boolean {
  return (realPlayerCount ?? 0) >= 2;
}

/**
 * Get diminishing returns factor based on player level.
 * Higher-level players earn progressively less XP per game,
 * making progression harder over time.
 */
export function getDiminishingReturnsFactor(level: number): number {
  if (level <= 25) return 1.0;
  if (level <= 50) return 0.85;
  if (level <= 75) return 0.70;
  return 0.55;
}

/**
 * Calculate effective XP after applying daily cap with tiered decay.
 * - First 1500 XP/day: 100% rate
 * - 1500-3000 XP/day: 50% rate
 * - 3000+ XP/day: 25% rate
 *
 * @param xpToAdd - Raw XP being awarded
 * @param dailyXpSoFar - XP already earned today
 * @returns Effective XP after daily cap
 */
export function getDailyXpCap(xpToAdd: number, dailyXpSoFar: number): number {
  if (xpToAdd <= 0) return 0;

  const FULL = XP_CONFIG.DAILY_FULL_RATE;   // 1500
  const HALF = XP_CONFIG.DAILY_HALF_RATE;   // 3000

  let remaining = xpToAdd;
  let effective = 0;
  let cursor = dailyXpSoFar;

  // Zone 1: Full rate (0 - FULL)
  if (cursor < FULL && remaining > 0) {
    const spaceInZone = FULL - cursor;
    const inZone = Math.min(remaining, spaceInZone);
    effective += inZone; // 100%
    remaining -= inZone;
    cursor += inZone;
  }

  // Zone 2: Half rate (FULL - HALF)
  if (cursor < HALF && remaining > 0) {
    const spaceInZone = HALF - cursor;
    const inZone = Math.min(remaining, spaceInZone);
    effective += Math.round(inZone * 0.5);
    remaining -= inZone;
    cursor += inZone;
  }

  // Zone 3: Quarter rate (HALF+)
  if (remaining > 0) {
    effective += Math.round(remaining * 0.25);
  }

  // Always award at least 1 XP for a positive input
  return Math.max(1, effective);
}

/**
 * Calculate XP required to reach a specific level
 * Formula: XP = 100 * level^exponent (segmented by tier)
 *
 * Segmented curve to improve mid-game retention:
 * - Levels 1-25: Exponent 1.4 (faster early progression)
 * - Levels 26-50: Exponent 1.45 (gentler mid-game)
 * - Levels 51-75: Exponent 1.5 (current baseline)
 * - Levels 76+: Exponent 1.55 (prestige tier challenge)
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;

  // Determine exponent based on level tier
  let exponent: number;
  if (level <= 25) {
    exponent = 1.4;  // Faster early progression
  } else if (level <= 50) {
    exponent = 1.45; // Gentler mid-game (was 1.5)
  } else if (level <= 75) {
    exponent = 1.5;  // Current baseline
  } else {
    exponent = 1.55; // Prestige tier
  }

  return Math.round(XP_CONFIG.LEVEL_BASE * Math.pow(level, exponent));
}

/**
 * Calculate level from total XP
 * Inverse of getXpForLevel
 */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;

  // Binary search for level
  let low = 1;
  let high = XP_CONFIG.MAX_LEVEL;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (getXpForLevel(mid) <= totalXp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return Math.min(low, XP_CONFIG.MAX_LEVEL);
}

/**
 * Get detailed XP progress information
 */
export function getXpProgress(totalXp: number): XpProgress {
  const currentLevel = getLevelFromXp(totalXp);
  const isMaxLevel = currentLevel >= XP_CONFIG.MAX_LEVEL;

  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = isMaxLevel ? currentLevelXp : getXpForLevel(currentLevel + 1);

  const xpInCurrentLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;

  const progressPercent = isMaxLevel
    ? 100
    : Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);

  return {
    currentLevel,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    isMaxLevel,
  };
}

/**
 * Get title unlocked at a specific level (if any)
 */
export function getTitleForLevel(level: number): string | null {
  // Find the highest title at or below this level
  const levelTitles = Object.entries(LEVEL_TITLES)
    .filter(([lvl, title]) => title !== null && parseInt(lvl) <= level)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]));

  return levelTitles.length > 0 ? levelTitles[0][1] : null;
}

/**
 * Get all titles unlocked up to a specific level
 */
export function getUnlockedTitles(level: number): string[] {
  return Object.entries(LEVEL_TITLES)
    .filter(([lvl, title]) => title !== null && parseInt(lvl) <= level)
    .map(([, title]) => title as string);
}

/**
 * Check if a level up occurred and return new unlocks
 */
export function checkLevelUp(oldLevel: number, newLevel: number): LevelUpResult {
  if (newLevel <= oldLevel) {
    return {
      leveledUp: false,
      levelsGained: 0,
      newTitles: [],
    };
  }

  // Find titles unlocked between old and new level
  const newTitles = Object.entries(LEVEL_TITLES)
    .filter(([lvl, title]) => {
      const levelNum = parseInt(lvl);
      return title !== null && levelNum > oldLevel && levelNum <= newLevel;
    })
    .map(([, title]) => title as string);

  return {
    leveledUp: true,
    levelsGained: newLevel - oldLevel,
    newTitles,
    newLevel,
  };
}

/**
 * Get level tier for color/styling purposes
 */
export function getLevelTier(level: number): LevelTier {
  if (level >= 75) return 'LEGENDARY';  // Purple/Pink gradient
  if (level >= 50) return 'EPIC';       // Gold/Orange gradient
  if (level >= 25) return 'RARE';       // Blue/Purple gradient
  if (level >= 10) return 'UNCOMMON';   // Cyan/Blue gradient
  return 'COMMON';                       // Default
}

/**
 * Calculate estimated XP to reach next milestone level
 */
export function getNextMilestone(totalXp: number): NextMilestone {
  const currentLevel = getLevelFromXp(totalXp);
  const milestones = [5, 10, 15, 20, 25, 35, 50, 75, 90, 100];

  const nextMilestone = milestones.find(m => m > currentLevel) || 100;
  const xpNeeded = getXpForLevel(nextMilestone) - totalXp;

  return {
    nextMilestoneLevel: nextMilestone,
    xpNeeded: Math.max(0, xpNeeded),
    titleUnlock: LEVEL_TITLES[nextMilestone] || null,
  };
}

// ==================== PRESTIGE SYSTEM ====================

export interface PrestigeInfo {
  prestigeLevel: number;
  prestigeMultiplier: number;
  canPrestige: boolean;
  prestigeDisplay: { name: string; color: string; icon: string } | null;
  nextPrestigeRewards: PrestigeReward[];
}

export interface PrestigeReward {
  type: 'title' | 'multiplier' | 'border' | 'icon';
  value: string;
  displayName: string;
  description: string;
  icon: string;
}

export interface PrestigeResult {
  success: boolean;
  newPrestigeLevel: number;
  newMultiplier: number;
  unlockedRewards: PrestigeReward[];
  error?: string;
}

/**
 * Check if a player can prestige
 * Requires max level (100) and not at max prestige (5)
 */
export function canPrestige(currentLevel: number, currentPrestige: number): boolean {
  return currentLevel >= PRESTIGE_CONFIG.REQUIRED_LEVEL &&
         currentPrestige < PRESTIGE_CONFIG.MAX_PRESTIGE;
}

/**
 * Get the XP multiplier for a prestige level.
 * Accumulates bonuses from all ranks up to and including the given level.
 * E.g. prestige 3 = 1.0 + (1.05-1.0) + (1.10-1.0) + (1.15-1.0) = 1.30
 */
export function getPrestigeMultiplier(prestigeLevel: number): number {
  if (prestigeLevel <= 0) return 1.0;
  const maxLevel = Math.min(prestigeLevel, PRESTIGE_CONFIG.MAX_PRESTIGE);
  let accumulated = 1.0;
  for (let rank = 1; rank <= maxLevel; rank++) {
    const rankMultiplier = PRESTIGE_CONFIG.MULTIPLIERS[rank] ?? 1.0;
    accumulated += rankMultiplier - 1.0;
  }
  return Math.round(accumulated * 100) / 100;
}

/**
 * Get prestige display info (name, color, icon)
 */
export function getPrestigeDisplay(prestigeLevel: number): { name: string; color: string; icon: string } | null {
  if (prestigeLevel <= 0 || prestigeLevel > PRESTIGE_CONFIG.MAX_PRESTIGE) {
    return null;
  }
  return PRESTIGE_CONFIG.DISPLAY[prestigeLevel] || null;
}

/**
 * Get the rewards for the next prestige level
 */
export function getNextPrestigeRewards(currentPrestige: number): PrestigeReward[] {
  if (currentPrestige >= PRESTIGE_CONFIG.MAX_PRESTIGE) {
    return [];
  }

  const nextLevel = currentPrestige + 1;
  const rewards: PrestigeReward[] = [];

  // Title reward
  if (PRESTIGE_CONFIG.TITLES[nextLevel]) {
    rewards.push({
      type: 'title',
      value: PRESTIGE_CONFIG.TITLES[nextLevel],
      displayName: formatTitleName(PRESTIGE_CONFIG.TITLES[nextLevel]),
      description: `Exclusive title for Prestige ${toRoman(nextLevel)}`,
      icon: PRESTIGE_CONFIG.DISPLAY[nextLevel]?.icon || '⭐',
    });
  }

  // Multiplier reward
  const multiplier = PRESTIGE_CONFIG.MULTIPLIERS[nextLevel];
  if (multiplier && multiplier > 1) {
    const bonus = Math.round((multiplier - 1) * 100);
    rewards.push({
      type: 'multiplier',
      value: multiplier.toString(),
      displayName: `+${bonus}% XP Bonus`,
      description: `Earn ${bonus}% more XP on all games`,
      icon: '🔥',
    });
  }

  // Border reward (all prestige levels)
  const borderNames: Record<number, string> = {
    1: 'Bronze Prestige Border',
    2: 'Silver Prestige Border',
    3: 'Gold Prestige Border',
    4: 'Diamond Prestige Border',
    5: 'Cosmic Prestige Border',
  };

  rewards.push({
    type: 'border',
    value: `prestige_${['bronze', 'silver', 'gold', 'diamond', 'cosmic'][nextLevel - 1]}`,
    displayName: borderNames[nextLevel],
    description: 'Exclusive profile border',
    icon: ['🥉', '🥈', '🥇', '💎', '🌈'][nextLevel - 1],
  });

  return rewards;
}

/**
 * Get comprehensive prestige info for a player
 */
export function getPrestigeInfo(
  currentLevel: number,
  currentPrestige: number,
  currentMultiplier: number = 1.0
): PrestigeInfo {
  return {
    prestigeLevel: currentPrestige,
    prestigeMultiplier: currentMultiplier || getPrestigeMultiplier(currentPrestige),
    canPrestige: canPrestige(currentLevel, currentPrestige),
    prestigeDisplay: getPrestigeDisplay(currentPrestige),
    nextPrestigeRewards: getNextPrestigeRewards(currentPrestige),
  };
}

/**
 * Apply XP with prestige multiplier
 */
export function applyPrestigeMultiplier(baseXp: number, prestigeMultiplier: number): number {
  return Math.round(baseXp * prestigeMultiplier);
}

/**
 * Format title name from constant to display name
 * e.g., "ASCENDED_ONE" -> "Ascended One"
 */
function formatTitleName(title: string): string {
  return title
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert number to Roman numeral (for prestige display)
 */
export function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

