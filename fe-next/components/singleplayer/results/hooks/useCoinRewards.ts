/**
 * useCoinRewards - Award coins for single player game completion
 *
 * Uses the unified CoinContext to handle coin awarding for both
 * authenticated and guest users with duplicate prevention.
 */

import { useEffect, useRef, useState } from 'react';
import { useCoinContext, type CoinRewardResult } from '@/contexts/CoinContext';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

interface UseCoinRewardsParams {
  results: SinglePlayerResultsData;
  playerRank: number;
  totalParticipants: number;
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
}: UseCoinRewardsParams): CoinRewardsResult {
  const { awardGameCompletion } = useCoinContext();
  const [coinReward, setCoinReward] = useState<CoinRewardResult | null>(null);
  const hasAwardedCoinsRef = useRef(false);

  useEffect(() => {
    if (hasAwardedCoinsRef.current) return;
    hasAwardedCoinsRef.current = true;

    // Use the game session ID for deduplication
    const sessionId = results.gameSessionId || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    async function awardCoins(): Promise<void> {
      const reward = await awardGameCompletion({
        sessionId,
        mode: 'singleplayer',
        score: results.playerScore,
        rank: playerRank,
        totalPlayers: totalParticipants,
      });

      if (reward) {
        setCoinReward(reward);
      }
    }

    void awardCoins();
  }, [awardGameCompletion, results.playerScore, results.gameSessionId, playerRank, totalParticipants]);

  return { coinReward };
}
