/**
 * Shared View Types
 * Types used by both Host and Player views
 */

import type { Avatar, PresenceStatus } from './game';

// ==================== Player Types ====================

/**
 * Base player type used in game views
 */
export interface ViewPlayer {
  username: string;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  presence?: PresenceStatus;
  disconnected?: boolean;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

// ==================== Word Types ====================

/**
 * Word found by a player during gameplay
 */
export interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

// ==================== Leaderboard Types ====================

/**
 * Entry in the live leaderboard during gameplay
 */
export interface LiveLeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  comboLevel?: number;
}

/**
 * Extended leaderboard entry with presence information
 */
export interface ExtendedLeaderboardPlayer extends LiveLeaderboardEntry {
  presenceStatus?: PresenceStatus;
  isWindowFocused?: boolean;
  disconnected?: boolean;
}

// ==================== Tournament Types ====================

/**
 * Tournament data displayed in views (simplified)
 */
export interface ViewTournamentData {
  currentRound?: number;
  totalRounds?: number;
  isComplete?: boolean;
}

/**
 * Full tournament data with all fields
 */
export interface TournamentData {
  id?: string;
  name?: string;
  currentRound?: number;
  totalRounds?: number;
  status?: 'created' | 'in-progress' | 'completed' | 'cancelled';
  isComplete?: boolean;
}

// ==================== XP & Level Types ====================

/**
 * XP gained data after a game
 */
export interface XpGainedData {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  newLevel: number;
}

/**
 * Level up data when player gains a level
 */
export interface LevelUpData {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

// ==================== Combo State ====================

/**
 * Combo tracking state
 */
export interface ComboState {
  level: number;
  lastWordTime: number | null;
}
