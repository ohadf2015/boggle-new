/**
 * Score Card Type Definitions
 * Used for victory sharing graphics feature
 */
import type { Language, Avatar } from './game';
import type { AchievementPayload } from './socket';
/**
 * Player's statistical performance in the game
 */
export interface ScoreCardStats {
    /** Total words found by player (including invalid) */
    totalWordsFound: number;
    /** Valid words that counted toward score */
    validWordsFound: number;
    /** Longest word found by player */
    longestWord: string | null;
    /** Length of longest word */
    longestWordLength: number;
    /** Accuracy percentage (valid words / total words) */
    accuracy: number;
    /** Maximum combo level achieved */
    maxCombo: number;
    /** Total combo bonus points earned */
    totalComboBonus: number;
    /** Total fire round bonus points earned (if applicable) */
    totalFireRoundBonus: number;
    /** Number of unique words (found only by this player) */
    uniqueWordsCount: number;
    /** Average word length */
    averageWordLength: number;
}
/**
 * Player's ranking information
 */
export interface ScoreCardRank {
    /** Player's rank in this game (1st, 2nd, 3rd, etc.) */
    rank: number;
    /** Total number of players in game */
    totalPlayers: number;
    /** Percentile (0-100, where 100 is best) */
    percentile: number;
    /** Whether player won the game (tied wins count as true) */
    isWinner: boolean;
    /** Points difference from winner (0 if winner, negative if loser) */
    pointsFromWinner: number;
    /** Points difference from player ranked above (0 if rank 1) */
    pointsFromNext: number;
}
/**
 * Game metadata for the score card
 */
export interface ScoreCardMetadata {
    /** Unique game code */
    gameCode: string;
    /** Game language */
    language: Language;
    /** Timestamp when game ended (milliseconds since epoch) */
    timestamp: number;
    /** Game duration in seconds */
    gameDuration: number;
    /** Whether this was a ranked game */
    isRanked: boolean;
    /** Difficulty level if set */
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    /** Minimum word length setting */
    minWordLength: number;
}
/**
 * Complete score card data for a single player
 * This is the main data structure sent to the client
 */
export interface ScoreCardData {
    /** Player username */
    username: string;
    /** Player avatar */
    avatar: Avatar;
    /** Total score */
    score: number;
    /** Player ranking information */
    rank: ScoreCardRank;
    /** Player statistics */
    stats: ScoreCardStats;
    /** Achievements unlocked during this game */
    achievements: AchievementPayload[];
    /** Titles earned/displayed for this player */
    titles: string[];
    /** Game metadata */
    metadata: ScoreCardMetadata;
    /** Top words (highest scoring, up to 5) */
    topWords: ScoreCardWord[];
}
/**
 * Word information for score card display
 */
export interface ScoreCardWord {
    /** The word text */
    word: string;
    /** Base score */
    baseScore: number;
    /** Total score including bonuses */
    totalScore: number;
    /** Combo bonus if any */
    comboBonus?: number;
    /** Fire round bonus if any */
    fireRoundBonus?: number;
    /** Whether this word was unique to this player */
    isUnique: boolean;
    /** Whether this was a duplicate (found by multiple players) */
    isDuplicate: boolean;
}
/**
 * Request payload for generating score card
 */
export interface GenerateScoreCardRequest {
    /** Game code (optional if socket already in game) */
    gameCode?: string;
    /** Username (optional if socket already identified) */
    username?: string;
}
/**
 * Response payload containing score card data
 */
export interface GenerateScoreCardResponse {
    /** Success flag */
    success: boolean;
    /** Score card data if successful */
    data?: ScoreCardData;
    /** Error message if failed */
    error?: string;
}
