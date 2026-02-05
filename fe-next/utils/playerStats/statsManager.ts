/**
 * Player Statistics Manager
 *
 * Centralized storage manager for player statistics across all single-player modes.
 * Handles localStorage persistence, migration from legacy data, and aggregate calculations.
 */

import logger from '@/utils/logger';
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import {
  PLAYER_STATS_KEY,
  PLAYER_STATS_VERSION,
  type PlayerStats,
  type ModeStats,
  type HighScoreEntry,
  type SinglePlayerMode,
  type RecordGameParams,
  type RecordGameResult,
} from './types';

// Legacy storage key from old highScoreManager
const LEGACY_CHALLENGE_KEY = 'boggle_challenge_high_scores';

/**
 * Get default mode stats
 */
function getDefaultModeStats(): ModeStats {
  return {
    best: null,
    totalGames: 0,
    highScoreBeats: 0,
    configRecords: {},
  };
}

/**
 * Get default player stats
 */
function getDefaultPlayerStats(): PlayerStats {
  return {
    allTimeBest: null,
    modes: {
      'solo-bots': getDefaultModeStats(),
      'practice': getDefaultModeStats(),
      'challenge': getDefaultModeStats(),
    },
    totalGames: 0,
    totalHighScoreBeats: 0,
    version: PLAYER_STATS_VERSION,
  };
}

/**
 * Generate configuration key for mode-specific tracking
 * Format: "DIFFICULTY_DURATION" e.g., "MEDIUM_120"
 */
function getConfigKey(difficulty: string, durationSeconds: number): string {
  return `${difficulty}_${durationSeconds}`;
}

/**
 * Migrate data from legacy highScoreManager format
 * Called automatically on first stats access
 */
function migrateFromLegacyHighScores(stats: PlayerStats): PlayerStats {
  if (typeof window === 'undefined') return stats;

  try {
    const legacyData = getJsonFromLocalStorage<{
      scores: Record<string, {
        score: number;
        wordCount: number;
        longestWord: string;
        achievedAt: number;
        accuracy?: number;
        comboBonus?: number;
        fireRoundBonus?: number;
        averageWordLength?: number;
        achievementCount?: number;
      }>;
      allTimeBest: {
        score: number;
        wordCount: number;
        longestWord: string;
        achievedAt: number;
      } | null;
      totalGamesPlayed: number;
      totalHighScoreBeats: number;
    } | null>(LEGACY_CHALLENGE_KEY, null);

    if (!legacyData) return stats;

    logger.info('[StatsManager] Migrating legacy high scores');

    // Migrate challenge mode records
    const challengeMode = stats.modes.challenge;
    challengeMode.totalGames = legacyData.totalGamesPlayed || 0;
    challengeMode.highScoreBeats = legacyData.totalHighScoreBeats || 0;

    // Migrate per-configuration records
    for (const [configKey, entry] of Object.entries(legacyData.scores || {})) {
      // Parse difficulty and duration from key (e.g., "MEDIUM_120")
      const [difficulty, durationStr] = configKey.split('_');
      const durationSeconds = parseInt(durationStr, 10) || 120;

      const migratedEntry: HighScoreEntry = {
        score: entry.score,
        wordCount: entry.wordCount,
        longestWord: entry.longestWord,
        achievedAt: entry.achievedAt,
        mode: 'challenge',
        difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        durationSeconds,
        accuracy: entry.accuracy,
        comboBonus: entry.comboBonus,
        fireRoundBonus: entry.fireRoundBonus,
        averageWordLength: entry.averageWordLength,
        achievementCount: entry.achievementCount,
      };

      challengeMode.configRecords[configKey] = migratedEntry;

      // Update mode best if this is higher
      if (!challengeMode.best || entry.score > challengeMode.best.score) {
        challengeMode.best = migratedEntry;
      }
    }

    // Migrate all-time best
    if (legacyData.allTimeBest) {
      const bestEntry: HighScoreEntry = {
        score: legacyData.allTimeBest.score,
        wordCount: legacyData.allTimeBest.wordCount,
        longestWord: legacyData.allTimeBest.longestWord,
        achievedAt: legacyData.allTimeBest.achievedAt,
        mode: 'challenge',
        difficulty: 'MEDIUM', // Default, since legacy didn't store this
        durationSeconds: 120, // Default
      };

      if (!stats.allTimeBest || bestEntry.score > stats.allTimeBest.score) {
        stats.allTimeBest = bestEntry;
      }
    }

    // Update aggregate counts
    stats.totalGames += challengeMode.totalGames;
    stats.totalHighScoreBeats += challengeMode.highScoreBeats;

    logger.info('[StatsManager] Migration complete', {
      gamesImported: challengeMode.totalGames,
      recordsImported: Object.keys(challengeMode.configRecords).length,
    });

    return stats;
  } catch (error) {
    logger.error('[StatsManager] Migration error:', error);
    return stats;
  }
}

/**
 * Load player stats from localStorage
 * Automatically migrates from legacy format if needed
 */
