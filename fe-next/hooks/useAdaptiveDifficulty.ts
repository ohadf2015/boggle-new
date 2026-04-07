/**
 * useAdaptiveDifficulty Hook
 *
 * React hook for adaptive difficulty system integration.
 * Provides tier-adjusted configs, hint data, and ProgressionContext wiring.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useProgression } from '@/contexts/ProgressionContext';
import { getLevelConfig } from '@/lib/adventure/levelConfig';
import type { LevelConfig } from '@/types/adventure';
import type { DifficultyTier, LevelAttemptWithScore } from '@/types/difficulty';
import {
  calculateMetrics,
  calculateCombinedScore,
  getRecentAttempts,
  determineTier,
  applyTierAdjustments,
  getHintLevel,
  generateHint,
} from '@/lib/adaptiveDifficulty';
import { getCurrentTier, saveTier } from '@/lib/adaptiveDifficulty/tierStorage';

// ==============================================
// TYPES
// ==============================================

export interface UseAdaptiveDifficultyOptions {
  /** World number (1-10) */
  world: number;
  /** Level number within world (1-7) */
  level: number;
}

export interface UseAdaptiveDifficultyReturn {
  /** Current difficulty tier (invisible to player) */
  tier: DifficultyTier;
  /** Level config adjusted for current tier */
  adjustedConfig: LevelConfig;
  /** Current hint data for this level (if any) */
  hintData: ReturnType<typeof generateHint>;
  /** Power-up cooldown multiplier for this tier */
  powerUpCooldownMultiplier: number;
  /** Record completion and update tier - WIRED TO ProgressionContext */
  recordCompletion: (params: {
    isCompletion: boolean;
    timeRemaining: number;
    timerSeconds: number;
    score: number;
    words: number;
    wordPath?: Array<{ row: number; col: number }>;
    targetWord?: string;
  }) => Promise<void>;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for accessing adaptive difficulty system
 *
 * Features:
 * - Tier-adjusted level configs (easy/normal/hard)
 * - Progressive hint escalation based on attempts
 * - localStorage persistence of tier state
 * - ProgressionContext wiring for attempt tracking
 *
 * @param options - World and level to configure
 * @returns Adaptive difficulty state and functions
 *
 * @example
 * const { tier, adjustedConfig, hintData, recordCompletion } = useAdaptiveDifficulty({
 *   world: 1,
 *   level: 1,
 * });
 */
export function useAdaptiveDifficulty(
  options: UseAdaptiveDifficultyOptions
): UseAdaptiveDifficultyReturn {
  const { world, level } = options;
  const { attempts = [], recordAttempt } = useProgression();

  // Initialize tier from localStorage
  const [tier, setTier] = useState<DifficultyTier>(() => getCurrentTier());

  // Get base config and apply tier adjustments
  const baseConfig = useMemo(() => getLevelConfig(world, level), [world, level]);
  const adjustedConfig = useMemo(
    () => applyTierAdjustments(baseConfig, tier),
    [baseConfig, tier]
  );

  // Get power-up cooldown multiplier for hard tier
  const powerUpCooldownMultiplier = tier === 'hard' ? 1.5 : 1.0;

  // Calculate hint data based on same-level attempt count
  const hintData = useMemo(() => {
    // Filter attempts for this specific level
    const sameLevelAttempts = attempts.filter(
      (a) => a.world === world && a.level === level
    );
    const attemptCount = sameLevelAttempts.length;

    // No target word/path available without game state
    // This will be enhanced when integrated with AdventureGame
    return generateHint({
      attemptCount,
      targetWord: '', // Placeholder - filled by integration
      wordPath: [],
    });
  }, [attempts, world, level]);

  // Re-evaluate tier when attempts change
  useEffect(() => {
    // Convert attempts to LevelAttemptWithScore format
    const attemptsWithScore: LevelAttemptWithScore[] = attempts.map((a) => {
      // Calculate combined score from attempt data
      // Note: We approximate isCompletion from bestScore > 0
      // This will be more accurate when combinedScore is stored
      const isCompletion = a.bestScore > 0;
      const metrics = calculateMetrics({
        isCompletion,
        timeRemaining: a.bestTimeRemaining,
        timerSeconds: baseConfig.timerSeconds,
        score: a.bestScore,
        words: a.bestWords,
      });
      const combinedScore = calculateCombinedScore(metrics);

      return {
        ...a,
        isCompletion,
        combinedScore,
      };
    });

    const recentAttempts = getRecentAttempts(attemptsWithScore, true);
    const decision = determineTier(recentAttempts);

    if (decision.tier !== tier) {
      setTier(decision.tier);
      saveTier(decision.tier);
    }
  }, [attempts, tier, baseConfig.timerSeconds]);

  // Record completion handler - WIRED TO ProgressionContext.recordAttempt
  const recordCompletion = useCallback(
    async (
      params: Parameters<UseAdaptiveDifficultyReturn['recordCompletion']>[0]
    ) => {
      const { isCompletion, timeRemaining, timerSeconds, score, words } = params;

      // Calculate performance metrics
      const metrics = calculateMetrics({
        isCompletion,
        timeRemaining,
        timerSeconds,
        score,
        words,
      });
      const combinedScore = calculateCombinedScore(metrics);

      // WIRE TO ProgressionContext - record the attempt
      // Note: combinedScore and tier are stored as metadata for future tier decisions
      // but ProgressionContext.recordAttempt currently doesn't accept them
      // This is okay - we'll enhance the API endpoint later to accept these fields
      await recordAttempt(
        world,
        level,
        words,
        score,
        timeRemaining,
        {}, // objectiveProgress - placeholder for now
        isCompletion
      );

      // Tier re-evaluation happens in useEffect when attempts change
      // The newly recorded attempt will trigger the effect and potentially adjust tier
    },
    [world, level, recordAttempt]
  );

  return useMemo(() => ({
    tier,
    adjustedConfig,
    hintData,
    powerUpCooldownMultiplier,
    recordCompletion,
  }), [tier, adjustedConfig, hintData, powerUpCooldownMultiplier, recordCompletion]);
}
