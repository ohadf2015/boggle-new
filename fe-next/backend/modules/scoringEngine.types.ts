/**
 * Scoring Engine
 *
 * Calculates word scores and game results with combo bonuses.
 * Pure functions with no side effects - fully testable.
 *
 * Scoring Formula (exponential base scores):
 *   baseScore = lookup by word length: 2→5, 3→10, 4→20, 5→50, 6→100, 7→200, 8+→500
 *   comboBonus = floor(comboLevel * wordLengthFactor)
 *   totalScore = (baseScore + comboBonus) * fireRoundMultiplier * rarityMultiplier
 *
 * @see shared/utils/scoring.ts — single source of truth
 */

import type { Avatar } from '@/shared/types/game';
import {
  calculateWordScore as canonicalCalculateWordScore,
  getComboBonus as canonicalGetComboBonus,
  getComboMultiplier as canonicalGetComboMultiplier,
} from '@/shared/utils/scoring';

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
  isAiVerified?: boolean;
  aiReason?: string;
  // Timing data for pace analysis
  timestamp?: number | null;
  timeSinceStart?: number | null;
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
  playerWordDetails?: Record<string, Array<{
    word: string;
    score?: number;
    comboBonus?: number;
    timestamp?: number;
    timeSinceStart?: number;
  }>>;
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
// Scoring — re-exported from canonical source
// ==========================================

/** @see shared/utils/scoring.ts — single source of truth for all scoring */
export const getComboMultiplier = canonicalGetComboMultiplier;
export const getComboBonus = canonicalGetComboBonus;
export const calculateWordScore = canonicalCalculateWordScore;

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
          // Use pre-calculated score (includes combo bonus from submit time)
          score = existingDetails.score;
        } else {
          // Fallback: base score + any recorded combo bonus
          score = calculateWordScore(word, 0) + (existingDetails?.comboBonus ?? 0);
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