export function getPlayerStats(): PlayerStats {
  if (typeof window === 'undefined') return getDefaultPlayerStats();

  try {
    let stats = getJsonFromLocalStorage<PlayerStats | null>(PLAYER_STATS_KEY, null);

    if (!stats) {
      // No new stats found - try to migrate from legacy
      stats = getDefaultPlayerStats();
      stats = migrateFromLegacyHighScores(stats);
      savePlayerStats(stats);
    } else if (stats.version < PLAYER_STATS_VERSION) {
      // Future: Handle version upgrades here
      stats.version = PLAYER_STATS_VERSION;
      savePlayerStats(stats);
    }

    return stats;
  } catch (error) {
    logger.error('[StatsManager] Error loading stats:', error);
    return getDefaultPlayerStats();
  }
}

/**
 * Save player stats to localStorage
 */
export function savePlayerStats(stats: PlayerStats): void {
  if (typeof window === 'undefined') return;

  try {
    saveJsonToLocalStorage(PLAYER_STATS_KEY, stats);
  } catch (error) {
    logger.error('[StatsManager] Error saving stats:', error);
  }
}

/**
 * Get all-time best score across all modes
 */
export function getAllTimeBest(): HighScoreEntry | null {
  const stats = getPlayerStats();
  return stats.allTimeBest;
}

/**
 * Get statistics for a specific mode
 */
export function getModeStats(mode: SinglePlayerMode): ModeStats {
  const stats = getPlayerStats();
  return stats.modes[mode];
}

/**
 * Get the best score for a specific mode
 */
export function getModeBest(mode: SinglePlayerMode): HighScoreEntry | null {
  return getModeStats(mode).best;
}

/**
 * Get record for a specific configuration (mode + difficulty + duration)
 */
export function getConfigRecord(
  mode: SinglePlayerMode,
  difficulty: string,
  durationSeconds: number
): HighScoreEntry | null {
  const modeStats = getModeStats(mode);
  const key = getConfigKey(difficulty, durationSeconds);
  return modeStats.configRecords[key] || null;
}

/**
 * Check if a score would be a new high score for the configuration
 */
export function isNewHighScore(
  mode: SinglePlayerMode,
  score: number,
  difficulty: string,
  durationSeconds: number
): boolean {
  const currentBest = getConfigRecord(mode, difficulty, durationSeconds);
  return !currentBest || score > currentBest.score;
}

/**
 * Check if a score would be a new all-time best
 */
export function isNewAllTimeBest(score: number): boolean {
  const best = getAllTimeBest();
  return !best || score > best.score;
}

/**
 * Record a game result
 * Updates all relevant statistics and returns the result
 */
export function recordGameResult(params: RecordGameParams): RecordGameResult {
  const stats = getPlayerStats();
  const modeStats = stats.modes[params.mode];

  const configKey = getConfigKey(params.difficulty, params.durationSeconds);
  const previousConfigBest = modeStats.configRecords[configKey];
  const previousBest = previousConfigBest?.score || null;

  // Create new entry
  const newEntry: HighScoreEntry = {
    score: params.score,
    wordCount: params.wordCount,
    longestWord: params.longestWord,
    achievedAt: Date.now(),
    mode: params.mode,
    difficulty: params.difficulty,
    durationSeconds: params.durationSeconds,
    accuracy: params.accuracy,
    comboBonus: params.comboBonus,
    fireRoundBonus: params.fireRoundBonus,
    averageWordLength: params.averageWordLength,
    achievementCount: params.achievementCount,
  };

  // Check for new records
  const isNewHigh = !previousConfigBest || params.score > previousConfigBest.score;
  const isNewAllTime = !stats.allTimeBest || params.score > stats.allTimeBest.score;

  // Update mode statistics
  modeStats.totalGames += 1;
  stats.totalGames += 1;

  if (isNewHigh) {
    modeStats.configRecords[configKey] = newEntry;
    modeStats.highScoreBeats += 1;
    stats.totalHighScoreBeats += 1;

    // Update mode best if this is the highest for the mode
    if (!modeStats.best || params.score > modeStats.best.score) {
      modeStats.best = newEntry;
    }
  }

  if (isNewAllTime) {
    stats.allTimeBest = newEntry;
  }

  // Save updated stats
  savePlayerStats(stats);

  return {
    isNewHighScore: isNewHigh,
    isNewAllTimeBest: isNewAllTime,
    previousBest,
    newStats: stats,
  };
}

/**
 * Get aggregate statistics for display
 */
export function getAggregateStats(): {
  totalGames: number;
  totalHighScoreBeats: number;
  uniqueConfigurations: number;
} {
  const stats = getPlayerStats();

  const uniqueConfigs =
    Object.keys(stats.modes['solo-bots'].configRecords).length +
    Object.keys(stats.modes['practice'].configRecords).length +
    Object.keys(stats.modes['challenge'].configRecords).length;

  return {
    totalGames: stats.totalGames,
    totalHighScoreBeats: stats.totalHighScoreBeats,
    uniqueConfigurations: uniqueConfigs,
  };
}

/**
 * Reset all statistics (for testing or user request)
 */
export function resetPlayerStats(): void {
  if (typeof window === 'undefined') return;
  savePlayerStats(getDefaultPlayerStats());
}
