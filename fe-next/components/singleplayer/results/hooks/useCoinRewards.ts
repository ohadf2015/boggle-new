/**
 * useCoinRewards - Award coins for single player game completion
 *
 * Uses the unified CoinContext to handle coin awarding for both
 * authenticated and guest users with duplicate prevention.
 */

import { useEffect, useRef, useState } from 'react';
import { useCoinContext, type CoinRewardResult } from '@/contexts/CoinContext';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

interface UseCoinRewardsParams {
  results: SinglePlayerResultsData;
  playerRank: number;
  totalParticipants: number;
  /** Current win streak for tier coin bonus */
  currentStreak?: number;
}

interface CoinRewardsResult {
  coinReward: CoinRewardResult | null;
}

/**
 * Hook to award coins for game completion using unified CoinContext
 * Handles both auth and guest modes with duplicate prevention
 */
export function useCoinRewards({
  results,
  playerRank,
  totalParticipants,
  currentStreak,
}: UseCoinRewardsParams): CoinRewardsResult {
  const { awardGameCompletion } = useCoinContext();
  const [coinReward, setCoinReward] = useState<CoinRewardResult | null>(null);
  const hasAwardedCoinsRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (hasAwardedCoinsRef.current) return;
    hasAwardedCoinsRef.current = true;

    // Use the game session ID for deduplication
    const sessionId = results.gameSessionId || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    async function awardCoins(): Promise<void> {
      try {
        const reward = await awardGameCompletion({
          sessionId,
          mode: 'singleplayer',
          score: results.playerScore,
          rank: playerRank,
          totalPlayers: totalParticipants,
          currentStreak,
        });

        if (reward && mountedRef.current) {
          setCoinReward(reward);
        }
      } catch (err) {
        logger.error('[useCoinRewards] Failed to award coins:', err);
      }
    }

    void awardCoins();
  }, [awardGameCompletion, results.playerScore, results.gameSessionId, playerRank, totalParticipants, currentStreak]);

  return { coinReward };
}
