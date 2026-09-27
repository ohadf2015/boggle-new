/**
 * Multiplayer Progress Storage
 * Tracks multiplayer game participation for new player identification
 */

import { getJsonFromLocalStorage, saveJsonToLocalStorage } from './storageHelpers';

const STORAGE_KEY = 'lexiclash_multiplayer_progress';
const NEW_PLAYER_THRESHOLD = 3; // Players with < 3 games are considered "new"

export interface MultiplayerProgress {
  gamesJoined: number;
  gamesCompleted: number;
  firstJoinedAt: string | null;
  lastPlayedAt: string | null;
}

const DEFAULT_PROGRESS: MultiplayerProgress = {
  gamesJoined: 0,
  gamesCompleted: 0,
  firstJoinedAt: null,
  lastPlayedAt: null,
};

/**
 * Get current multiplayer progress from localStorage
 */
export const getMultiplayerProgress = (): MultiplayerProgress => {
  const stored = getJsonFromLocalStorage<Partial<MultiplayerProgress>>(STORAGE_KEY, {});
  return { ...DEFAULT_PROGRESS, ...stored };
};

/**
 * Save multiplayer progress to localStorage
 */
const saveMultiplayerProgress = (progress: MultiplayerProgress): void => {
  saveJsonToLocalStorage(STORAGE_KEY, progress);
};

/**
 * Record that player joined a multiplayer game
 */
export const recordGameJoined = (): void => {
  const progress = getMultiplayerProgress();
  progress.gamesJoined += 1;
  if (!progress.firstJoinedAt) {
    progress.firstJoinedAt = new Date().toISOString();
  }
  progress.lastPlayedAt = new Date().toISOString();
  saveMultiplayerProgress(progress);
};

/**
 * Record that player completed a multiplayer game
 */
export const recordGameCompleted = (): void => {
  const progress = getMultiplayerProgress();
  progress.gamesCompleted += 1;
  progress.lastPlayedAt = new Date().toISOString();
  saveMultiplayerProgress(progress);
};

/**
 * Check if the current user is considered a "new" player
 * New players have completed fewer than NEW_PLAYER_THRESHOLD games
 */
export const isNewPlayer = (): boolean => {
  const progress = getMultiplayerProgress();
  // Only show new-player UX if they've started at least one game but haven't completed the threshold.
  // Brand-new visitors (gamesJoined === 0) see the default order.
  return progress.gamesJoined > 0 && progress.gamesCompleted < NEW_PLAYER_THRESHOLD;
};

/**
 * Get the number of multiplayer games completed
 */
export const getGamesCompleted = (): number => {
  return getMultiplayerProgress().gamesCompleted;
};

// ==================== First-Time Achievement Tracking ====================

const ACHIEVEMENTS_KEY = 'lexiclash_first_achievements';

export type FirstTimeAchievementType =
  | 'firstWord'      // First valid word found
  | 'firstCombo'     // First combo achieved (level 2)
  | 'firstLongWord'  // First 5+ letter word
  | 'firstUniqueWord'; // First unique word (at results)

interface FirstTimeAchievements {
  firstWord: boolean;
  firstCombo: boolean;
  firstLongWord: boolean;
  firstUniqueWord: boolean;
}

const DEFAULT_ACHIEVEMENTS: FirstTimeAchievements = {
  firstWord: false,
  firstCombo: false,
  firstLongWord: false,
  firstUniqueWord: false,
};

/**
 * Get current first-time achievements from localStorage
 */
export const getFirstTimeAchievements = (): FirstTimeAchievements => {
  const stored = getJsonFromLocalStorage<Partial<FirstTimeAchievements>>(ACHIEVEMENTS_KEY, {});
  return { ...DEFAULT_ACHIEVEMENTS, ...stored };
};

/**
 * Check if a first-time achievement has been earned
 */
export const hasEarnedAchievement = (type: FirstTimeAchievementType): boolean => {
  const achievements = getFirstTimeAchievements();
  return achievements[type];
};

/**
 * Mark a first-time achievement as earned
 * Returns true if this was the first time (celebration should show)
 */
export const markAchievementEarned = (type: FirstTimeAchievementType): boolean => {
  const achievements = getFirstTimeAchievements();
  if (achievements[type]) {
    return false; // Already earned
  }
  achievements[type] = true;
  saveJsonToLocalStorage(ACHIEVEMENTS_KEY, achievements);
  return true; // First time!
};
