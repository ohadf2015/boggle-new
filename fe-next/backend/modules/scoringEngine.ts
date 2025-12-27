/**
 * Scoring Calculation Utilities
 * Handles word scoring, combo bonuses, and final game score calculation
 */

import type { Game, Avatar, WordDetail } from '@/shared/types/game';

export interface WordDetailResult extends WordDetail {
  // Additional fields not in base WordDetail
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
 * Combo bonus now scales with word length to reward longer words in combos
 * Formula: comboBonus = floor(comboLevel * wordLengthFactor)
 * Optimized to help slower/perfectionist players who find quality words
 * wordLengthFactor: 3 letters = 0.2, 4 letters = 0.5, 5 letters = 1.0, 6 letters = 1.5, 7+ letters = 2.0
 */
export function getComboBonus(comboLevel: number, wordLength: number = 4): number {
  if (comboLevel <= 0) return 0; // No bonus for combo 0

  // Word length factor - longer words get significantly better combo bonuses
  // This rewards perfectionist players who find quality words
  // Short words still get minimal combo benefit to discourage short word spam
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
    wordLengthFactor = 2.0;  // Long words (7+) - 2x bonus (perfectionist reward)
  }

  // Base bonus scales with combo level, starting from combo 1
  // This helps slower players who build combos more deliberately
  const baseBonus = Math.min(comboLevel, 10); // Caps at 10 bonus points base

  return Math.floor(baseBonus * wordLengthFactor);
}

/**
 * Calculate score based on word length - 1 point per letter beyond the first
 * This gives every letter value: 2 letters = 1 point, 3 letters = 2 points, 4 letters = 3 points, etc.
 * Combo bonus is applied based on word length (longer words benefit more from combos)
 * Fire round multiplier (2x during earthquake fire round) is applied to the final score
 */
export function calculateWordScore(
  word: string,
  comboLevel: number = 0,
  fireRoundMultiplier: number = 1
): number {
  const length = word.length;
  if (length === 1) return 0; // Single letters not allowed
  const baseScore = length - 1; // Each letter beyond the first gets 1 point
  const bonus = getComboBonus(comboLevel, length);
  return (baseScore + bonus) * fireRoundMultiplier;
}

/**
 * Calculate final game scores for all players
 */
export function calculateGameScores(
  game: Game | null,
  wordCountMap: Record<string, number> = {},
  dictionaryValidatedWords: Set<string> = new Set(),
  communityValidatedWords: Set<string> = new Set(),
  aiValidatedWords: Map<string, AiValidationResult> = new Map(),
  options: CalculateScoresOptions = {}
): PlayerScoreResult[] {
  const { playerCount = 0 } = options;

  // Disable duplicate rule for large rooms (more than 7 players)
  const duplicateRuleDisabled = playerCount > 7;
  if (!game) return [];

  const results: PlayerScoreResult[] = [];
  const playerWords = game.playerWords || {};
  const playerWordDetails = game.playerWordDetails || {};

  for (const [username, words] of Object.entries(playerWords)) {
    const uniqueWords = [...new Set(words)];
    let totalScore = 0;
    const wordDetails: WordDetailResult[] = [];

    for (const word of uniqueWords) {
      // Determine if word is valid and get validation source
      let validated = false;
      let inDictionary = false;
      let validationSource: 'dictionary' | 'community' | 'ai' | 'cached' | 'none' = 'none';
      let isAiVerified = false;
      let aiReason: string | null = null;

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
        isAiVerified = aiResult.isAiVerified === true;
        validationSource = aiResult.isAiVerified ? 'ai' : (aiResult.source as 'cached') || 'cached';
        aiReason = aiResult.reason || null;
      }

      // Check if word is unique (only one player submitted it)
      // When duplicate rule is disabled (large rooms with >7 players), treat all words as unique
      const isUnique = duplicateRuleDisabled || (wordCountMap[word] || 0) === 1;

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

      const wordDetail: WordDetailResult = {
        word,
        score,
        validated,
        inDictionary,
        validationSource,
        isUnique,
        isDuplicate: !isUnique, // Frontend expects isDuplicate (inverse of isUnique)
        comboBonus: existingDetails?.comboBonus || 0,
        isAiVerified,
        // Include timestamp for pace analysis in PlayerInsights
        timestamp: (existingDetails as WordDetailResult | undefined)?.timestamp || null,
        timeSinceStart: (existingDetails as WordDetailResult | undefined)?.timeSinceStart || null,
        // Include fire round data for results display
        fireRoundMultiplier: existingDetails?.fireRoundMultiplier || 1,
        fireRoundBonus: existingDetails?.fireRoundBonus || 0
      };

      // Only add aiReason if present (for invalid AI-verified words or valid ones with explanation)
      if (aiReason) {
        wordDetail.aiReason = aiReason;
      }

      wordDetails.push(wordDetail);
    }

    // Get user data for avatar
    const userData = game.users?.[username];

    results.push({
      username,
      score: totalScore, // Frontend expects 'score' not 'totalScore'
      totalScore, // Keep for backwards compatibility with other usages
      allWords: wordDetails, // Frontend expects 'allWords' not 'wordDetails'
      wordDetails, // Keep for backwards compatibility with other usages
      wordCount: uniqueWords.length,
      avatar: userData?.avatar || null,
      isBot: userData?.isBot || false,
      achievements: game.playerAchievements?.[username] || []
    });
  }

  // Sort by total score descending
  results.sort((a, b) => b.totalScore - a.totalScore);

  return results;
}

// CommonJS exports for backward compatibility
module.exports = {
  calculateWordScore,
  calculateGameScores,
  getComboBonus,
  getComboMultiplier // Legacy, kept for backwards compatibility
};
