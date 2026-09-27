/**
 * Player Statistics Types
 *
 * Centralized types for player statistics across all single-player modes
 */

import type { DifficultyLevel } from '@/shared/types/game';

export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge';

/**
 * A single high score entry with metadata
 */
export interface HighScoreEntry {
  score: number;
  wordCount: number;
  longestWord: string;
  achievedAt: number; // timestamp
  mode: SinglePlayerMode;
  difficulty: DifficultyLevel;
  durationSeconds: number;
  // Additional stats for comprehensive tracking
  accuracy?: number;
  comboBonus?: number;
  fireRoundBonus?: number;
  averageWordLength?: number;
  achievementCount?: number;
}

/**
 * Statistics for a specific mode
 */
export interface ModeStats {
  // Best score for this mode
  best: HighScoreEntry | null;
  // Number of games played in this mode
  totalGames: number;
  // How many times player beat their high score
  highScoreBeats: number;
  // Per-configuration records (e.g., "MEDIUM_120" for challenge mode)
  configRecords: Record<string, HighScoreEntry>;
}

/**
 * Aggregate player statistics across all modes
 */
export interface PlayerStats {
  // All-time best across all modes
  allTimeBest: HighScoreEntry | null;
  // Per-mode statistics
  modes: {
    'solo-bots': ModeStats;
    'practice': ModeStats;
    'challenge': ModeStats;
  };
  // Aggregate counts
  totalGames: number;
  totalHighScoreBeats: number;
  // Version for migration tracking
  version: number;
}

/**
 * Parameters for recording a game result
 */
export interface RecordGameParams {
  mode: SinglePlayerMode;
  score: number;
  wordCount: number;
  longestWord: string;
  difficulty: DifficultyLevel;
  durationSeconds: number;
  // Optional additional stats
  accuracy?: number;
  comboBonus?: number;
  fireRoundBonus?: number;
  averageWordLength?: number;
  achievementCount?: number;
}

/**
 * Result of recording a game
 */
export interface RecordGameResult {
  isNewHighScore: boolean;
  isNewAllTimeBest: boolean;
  previousBest: number | null;
  newStats: PlayerStats;
}

/**
 * Daily challenge status for pre-loading
 */
export interface DailyChallengeStatus {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  longestStreak: number;
  puzzleNumber: number;
  puzzleDate: string;
  loading: boolean;
  fromServer: boolean;
}

/**
 * Constants
 */
export const PLAYER_STATS_KEY = 'lexiclash_player_stats';
export const PLAYER_STATS_VERSION = 1;
