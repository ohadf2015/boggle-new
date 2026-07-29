/**
 * Cognitive Scoring System
 *
 * Main entry point for calculating brain training scores.
 * Exports all domain calculators and aggregation utilities.
 */

import type {
  GameCognitiveInput,
  GameCognitiveScore,
  CognitiveDomain,
} from '@/shared/types/cognitive';

// Domain calculators
import { calculateProcessingSpeed, calculateWordsPerMinute } from './processingSpeed';
import { calculateWorkingMemory, calculateAverageWordLength } from './workingMemory';
import { calculateAttention, calculateComboRate } from './attention';
import { calculateFlexibility, countUniqueWordLengths, getWordLengthDistribution } from './flexibility';
import { calculateVocabulary, calculateRareWordRatio } from './vocabulary';

// Aggregation utilities
import {
  calculateOverallScore,
  calculateRollingAverage,
  getTierFromScore,
  calculateTierProgress,
  calculateTrend,
  aggregateGameScore,
} from './aggregation';

// Re-export all domain calculators
export {
  calculateProcessingSpeed,
  calculateWordsPerMinute,
  calculateWorkingMemory,
  calculateAverageWordLength,
  calculateAttention,
  calculateComboRate,
  calculateFlexibility,
  countUniqueWordLengths,
  getWordLengthDistribution,
  calculateVocabulary,
  calculateRareWordRatio,
};

// Re-export aggregation utilities
export {
  calculateOverallScore,
  calculateRollingAverage,
  getTierFromScore,
  calculateTierProgress,
  calculateTrend,
  aggregateGameScore,
};

/**
 * Calculate all cognitive scores for a single game
 *
 * This is the main function to call after a game ends.
 * Takes raw game data and returns scores for all 5 domains.
 *
 * Returns null for idle games (no words found) to indicate "no data"
 * - this prevents idle games from penalizing the player's rolling average
 */
export function calculateGameCognitiveScores(
  input: GameCognitiveInput,
  userId: string,
  gameSessionId?: string
): GameCognitiveScore | null {
  const {
    wordsFound,
    gameDurationSeconds,
    gridSize,
    wordLengths,
    maxCombo,
    hintsUsed,
    rareWordCount,
    legendaryWordCount,
  } = input;

  // Idle game - return null to indicate no data (neutral)
  // This prevents idle games from penalizing the player's rolling average
  if (wordsFound === 0) {
    return null;
  }

  // Calculate each domain score
  const processingSpeed = calculateProcessingSpeed({
    wordsFound,
    gameDurationSeconds,
    gridSize,
  });

  const workingMemory = calculateWorkingMemory({
    wordLengths,
    gridSize,
  });

  const attention = calculateAttention({
    wordsFound,
    maxCombo,
    hintsUsed,
  });

  const flexibility = calculateFlexibility({
    wordLengths,
  });

  const vocabulary = calculateVocabulary({
    wordsFound,
    rareWordCount,
    legendaryWordCount,
  });

  // Calculate raw metrics for storage
  const wordsPerMinute = calculateWordsPerMinute(wordsFound, gameDurationSeconds);
  const avgWordLength = calculateAverageWordLength(wordLengths);
  const uniqueWordLengths = countUniqueWordLengths(wordLengths);

  return {
    userId,
    gameSessionId,
    processingSpeed,
    workingMemory,
    attention,
    flexibility,
    vocabulary,
    wordsPerMinute,
    avgWordLength,
    maxCombo,
    uniqueWordLengths,
    rareWordCount,
    legendaryWordCount,
    hintsUsed,
    gridSize,
    gameDurationSeconds,
  };
}

/**
 * Get domain scores as a record (for aggregation functions)
 */
export function getDomainScoresRecord(
  score: GameCognitiveScore
): Record<CognitiveDomain, number> {
  return {
    processingSpeed: score.processingSpeed,
    workingMemory: score.workingMemory,
    attention: score.attention,
    flexibility: score.flexibility,
    vocabulary: score.vocabulary,
  };
}

/**
 * Update brain score with new game results
 *
 * Takes current brain score state and new game cognitive scores,
 * returns the updated overall score and tier info.
 */
export function updateBrainScore(
  currentDomainScores: Record<CognitiveDomain, number>,
  newGameScores: GameCognitiveScore,
  gamesAnalyzed: number
): {
  domainScores: Record<CognitiveDomain, number>;
  overallScore: number;
  tier: string;
  tierProgress: number;
} {
  // Update each domain with rolling average
  const updatedDomainScores = aggregateGameScore(
    currentDomainScores,
    newGameScores,
    gamesAnalyzed
  );

  // Calculate new overall score
  const overallScore = calculateOverallScore(updatedDomainScores);

  // Determine tier and progress
  const tier = getTierFromScore(overallScore);
  const tierProgress = calculateTierProgress(overallScore);

  return {
    domainScores: updatedDomainScores,
    overallScore,
    tier,
    tierProgress,
  };
}
