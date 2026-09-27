/**
 * useGameHistory - Add game to history for performance tracking
 *
 * Saves game results to localStorage history for the performance chart
 * and trend tracking. Runs for all users (auth and guest).
 */

import { useEffect, useRef } from 'react';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface UseGameHistoryParams {
  results: SinglePlayerResultsData;
  playerRank: number;
  totalParticipants: number;
  isWinner: boolean;
  totalComboBonus: number;
  totalFireRoundBonus: number;
  playerArchetype: PlayerArchetype | null;
}

/**
 * Hook to add game to history for performance chart tracking
 * Runs once per results view for all users
 */
export function useGameHistory({
  results,
  playerRank,
  totalParticipants,
  isWinner,
  totalComboBonus,
  totalFireRoundBonus,
  playerArchetype,
}: UseGameHistoryParams): void {
  const hasAddedToHistoryRef = useRef(false);

  useEffect(() => {
    if (hasAddedToHistoryRef.current) return;

    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    const totalAttempts = results.playerWordData?.length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
    const longestWordLength = validWords.reduce((max, w) => Math.max(max, w.word.length), 0);
    const avgWordLength = validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length
      : 0;

    try {
      addGameToHistory({
        score: results.playerScore,
        wordCount: validWords.length,
        accuracy,
        rank: playerRank,
        totalPlayers: totalParticipants,
        mode: 'single',
        isWinner,
        longestWordLength,
        duration: results.gameDuration,
        comboBonus: totalComboBonus,
        fireRoundBonus: totalFireRoundBonus,
        archetype: playerArchetype?.id,
        averageWordLength: avgWordLength,
        achievementCount: results.achievements?.length || 0,
      });
    } catch (err) {
      logger.error('[useGameHistory] Failed to add game to history:', err);
    }

    hasAddedToHistoryRef.current = true;
  }, [results, playerRank, totalParticipants, isWinner, totalComboBonus, totalFireRoundBonus, playerArchetype]);
}
