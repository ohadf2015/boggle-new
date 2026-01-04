/**
 * Coin Actions Hook
 * Handles coin spending actions like reveal and retry
 */

import { useState, useCallback, useEffect } from 'react';
import { awardDailyCoins, spendCoins, canAfford, getCoins, COIN_COSTS } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';
import type { Language } from '@/types';
import type { CoinReward } from './types';

interface UseCoinActionsProps {
  puzzleDate: string;
  puzzleNumber: number;
  language: Language;
  isNewCompletion: boolean;
  solved: boolean;
  efficiencyScore: number;
  streakDays: number;
  userId?: string;
  onRetry: () => void;
}

export function useCoinActions({
  puzzleDate,
  puzzleNumber,
  language,
  isNewCompletion,
  solved,
  efficiencyScore,
  streakDays,
  userId,
  onRetry,
}: UseCoinActionsProps) {
  const [coinReward, setCoinReward] = useState<CoinReward | null>(null);
  const [targetWordRevealed, setTargetWordRevealed] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(() => getCoins());

  // Award coins for completing the daily challenge
  useEffect(() => {
    if (isNewCompletion) {
      const reward = awardDailyCoins(
        puzzleDate,
        language,
        solved,
        efficiencyScore || 0,
        streakDays || 0
      );
      if (reward) {
        setCoinReward(reward);

        // Sync coins to database for authenticated users
        if (userId && reward.awarded > 0) {
          syncCoinsToDatabase(userId, reward.awarded, 'Daily Challenge', {
            puzzleDate,
            language,
            solved: solved ? 1 : 0,
            efficiencyScore: efficiencyScore || 0,
            streakDays: streakDays || 0,
          });
        }
      }
    }
  }, [isNewCompletion, puzzleDate, language, solved, efficiencyScore, streakDays, userId]);

  // Handle reveal target word (costs coins)
  const handleRevealTargetWord = useCallback(() => {
    const cost = COIN_COSTS.REVEAL_TARGET_WORD;
    if (!canAfford(cost)) {
      return; // Not enough coins
    }

    const spent = spendCoins(cost, 'Reveal Target Word', {
      puzzleDate,
      language,
    });

    if (spent) {
      setTargetWordRevealed(true);
      setCurrentCoins(getCoins());
    }
  }, [puzzleDate, language]);

  // Handle retry challenge (costs coins)
  const handleRetryChallenge = useCallback(() => {
    const cost = COIN_COSTS.DAILY_RETRY;
    if (!canAfford(cost)) {
      return; // Not enough coins
    }

    const spent = spendCoins(cost, 'Daily Challenge Retry', {
      puzzleDate,
      language,
      puzzleNumber: String(puzzleNumber),
    });

    if (spent) {
      setCurrentCoins(getCoins());
      onRetry();
    }
  }, [puzzleDate, language, puzzleNumber, onRetry]);

  return {
    coinReward,
    targetWordRevealed,
    currentCoins,
    canAffordReveal: canAfford(COIN_COSTS.REVEAL_TARGET_WORD),
    canAffordRetry: canAfford(COIN_COSTS.DAILY_RETRY),
    revealCost: COIN_COSTS.REVEAL_TARGET_WORD,
    retryCost: COIN_COSTS.DAILY_RETRY,
    handleRevealTargetWord,
    handleRetryChallenge,
  };
}
