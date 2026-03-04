/**
 * Scoring Calculation Utilities
 * Handles word scoring, combo bonuses, and final game score calculation
 */
import type { Game, Avatar, WordDetail } from '@/shared/types/game';
export interface WordDetailResult extends WordDetail {
    timestamp?: number | null;
    timeSinceStart?: number | null;
}
export interface PlayerScoreResult {
    username: string;
    score: number;
    totalScore: number;
    allWords: WordDetailResult[];
    wordDetails: WordDetailResult[];
    wordCount: number;
    avatar: Avatar | null;
    isBot: boolean;
    achievements: string[];
}
export interface AiValidationResult {
    isValid: boolean;
    isAiVerified?: boolean;
    source?: string;
    reason?: string | null;
}
export interface CalculateScoresOptions {
    playerCount?: number;
}
/**
 * Get combo multiplier based on combo level
 * Higher combo levels give better multipliers
 * Combo 0-2: x1.0 (no bonus for small combos)
 * Combo 3-4: x1.25
 * Combo 5-6: x1.5
 * Combo 7-8: x1.75
 * Combo 9-10: x2.0
 * Combo 11+: x2.25 (max)
 */
export declare function getComboMultiplier(comboLevel: number): number;
/**
 * Get flat combo bonus based on combo level and word length
 * Combo bonus now scales with word length to reward longer words in combos
 * Formula: comboBonus = floor(comboLevel * wordLengthFactor)
 * Optimized to help slower/perfectionist players who find quality words
 * wordLengthFactor: 3 letters = 0.2, 4 letters = 0.5, 5 letters = 1.0, 6 letters = 1.5, 7+ letters = 2.0
 */
export declare function getComboBonus(comboLevel: number, wordLength?: number): number;
/**
 * Calculate score based on word length - 1 point per letter beyond the first
 * This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
 * Combo bonus is applied based on word length (longer words benefit more from combos)
 * Fire round multiplier (2x during earthquake fire round) is applied to the final score
 */
export declare function calculateWordScore(word: string, comboLevel?: number, fireRoundMultiplier?: number): number;
/**
 * Calculate final game scores for all players
 */
export declare function calculateGameScores(game: Game | null, wordCountMap?: Record<string, number>, dictionaryValidatedWords?: Set<string>, communityValidatedWords?: Set<string>, aiValidatedWords?: Map<string, AiValidationResult>, options?: CalculateScoresOptions): PlayerScoreResult[];
