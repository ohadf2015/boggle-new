/**
 * useCognitiveScoring - Save cognitive scores for brain training
 *
 * Calculates and saves cognitive scores after game completion
 * for authenticated users in competitive modes.
 */

import { useEffect, useRef, useState } from 'react';
import { useSaveCognitiveScore } from '@/hooks/useSaveCognitiveScore';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData, SinglePlayerMode } from '../../SinglePlayerView';

interface UseCognitiveScoringParams {
  userId: string | undefined;
  mode: SinglePlayerMode;
  results: SinglePlayerResultsData;
}

export interface BrainPointsReward {
  scoreDelta: number;
  newScore: number;
}

interface CognitiveScoringResult {
  brainPointsReward: BrainPointsReward | null;
}

/**
 * Hook to save cognitive scores for brain training
 * Only runs for authenticated users in competitive modes
 */
export function useCognitiveScoring({
  userId,
  mode,
  results,
}: UseCognitiveScoringParams): CognitiveScoringResult {
  const { saveCognitiveScore } = useSaveCognitiveScore();
  const [brainPointsReward, setBrainPointsReward] = useState<BrainPointsReward | null>(null);
  const hasSavedCognitiveScoreRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (hasSavedCognitiveScoreRef.current) return;
    if (!userId) return; // Only for authenticated users
    if (mode === 'practice') return; // Do not save cognitive scores in practice mode

    // Calculate max combo from word data
    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    let maxCombo = 0;
    let currentCombo = 0;
    for (const word of validWords) {
      if (word.comboBonus && word.comboBonus > 0) {
        currentCombo++;
        maxCombo = Math.max(maxCombo, currentCombo);
      } else {
        currentCombo = 0;
      }
    }

    // Save cognitive score
    saveCognitiveScore({
      playerWordData: results.playerWordData || [],
      gameDuration: results.gameDuration || 0,
      gridSize: (results.grid?.length || 5) ** 2, // Total cells: 5x5=25, 7x7=49, etc.
      maxCombo,
      hintsUsed: 0, // Single player mode doesn't have hints
      gameSessionId: results.gameSessionId,
    }).then(cognitiveResult => {
      if (cognitiveResult && mountedRef.current) {
        logger.log('[useCognitiveScoring] Cognitive scores saved:', cognitiveResult);
        setBrainPointsReward({
          scoreDelta: cognitiveResult.scoreDelta,
          newScore: cognitiveResult.overallScore
        });
      }
    }).catch((err: unknown) => {
      logger.error('[useCognitiveScoring] Failed to save cognitive score:', err);
    });

    hasSavedCognitiveScoreRef.current = true;
  }, [userId, results.playerWordData, results.gameDuration, results.grid, results.gameSessionId, saveCognitiveScore, mode]);

  return { brainPointsReward };
}
