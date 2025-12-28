/**
 * High Score Management for Single Player Challenge Mode
 * Tracks best scores per difficulty and game duration
 */

import logger from '@/utils/logger';
import type { DifficultyLevel } from '@/shared/types/game';

const CHALLENGE_HIGH_SCORES_KEY = 'boggle_challenge_high_scores';

export interface HighScoreEntry {
  score: number;
  wordCount: number;
  longestWord: string;
  achievedAt: number; // timestamp
  // Additional stats for comprehensive tracking
  accuracy?: number;
  comboBonus?: number;
  fireRoundBonus?: number;
  averageWordLength?: number;
  achievementCount?: number;
}

export interface ChallengeHighScores {
  // Key format: "DIFFICULTY_DURATION" e.g., "MEDIUM_120"
  scores: Record<string, HighScoreEntry>;
  // Overall best across all settings
  allTimeBest: HighScoreEntry | null;
  // Statistics for competitive display
  totalGamesPlayed: number;
  totalHighScoreBeats: number; // How many times player beat their high score
}

/**
 * Generate storage key for a specific game configuration
 */
function getScoreKey(difficulty: DifficultyLevel, durationSeconds: number): string {
  return `${difficulty}_${durationSeconds}`;
}

/**
 * Get default high scores object
 */
function getDefaultHighScores(): ChallengeHighScores {
  return {
    scores: {},
    allTimeBest: null,
    totalGamesPlayed: 0,
    totalHighScoreBeats: 0,
  };
}

/**
 * Load high scores from localStorage
 */
export function getHighScores(): ChallengeHighScores {
  if (typeof window === 'undefined') return getDefaultHighScores();

  try {
    const stored = localStorage.getItem(CHALLENGE_HIGH_SCORES_KEY);
    if (!stored) return getDefaultHighScores();
    return JSON.parse(stored) as ChallengeHighScores;
  } catch (error) {
    logger.error('Error reading high scores:', error);
    return getDefaultHighScores();
  }
}

/**
 * Save high scores to localStorage
 */
function saveHighScores(scores: ChallengeHighScores): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CHALLENGE_HIGH_SCORES_KEY, JSON.stringify(scores));
  } catch (error) {
    logger.error('Error saving high scores:', error);
  }
}

/**
 * Get high score for specific game configuration
 */
export function getHighScore(
  difficulty: DifficultyLevel,
  durationSeconds: number
): HighScoreEntry | null {
  const scores = getHighScores();
  const key = getScoreKey(difficulty, durationSeconds);
  return scores.scores[key] || null;
}

/**
 * Get all-time best score across all configurations
 */
export function getAllTimeBest(): HighScoreEntry | null {
  return getHighScores().allTimeBest;
}

/**
 * Check if a score would be a new high score
 */
export function isNewHighScore(
  score: number,
  difficulty: DifficultyLevel,
  durationSeconds: number
): boolean {
  const currentBest = getHighScore(difficulty, durationSeconds);
  return !currentBest || score > currentBest.score;
}

/**
 * Check if a score would be a new all-time best
 */
export function isNewAllTimeBest(score: number): boolean {
  const best = getAllTimeBest();
  return !best || score > best.score;
}

export interface RecordGameOptions {
  score: number;
  wordCount: number;
  longestWord: string;
  difficulty: DifficultyLevel;
  durationSeconds: number;
  // Additional optional stats
  accuracy?: number;
  comboBonus?: number;
  fireRoundBonus?: number;
  averageWordLength?: number;
  achievementCount?: number;
}

/**
 * Record a game result and update high scores if applicable
 * Returns true if a new high score was achieved
 */
export function recordGameResult(
  score: number,
  wordCount: number,
  longestWord: string,
  difficulty: DifficultyLevel,
  durationSeconds: number,
  options?: Partial<Omit<RecordGameOptions, 'score' | 'wordCount' | 'longestWord' | 'difficulty' | 'durationSeconds'>>
): { isNewHighScore: boolean; isNewAllTimeBest: boolean; previousBest: number | null } {
  const scores = getHighScores();
  const key = getScoreKey(difficulty, durationSeconds);
  const previousEntry = scores.scores[key];
  const previousBest = previousEntry?.score || null;

  scores.totalGamesPlayed += 1;

  const newEntry: HighScoreEntry = {
    score,
    wordCount,
    longestWord,
    achievedAt: Date.now(),
    // Include additional stats if provided
    accuracy: options?.accuracy,
    comboBonus: options?.comboBonus,
    fireRoundBonus: options?.fireRoundBonus,
    averageWordLength: options?.averageWordLength,
    achievementCount: options?.achievementCount,
  };

  // Check for new configuration-specific high score
  const isNewHigh = !previousEntry || score > previousEntry.score;
  if (isNewHigh) {
    scores.scores[key] = newEntry;
    scores.totalHighScoreBeats += 1;
  }

  // Check for new all-time best
  const isNewAllTime = !scores.allTimeBest || score > scores.allTimeBest.score;
  if (isNewAllTime) {
    scores.allTimeBest = newEntry;
  }

  saveHighScores(scores);

  return {
    isNewHighScore: isNewHigh,
    isNewAllTimeBest: isNewAllTime,
    previousBest,
  };
}

/**
 * Get progress statistics for display
 */
export function getProgressStats(): {
  totalGames: number;
  highScoreBeats: number;
  uniqueConfigurations: number;
} {
  const scores = getHighScores();
  return {
    totalGames: scores.totalGamesPlayed,
    highScoreBeats: scores.totalHighScoreBeats,
    uniqueConfigurations: Object.keys(scores.scores).length,
  };
}

/**
 * Get high score for a specific preset
 * Uses the preset's difficulty and timer settings
 */
export function getHighScoreForPreset(presetId: string, difficulty: DifficultyLevel, durationSeconds: number): HighScoreEntry | null {
  // For presets with no timer (practice mode), we don't track high scores
  if (durationSeconds === 0) return null;
  return getHighScore(difficulty, durationSeconds);
}

/**
 * Get a motivational message based on current score vs high score
 */
export function getProgressMessage(
  currentScore: number,
  highScore: number | null,
  t: (key: string) => string
): { message: string; type: 'ahead' | 'behind' | 'tied' | 'first' } {
  if (!highScore) {
    return {
      message: t('challenge.settingRecord') || 'Setting your first record!',
      type: 'first',
    };
  }

  const diff = currentScore - highScore;

  if (diff > 0) {
    return {
      message: (t('challenge.aheadOfRecord') || '+{diff} ahead of record!').replace('{diff}', String(diff)),
      type: 'ahead',
    };
  } else if (diff < 0) {
    return {
      message: (t('challenge.behindRecord') || '{diff} to beat your record').replace('{diff}', String(Math.abs(diff))),
      type: 'behind',
    };
  } else {
    return {
      message: t('challenge.tiedWithRecord') || 'Tied with your record!',
      type: 'tied',
    };
  }
}
