/**
 * useSaveCognitiveScore Hook
 *
 * Calculates and saves cognitive scores after a game ends.
 * Updates both game_cognitive_scores and brain_scores tables.
 */

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  calculateGameCognitiveScores,
  updateBrainScore,
  getDomainScoresRecord,
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

  const saveCognitiveScore = useCallback(async (
    input: SaveCognitiveScoreInput
  ): Promise<CognitiveScoreResult | null> => {
    // Only save for authenticated users
    if (!userId) {
      console.log('[useSaveCognitiveScore] Skipping - no authenticated user');
      return null;
    }

    // Prevent duplicate saves
    if (hasSavedRef.current) {
      console.log('[useSaveCognitiveScore] Already saved this session');
      return null;
    }

    // Check if supabase is available
    if (!supabase) {
      console.log('[useSaveCognitiveScore] Skipping - supabase not available');
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
        gridSize: input.gridSize ?? 4, // Default 4x4 grid
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

      console.log('[useSaveCognitiveScore] Calculated scores:', {
        processingSpeed: gameScores.processingSpeed,
        workingMemory: gameScores.workingMemory,
        attention: gameScores.attention,
        flexibility: gameScores.flexibility,
        vocabulary: gameScores.vocabulary,
      });

      // Save game cognitive score to database
      // Note: game_session_id must be a valid UUID or undefined
      // Non-UUID formats like "mp_PLW9X5_1767889799004" are filtered out
      const validGameSessionId = getValidUUIDOrUndefined(input.gameSessionId);
      const { error: insertError } = await supabase
        .from('game_cognitive_scores')
        .insert({
          user_id: userId,
          game_session_id: validGameSessionId,
          processing_speed: gameScores.processingSpeed,
          working_memory: gameScores.workingMemory,
          attention: gameScores.attention,
          flexibility: gameScores.flexibility,
          vocabulary: gameScores.vocabulary,
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
        console.error('[useSaveCognitiveScore] Failed to insert game score:', insertError);
        // Continue to update brain score even if game score insert fails
      }

      // Fetch current brain score
      const { data: currentBrainScore } = await supabase
        .from('brain_scores')
        .select('*')
        .eq('user_id', userId)
        .single();

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

        // Update brain score in database
        const { error: updateError } = await supabase
          .from('brain_scores')
          .update({
            processing_speed: updated.domainScores.processingSpeed,
            working_memory: updated.domainScores.workingMemory,
            attention: updated.domainScores.attention,
            flexibility: updated.domainScores.flexibility,
            vocabulary: updated.domainScores.vocabulary,
            overall_score: updated.overallScore,
            tier: updated.tier,
            tier_progress: updated.tierProgress,
            games_analyzed: currentBrainScore.games_analyzed + 1,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[useSaveCognitiveScore] Failed to update brain score:', updateError);
        }

        overallScore = updated.overallScore;
        tier = updated.tier;
        tierProgress = updated.tierProgress;
        scoreDelta = overallScore - currentBrainScore.overall_score;

        // Also add to brain_score_history for trend tracking
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('brain_score_history')
          .insert({
            user_id: userId,
            period_type: 'daily',
            period_start: today,
            overall_score: updated.overallScore,
            processing_speed: updated.domainScores.processingSpeed,
            working_memory: updated.domainScores.workingMemory,
            attention: updated.domainScores.attention,
            flexibility: updated.domainScores.flexibility,
            vocabulary: updated.domainScores.vocabulary,
            games_played: 1,
          });

      } else {
        // Create new brain score
        const domainScores = getDomainScoresRecord(gameScores);
        overallScore = (
          gameScores.processingSpeed +
          gameScores.workingMemory +
          gameScores.attention +
          gameScores.flexibility +
          gameScores.vocabulary
        ) / 5;
        tier = getTierFromScore(overallScore);
        tierProgress = calculateTierProgress(overallScore);
        scoreDelta = overallScore; // First game so all points are new

        const { error: createError } = await supabase
          .from('brain_scores')
          .insert({
            user_id: userId,
            processing_speed: gameScores.processingSpeed,
            working_memory: gameScores.workingMemory,
            attention: gameScores.attention,
            flexibility: gameScores.flexibility,
            vocabulary: gameScores.vocabulary,
            overall_score: overallScore,
            tier,
            tier_progress: tierProgress,
            games_analyzed: 1,
            last_activity_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('[useSaveCognitiveScore] Failed to create brain score:', createError);
        }

        // Also add to history
        const todayDate = new Date().toISOString().split('T')[0];
        await supabase
          .from('brain_score_history')
          .insert({
            user_id: userId,
            period_type: 'daily',
            period_start: todayDate,
            overall_score: overallScore,
            processing_speed: gameScores.processingSpeed,
            working_memory: gameScores.workingMemory,
            attention: gameScores.attention,
            flexibility: gameScores.flexibility,
            vocabulary: gameScores.vocabulary,
            games_played: 1,
          });
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
      console.error('[useSaveCognitiveScore] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save cognitive score');
      setIsSaving(false);
      return null;
    }
  }, [userId]);

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
