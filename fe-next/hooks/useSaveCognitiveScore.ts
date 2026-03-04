/**
 * useSaveCognitiveScore Hook
 *
 * Calculates and saves cognitive scores after a game ends.
 * Updates both game_cognitive_scores and brain_scores tables.
 */

import { useCallback, useRef, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import logger from '@/utils/logger';
import {
  calculateGameCognitiveScores,
  updateBrainScore,
  getTierFromScore,
  calculateTierProgress,
} from '@/utils/cognitiveScoring';
import type {
  GameCognitiveInput,
  CognitiveDomain,
} from '@/shared/types/cognitive';
import { getValidUUIDOrUndefined } from '@/utils/validation/uuid';

// Word length thresholds for rarity classification
const RARE_WORD_MIN_LENGTH = 6;
const LEGENDARY_WORD_MIN_LENGTH = 8;

interface WordData {
  word: string;
  score?: number;
  isValid: boolean;
  comboBonus?: number;
}

interface SaveCognitiveScoreInput {
  playerWordData: WordData[];
  gameDuration: number;
  gridSize?: number;
  maxCombo?: number;
  hintsUsed?: number;
  gameSessionId?: string;
}

interface CognitiveScoreResult {
  processingSpeed: number;
  workingMemory: number;
  attention: number;
  flexibility: number;
  vocabulary: number;
  overallScore: number;
  tier: string;
  scoreDelta: number;
}

export function useSaveCognitiveScore() {
  const { user } = useAuth();
  const userId = user?.id;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSavedRef = useRef(false);
  // Use createClient() to ensure auth session is properly available (same pattern as useBrainScore)
  const supabase = useMemo(() => createClient(), []);

  const saveCognitiveScore = useCallback(async (
    input: SaveCognitiveScoreInput
  ): Promise<CognitiveScoreResult | null> => {
    // Only save for authenticated users
    if (!userId) {
      logger.log('[useSaveCognitiveScore] Skipping - no authenticated user');
      return null;
    }

    // Prevent duplicate saves
    if (hasSavedRef.current) {
      logger.log('[useSaveCognitiveScore] Already saved this session');
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Extract valid words only
      const validWords = input.playerWordData.filter(w => w.isValid);
      const wordLengths = validWords.map(w => w.word.length);

      // Calculate rarity counts based on word length
      const rareWordCount = validWords.filter(w => w.word.length >= RARE_WORD_MIN_LENGTH && w.word.length < LEGENDARY_WORD_MIN_LENGTH).length;
      const legendaryWordCount = validWords.filter(w => w.word.length >= LEGENDARY_WORD_MIN_LENGTH).length;

      // Calculate max combo from word data if not provided
      let maxCombo = input.maxCombo ?? 0;
      if (maxCombo === 0) {
        // Estimate max combo from consecutive words with combo bonuses
        let currentCombo = 0;
        for (const word of validWords) {
          if (word.comboBonus && word.comboBonus > 0) {
            currentCombo++;
            maxCombo = Math.max(maxCombo, currentCombo);
          } else {
            currentCombo = 0;
          }
        }
      }

      // Prepare input for cognitive score calculation
      const cognitiveInput: GameCognitiveInput = {
        wordsFound: validWords.length,
        gameDurationSeconds: input.gameDuration,
        gridSize: input.gridSize ?? 25, // Default 5x5 grid (25 cells)
        wordLengths,
        maxCombo,
        hintsUsed: input.hintsUsed ?? 0,
        rareWordCount,
        legendaryWordCount,
      };

      // Calculate cognitive scores
      const gameScores = calculateGameCognitiveScores(
        cognitiveInput,
        userId,
        input.gameSessionId
      );

      if (!gameScores) {
        logger.log('[useSaveCognitiveScore] No scores calculated (insufficient data)');
        return null;
      }

      logger.log('[useSaveCognitiveScore] Calculated scores:', {
        processingSpeed: gameScores.processingSpeed,
        workingMemory: gameScores.workingMemory,
        attention: gameScores.attention,
        flexibility: gameScores.flexibility,
        vocabulary: gameScores.vocabulary,
      });

      // Save game cognitive score to database
      // Note: game_session_id must be a valid UUID that exists in game_sessions table
      // Non-UUID formats like "mp_PLW9X5_1767889799004" are filtered out
      let verifiedGameSessionId: string | undefined = getValidUUIDOrUndefined(input.gameSessionId);

      // Verify game session exists in database to avoid foreign key constraint errors
      if (verifiedGameSessionId) {
        const { data: sessionExists } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('id', verifiedGameSessionId)
          .maybeSingle();

        if (!sessionExists) {
          logger.log('[useSaveCognitiveScore] Game session not found in database, skipping session link');
          verifiedGameSessionId = undefined;
        }
      }

      // Ensure all domain scores are integers (handle any floating point edge cases)
      const safeProcessingSpeed = Math.round(gameScores.processingSpeed);
      const safeWorkingMemory = Math.round(gameScores.workingMemory);
      const safeAttention = Math.round(gameScores.attention);
      const safeFlexibility = Math.round(gameScores.flexibility);
      const safeVocabulary = Math.round(gameScores.vocabulary);

      const { error: insertError } = await supabase
        .from('game_cognitive_scores')
        .insert({
          user_id: userId,
          game_session_id: verifiedGameSessionId,
          processing_speed: safeProcessingSpeed,
          working_memory: safeWorkingMemory,
          attention: safeAttention,
          flexibility: safeFlexibility,
          vocabulary: safeVocabulary,
          words_per_minute: gameScores.wordsPerMinute,
          avg_word_length: gameScores.avgWordLength,
          max_combo: gameScores.maxCombo,
          unique_word_lengths: gameScores.uniqueWordLengths,
          rare_word_count: gameScores.rareWordCount,
          legendary_word_count: gameScores.legendaryWordCount,
          hints_used: gameScores.hintsUsed,
          grid_size: gameScores.gridSize,
          game_duration_seconds: gameScores.gameDurationSeconds,
        });

      if (insertError) {
        // Handle foreign key constraint error gracefully - retry without session ID
        if (insertError.code === '23503' && verifiedGameSessionId) {
          logger.log('[useSaveCognitiveScore] Session not found, retrying without session link');
          await supabase
            .from('game_cognitive_scores')
            .insert({
              user_id: userId,
              game_session_id: null,
              processing_speed: safeProcessingSpeed,
              working_memory: safeWorkingMemory,
              attention: safeAttention,
              flexibility: safeFlexibility,
              vocabulary: safeVocabulary,
              words_per_minute: gameScores.wordsPerMinute,
              avg_word_length: gameScores.avgWordLength,
              max_combo: gameScores.maxCombo,
              unique_word_lengths: gameScores.uniqueWordLengths,
              rare_word_count: gameScores.rareWordCount,
              legendary_word_count: gameScores.legendaryWordCount,
              hints_used: gameScores.hintsUsed,
              grid_size: gameScores.gridSize,
              game_duration_seconds: gameScores.gameDurationSeconds,
            });
        } else {
          logger.error('[useSaveCognitiveScore] Failed to insert game score:', insertError);
        }
        // Continue to update brain score even if game score insert fails
      }

      // Fetch current brain score
      const { data: currentBrainScore } = await supabase
        .from('brain_scores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let overallScore: number;
      let tier: string;
      let tierProgress: number;
      let scoreDelta: number = 0;

      if (currentBrainScore) {
        // Update existing brain score with rolling average
        const currentDomainScores: Record<CognitiveDomain, number> = {
          processingSpeed: currentBrainScore.processing_speed,
          workingMemory: currentBrainScore.working_memory,
          attention: currentBrainScore.attention,
          flexibility: currentBrainScore.flexibility,
          vocabulary: currentBrainScore.vocabulary,
        };

        const updated = updateBrainScore(
          currentDomainScores,
          gameScores,
          currentBrainScore.games_analyzed
        );

        // Update brain score in database (ensure all scores are integers)
        const { error: updateError } = await supabase
          .from('brain_scores')
          .update({
            processing_speed: Math.round(updated.domainScores.processingSpeed),
            working_memory: Math.round(updated.domainScores.workingMemory),
            attention: Math.round(updated.domainScores.attention),
            flexibility: Math.round(updated.domainScores.flexibility),
            vocabulary: Math.round(updated.domainScores.vocabulary),
            overall_score: Math.round(updated.overallScore),
            tier: updated.tier,
            tier_progress: Math.round(updated.tierProgress),
            games_analyzed: currentBrainScore.games_analyzed + 1,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          logger.error('[useSaveCognitiveScore] Failed to update brain score:', updateError);
        }

        overallScore = updated.overallScore;
        tier = updated.tier;
        tierProgress = updated.tierProgress;
        scoreDelta = overallScore - currentBrainScore.overall_score;

        // Update brain_score_history for trend tracking (fetch-then-update to handle unique constraint)
        const today = new Date().toISOString().split('T')[0];
        const { data: existingHistory } = await supabase
          .from('brain_score_history')
          .select('*')
          .eq('user_id', userId)
          .eq('period_type', 'daily')
          .eq('period_start', today)
          .maybeSingle();

        if (existingHistory) {
          // Update existing entry for today (ensure all scores are integers)
          await supabase
            .from('brain_score_history')
            .update({
              overall_score: Math.round(updated.overallScore),
              processing_speed: Math.round(updated.domainScores.processingSpeed),
              working_memory: Math.round(updated.domainScores.workingMemory),
              attention: Math.round(updated.domainScores.attention),
              flexibility: Math.round(updated.domainScores.flexibility),
              vocabulary: Math.round(updated.domainScores.vocabulary),
              games_played: (existingHistory.games_played || 0) + 1,
            })
            .eq('id', existingHistory.id);
        } else {
          // Insert new entry for today (ensure all scores are integers)
          await supabase
            .from('brain_score_history')
            .insert({
              user_id: userId,
              period_type: 'daily',
              period_start: today,
              overall_score: Math.round(updated.overallScore),
              processing_speed: Math.round(updated.domainScores.processingSpeed),
              working_memory: Math.round(updated.domainScores.workingMemory),
              attention: Math.round(updated.domainScores.attention),
              flexibility: Math.round(updated.domainScores.flexibility),
              vocabulary: Math.round(updated.domainScores.vocabulary),
              games_played: 1,
              drills_completed: 0,
            });
        }

      } else {
        // Create new brain score (use safe integer values defined earlier)
        overallScore = Math.round((
          safeProcessingSpeed +
          safeWorkingMemory +
          safeAttention +
          safeFlexibility +
          safeVocabulary
        ) / 5);
        tier = getTierFromScore(overallScore);
        tierProgress = Math.round(calculateTierProgress(overallScore));
        scoreDelta = overallScore; // First game so all points are new

        const { error: createError } = await supabase
          .from('brain_scores')
          .insert({
            user_id: userId,
            processing_speed: safeProcessingSpeed,
            working_memory: safeWorkingMemory,
            attention: safeAttention,
            flexibility: safeFlexibility,
            vocabulary: safeVocabulary,
            overall_score: overallScore,
            tier,
            tier_progress: tierProgress,
            games_analyzed: 1,
            last_activity_at: new Date().toISOString(),
          });

        if (createError) {
          logger.error('[useSaveCognitiveScore] Failed to create brain score:', createError);
        }

        // Also add to history (fetch-then-update to handle case where drill was done first)
        const todayDate = new Date().toISOString().split('T')[0];
        const { data: existingHistoryNew } = await supabase
          .from('brain_score_history')
          .select('*')
          .eq('user_id', userId)
          .eq('period_type', 'daily')
          .eq('period_start', todayDate)
          .maybeSingle();

        if (existingHistoryNew) {
          await supabase
            .from('brain_score_history')
            .update({
              overall_score: overallScore,
              processing_speed: safeProcessingSpeed,
              working_memory: safeWorkingMemory,
              attention: safeAttention,
              flexibility: safeFlexibility,
              vocabulary: safeVocabulary,
              games_played: (existingHistoryNew.games_played || 0) + 1,
            })
            .eq('id', existingHistoryNew.id);
        } else {
          await supabase
            .from('brain_score_history')
            .insert({
              user_id: userId,
              period_type: 'daily',
              period_start: todayDate,
              overall_score: overallScore,
              processing_speed: safeProcessingSpeed,
              working_memory: safeWorkingMemory,
              attention: safeAttention,
              flexibility: safeFlexibility,
              vocabulary: safeVocabulary,
              games_played: 1,
              drills_completed: 0,
            });
        }
      }

      hasSavedRef.current = true;
      setIsSaving(false);

      return {
        processingSpeed: gameScores.processingSpeed,
        workingMemory: gameScores.workingMemory,
        attention: gameScores.attention,
        flexibility: gameScores.flexibility,
        vocabulary: gameScores.vocabulary,
        overallScore,
        tier,
        scoreDelta,
      };
    } catch (err) {
      logger.error('[useSaveCognitiveScore] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save cognitive score');
      setIsSaving(false);
      return null;
    }
  }, [userId, supabase]);

  // Reset the saved flag (call when mounting a new game)
  const resetSaveState = useCallback(() => {
    hasSavedRef.current = false;
    setError(null);
  }, []);

  return {
    saveCognitiveScore,
    resetSaveState,
    isSaving,
    error,
  };
}
