/**
 * Scoring Calculation Utilities
 * Handles final game score calculation and player results
 *
 * IMPORTANT: Core scoring functions now imported from shared/utils/scoring.ts
 * This ensures consistency across frontend and backend.
 */

import type { Game, Avatar, WordDetail } from '@/shared/types/game';

// Import canonical scoring functions from shared module
import {
  calculateWordScore,
  getComboBonus,
  getComboMultiplier,
} from '@/shared/utils/scoring';

// Re-export for backwards compatibility
export { calculateWordScore, getComboBonus, getComboMultiplier };

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

      // Calculate word rarity based on how many players found it
      // Rarity scoring rewards finding words that others missed
      let rarityMultiplier = 1.0;
      let wordRarity: 'common' | 'uncommon' | 'rare' | 'legendary' = 'common';

      if (playerCount > 1 && !duplicateRuleDisabled) {
        const playersWhoFoundThis = wordCountMap[word] || 1;
        const percentageWhoFound = (playersWhoFoundThis / playerCount) * 100;

        if (percentageWhoFound <= 5) {
          // Only 1 player in 20 found this - legendary!
          rarityMultiplier = 2.0;
          wordRarity = 'legendary';
        } else if (percentageWhoFound <= 15) {
          // Less than 15% of players found this - rare
          rarityMultiplier = 1.5;
          wordRarity = 'rare';
        } else if (percentageWhoFound <= 30) {
          // 15-30% of players found this - uncommon
          rarityMultiplier = 1.25;
          wordRarity = 'uncommon';
        }
        // else: common word (50%+ found it), no bonus
      }

      // Get pre-calculated score from word details if available
      const existingDetails = (playerWordDetails[username] || []).find(d => d.word === word);
      let score = 0;

      if (validated) {
        if (existingDetails && typeof existingDetails.score === 'number') {
          score = existingDetails.score;
        } else {
          score = calculateWordScore(word, 0);
        }

        // Apply rarity multiplier to base score
        score = Math.round(score * rarityMultiplier);
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
        fireRoundBonus: existingDetails?.fireRoundBonus || 0,
        // Include rarity scoring data
        rarityMultiplier,
        wordRarity
      } as WordDetailResult & { rarityMultiplier: number; wordRarity: string };

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
