/**
 * Scoring Engine
 *
 * Calculates word scores and game results with combo bonuses.
 * Pure functions with no side effects - fully testable.
 *
 * Scoring Formula:
 *   baseScore = wordLength - 1 (each letter beyond first = 1 point)
 *   comboBonus = floor(comboLevel * wordLengthFactor)
 *   totalScore = baseScore + comboBonus
 *
 * Combo Multipliers (legacy, kept for compatibility):
 *   0-2: x1.0, 3-4: x1.25, 5-6: x1.5, 7-8: x1.75, 9-10: x2.0, 11+: x2.25
 */

import type { Avatar } from '@/shared/types/game';

// ==========================================
// Type Definitions
// ==========================================

export interface WordDetail {
  word: string;
  score: number;
  validated: boolean;
  inDictionary: boolean;
  validationSource: 'dictionary' | 'community' | 'ai' | 'cached' | 'none';
  isUnique: boolean;
  isDuplicate: boolean;
  comboBonus: number;
}

export interface PlayerScoreResult {
  username: string;
  score: number;
  totalScore: number;
  allWords: WordDetail[];
  wordDetails: WordDetail[];
  wordCount: number;
  avatar: Avatar | null;
  isBot: boolean;
  achievements: string[];
}

export interface GameUser {
  avatar?: Avatar;
  isBot?: boolean;
  [key: string]: unknown;
}

export interface GameForScoring {
  playerWords?: Record<string, string[]>;
  playerWordDetails?: Record<string, Array<{ word: string; score?: number; comboBonus?: number }>>;
  playerAchievements?: Record<string, string[]>;
  users?: Record<string, GameUser>;
}

export interface AIValidationResult {
  isValid: boolean;
  isAiVerified?: boolean;
  source?: string;
  confidence?: number;
}

// ==========================================
// Combo Calculations
// ==========================================

/**
 * Get combo multiplier based on combo level
 * Higher combo levels give better multipliers
 *
 * @param comboLevel - Current combo level (0+)
 * @returns Multiplier (1.0 - 2.25)
 */
export function getComboMultiplier(comboLevel: number): number {
  if (comboLevel <= 2) return 1.0;
  if (comboLevel <= 4) return 1.25;
  if (comboLevel <= 6) return 1.5;
  if (comboLevel <= 8) return 1.75;
  if (comboLevel <= 10) return 2.0;
  return 2.25; // Max multiplier at combo 11+
}

/**
 * Get flat combo bonus based on combo level and word length
 * Combo bonus scales with word length to reward longer words in combos
 *
 * Word length factors:
 *   3 letters: 0.2 (minimal bonus)
 *   4 letters: 0.5 (modest bonus)
 *   5 letters: 1.0 (full base bonus)
 *   6 letters: 1.5 (1.5x bonus)
 *   7+ letters: 2.0 (perfectionist reward)
 *
 * @param comboLevel - Current combo level (0+)
 * @param wordLength - Length of the word (default: 4)
 * @returns Bonus points (integer)
 */
export function getComboBonus(comboLevel: number, wordLength: number = 4): number {
  if (comboLevel <= 0) return 0;

  // Word length factor - longer words get better combo bonuses
  let wordLengthFactor: number;
  if (wordLength <= 3) {
    wordLengthFactor = 0.2;  // Very short words - minimal combo bonus
  } else if (wordLength === 4) {
    wordLengthFactor = 0.5;  // Short words - modest combo bonus
  } else if (wordLength === 5) {
    wordLengthFactor = 1.0;  // Medium words - full base bonus
  } else if (wordLength === 6) {
    wordLengthFactor = 1.5;  // Good words - 1.5x bonus
  } else {
    wordLengthFactor = 2.0;  // Long words (7+) - 2x bonus
  }

  // Base bonus caps at 10 points
  const baseBonus = Math.min(comboLevel, 10);

  return Math.floor(baseBonus * wordLengthFactor);
}

// ==========================================
// Score Calculations
// ==========================================

/**
 * Calculate score for a single word
 * Base score: 1 point per letter beyond the first
 * Plus combo bonus based on combo level and word length
 *
 * @param word - The word to score
 * @param comboLevel - Current combo level (default: 0)
 * @returns Total score for the word
 */
export function calculateWordScore(word: string, comboLevel: number = 0): number {
  const length = word.length;
  if (length <= 1) return 0; // Single letters not allowed
  const baseScore = length - 1; // Each letter beyond first = 1 point
  const bonus = getComboBonus(comboLevel, length);
  return baseScore + bonus;
}

/**
 * Calculate final game scores for all players
 *
 * @param game - Game object with playerWords, playerWordDetails, users
 * @param wordCountMap - Map of word to count across all players
 * @param dictionaryValidatedWords - Words validated by dictionary
 * @param communityValidatedWords - Words validated by community
 * @param aiValidatedWords - Words validated by AI with validation results
 * @returns Array of player score objects, sorted by score descending
 */
export function calculateGameScores(
  game: GameForScoring | null,
  wordCountMap: Record<string, number> = {},
  dictionaryValidatedWords: Set<string> = new Set(),
  communityValidatedWords: Set<string> = new Set(),
  aiValidatedWords: Map<string, AIValidationResult> = new Map()
): PlayerScoreResult[] {
  if (!game) return [];

  const results: PlayerScoreResult[] = [];
  const playerWords = game.playerWords || {};
  const playerWordDetails = game.playerWordDetails || {};

  for (const [username, words] of Object.entries(playerWords)) {
    const uniqueWords = [...new Set(words)];
    let totalScore = 0;
    const wordDetails: WordDetail[] = [];

    for (const word of uniqueWords) {
      // Determine if word is valid and get validation source
      let validated = false;
      let inDictionary = false;
      let validationSource: WordDetail['validationSource'] = 'none';

      if (dictionaryValidatedWords.has(word)) {
        validated = true;
        inDictionary = true;
        validationSource = 'dictionary';
      } else if (communityValidatedWords.has(word)) {
        validated = true;
        validationSource = 'community';
      } else if (aiValidatedWords.has(word)) {
        const aiResult = aiValidatedWords.get(word)!;
        validated = aiResult.isValid;
        validationSource = aiResult.isAiVerified ? 'ai' : (aiResult.source as WordDetail['validationSource']) || 'cached';
      }

      // Check if word is unique (only one player submitted it)
      const isUnique = (wordCountMap[word] || 0) === 1;

      // Get pre-calculated score from word details if available
      const existingDetails = (playerWordDetails[username] || []).find(d => d.word === word);
      let score = 0;

      if (validated) {
        if (existingDetails && typeof existingDetails.score === 'number') {
          score = existingDetails.score;
        } else {
          score = calculateWordScore(word, 0);
        }
        totalScore += score;
      }

      wordDetails.push({
        word,
        score,
        validated,
        inDictionary,
        validationSource,
        isUnique,
        isDuplicate: !isUnique,
        comboBonus: existingDetails?.comboBonus || 0
      });
    }

    // Get user data for avatar
    const userData = game.users?.[username] || {};

    results.push({
      username,
      score: totalScore,
      totalScore,
      allWords: wordDetails,
      wordDetails,
      wordCount: uniqueWords.length,
      avatar: userData.avatar || null,
      isBot: userData.isBot || false,
      achievements: game.playerAchievements?.[username] || []
    });
  }

  // Sort by total score descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  return results;
}

// ==========================================
// Exports (CommonJS compatible)
// ==========================================

module.exports = {
  calculateWordScore,
  calculateGameScores,
  getComboBonus,
  getComboMultiplier,
};
