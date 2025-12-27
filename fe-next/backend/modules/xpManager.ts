/**
 * XP & Leveling System Manager
 * Handles XP calculation, level progression, and rewards
 */

// XP Configuration
export const XP_CONFIG = {
  // Base XP rewards
  GAME_COMPLETION: 50,    // Base XP for completing a game
  SCORE_MULTIPLIER: 0.5,  // XP per point scored
  WIN_BONUS: 50,          // Bonus XP for winning (1st place in multiplayer)
  ACHIEVEMENT_XP: 100,    // XP per achievement earned in-game

  // Level curve: XP needed = 100 * level^1.5
  LEVEL_EXPONENT: 1.5,
  LEVEL_BASE: 100,

  // Max level (optional cap)
  MAX_LEVEL: 100,
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
 * Calculate XP earned from a game
 */
export function calculateGameXp(gameStats: GameStats): XpResult {
  const { score = 0, isWinner = false, achievementCount = 0, playerCount = 1 } = gameStats;

  const breakdown: XpBreakdown = {
    gameCompletion: XP_CONFIG.GAME_COMPLETION,
    scoreXp: Math.round(score * XP_CONFIG.SCORE_MULTIPLIER),
    winBonus: 0,
    achievementXp: achievementCount * XP_CONFIG.ACHIEVEMENT_XP,
  };

  // Only award win bonus for multiplayer games
  if (isWinner && playerCount > 1) {
    breakdown.winBonus = XP_CONFIG.WIN_BONUS;
  }

  const totalXp = breakdown.gameCompletion + breakdown.scoreXp + breakdown.winBonus + breakdown.achievementXp;

  return {
    totalXp,
    breakdown,
  };
}

/**
 * Calculate XP required to reach a specific level
 * Formula: XP = 100 * level^1.5
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(XP_CONFIG.LEVEL_BASE * Math.pow(level, XP_CONFIG.LEVEL_EXPONENT));
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

// CommonJS exports for backward compatibility
module.exports = {
  calculateGameXp,
  getXpForLevel,
  getLevelFromXp,
  getXpProgress,
  getTitleForLevel,
  getUnlockedTitles,
  checkLevelUp,
  getLevelTier,
  getNextMilestone,
  XP_CONFIG,
  LEVEL_TITLES,
};
