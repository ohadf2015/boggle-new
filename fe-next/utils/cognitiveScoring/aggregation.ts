/**
 * Score Aggregation Utilities
 *
 * Combines individual domain scores into overall brain score.
 * Handles rolling averages for long-term tracking.
 */

import type {
  BrainTier,
  CognitiveDomain,
  GameCognitiveScore,
  TrendDirection,
} from '@/shared/types/cognitive';
import { DOMAIN_WEIGHTS, TIER_CONFIGS } from '@/shared/types/cognitive';

/**
 * Calculate overall brain score from individual domain scores
 *
 * Uses weighted average based on DOMAIN_WEIGHTS:
 * - Processing Speed: 20%
 * - Working Memory: 25% (slightly higher - core cognitive skill)
 * - Attention: 20%
 * - Flexibility: 15%
 * - Vocabulary: 20%
 */
export function calculateOverallScore(domainScores: Record<CognitiveDomain, number>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    const score = domainScores[domain as CognitiveDomain] ?? 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  // Normalize in case weights don't sum to 1
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return Math.round(overallScore);
}

/**
 * Calculate rolling average score incorporating new game data
 *
 * Uses exponential moving average with decay factor:
 * newAvg = oldAvg * (1 - alpha) + newScore * alpha
 *
 * Alpha determines how much weight to give new scores:
 * - Higher alpha = more responsive to recent performance
 * - Lower alpha = more stable, slower to change
 */
export function calculateRollingAverage(
  currentScore: number,
  newScore: number,
  gamesAnalyzed: number,
  alpha: number = 0.15
): number {
  // For the first few games, use simple average instead of EMA
  if (gamesAnalyzed < 5) {
    const simpleAvg = (currentScore * gamesAnalyzed + newScore) / (gamesAnalyzed + 1);
    return Math.round(simpleAvg);
  }

  // Exponential moving average for stability
  const newAverage = currentScore * (1 - alpha) + newScore * alpha;
  return Math.round(newAverage);
}

/**
 * Determine tier from overall score
 */
export function getTierFromScore(score: number): BrainTier {
  for (const config of TIER_CONFIGS) {
    if (score >= config.minScore && score <= config.maxScore) {
      return config.tier;
    }
  }
  return 'novice'; // Default fallback
}

/**
 * Calculate progress percentage within current tier
 */
export function calculateTierProgress(score: number): number {
  const tier = getTierFromScore(score);
  const config = TIER_CONFIGS.find(t => t.tier === tier);

  if (!config) return 0;

  const tierRange = config.maxScore - config.minScore;
  const progressInTier = score - config.minScore;

  return Math.min(100, Math.round((progressInTier / tierRange) * 100));
}

/**
 * Determine trend direction by comparing recent to historical scores
 */
export function calculateTrend(
  recentScores: number[],
  historicalAvg: number,
  threshold: number = 5
): TrendDirection {
  if (recentScores.length === 0) return 'stable';

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const diff = recentAvg - historicalAvg;

  if (diff > threshold) return 'improving';
  if (diff < -threshold) return 'declining';
  return 'stable';
}

/**
 * Aggregate game cognitive scores into updated brain score
 *
 * Takes current brain score state and a new game's cognitive scores,
 * returns updated aggregate scores.
 */
export function aggregateGameScore(
  currentScores: Record<CognitiveDomain, number>,
  newGameScores: GameCognitiveScore,
  gamesAnalyzed: number
): Record<CognitiveDomain, number> {
  const domains: CognitiveDomain[] = [
    'processingSpeed',
    'workingMemory',
    'attention',
    'flexibility',
    'vocabulary'
  ];

  const updatedScores: Record<CognitiveDomain, number> = {
    processingSpeed: 0,
    workingMemory: 0,
    attention: 0,
    flexibility: 0,
    vocabulary: 0
  };

  for (const domain of domains) {
    updatedScores[domain] = calculateRollingAverage(
      currentScores[domain],
      newGameScores[domain],
      gamesAnalyzed
    );
  }

  return updatedScores;
}
