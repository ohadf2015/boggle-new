/**
 * useGuestStatsSync - Sync guest stats after single player game completion
 *
 * Updates local guest stats (localStorage) for unauthenticated users
 * including score, words, achievements, and archetype data.
 */

import { useEffect, useRef } from 'react';
import { updateGuestStatsAfterGame } from '@/utils/guestManager';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface UseGuestStatsSyncParams {
  isAuthenticated: boolean;
  results: SinglePlayerResultsData;
  isWinner: boolean;
  totalComboBonus: number;
  totalFireRoundBonus: number;
  playerArchetype: PlayerArchetype | null;
}

/**
 * Hook to sync guest stats after game completion
 * Only runs for unauthenticated users, once per results view
 */
export function useGuestStatsSync({
  isAuthenticated,
  results,
  isWinner,
  totalComboBonus,
  totalFireRoundBonus,
  playerArchetype,
}: UseGuestStatsSyncParams): { hasUpdatedStats: boolean } {
  const hasUpdatedStatsRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated || hasUpdatedStatsRef.current) return;

    // Get the longest valid word from player's words
    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    const longestWord = validWords.reduce<string | undefined>(
      (longest, w) => (w.word.length > (longest?.length || 0) ? w.word : longest),
      undefined
    );

    // Calculate average word length
    const avgWordLength = validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length
      : 0;

    // Update guest stats with all tracked data
    try {
      updateGuestStatsAfterGame({
        score: results.playerScore,
        wordCount: validWords.length,
        longestWord,
        isWinner,
        achievements: results.achievements?.map(a => a.key) || [],
        comboBonus: totalComboBonus,
        fireRoundBonus: totalFireRoundBonus,
        archetype: playerArchetype?.id,
        averageWordLength: avgWordLength,
      });
    } catch (err) {
      logger.error('[useGuestStatsSync] Failed to update guest stats:', err);
    }

    hasUpdatedStatsRef.current = true;
  }, [isAuthenticated, results, isWinner, totalComboBonus, totalFireRoundBonus, playerArchetype]);

  return { hasUpdatedStats: hasUpdatedStatsRef.current };
}
