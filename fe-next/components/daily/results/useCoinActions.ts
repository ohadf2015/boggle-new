/**
 * Coin Actions Hook
 * Handles coin spending actions like reveal and retry
 */

import { useState, useCallback, useEffect } from 'react';
import { calculateDailyReward, COIN_COSTS } from '@/utils/coinManager';
import { useCoins } from '@/hooks/useCoins';
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

  // Use unified unified coin hook
  const { coins: currentCoins, addCoins, spendCoins, canAfford, refreshCoins } = useCoins();

  // Award coins for completing the daily challenge
  useEffect(() => {
    if (isNewCompletion) {
      // Check if already awarded locally first to avoid unnecessary processing
      const awardKey = `lexiclash_daily_coin_award_${puzzleDate}_${language}`;
      if (typeof window !== 'undefined' && localStorage.getItem(awardKey)) {
        return;
      }

      // Set flag immediately (synchronously) to prevent race condition
      // if effect runs again before async operation completes
      if (typeof window !== 'undefined') {
        localStorage.setItem(awardKey, 'pending');
      }

      // Calculate reward
      const reward = calculateDailyReward(solved, efficiencyScore || 0, streakDays || 0);

      const awardCoinsAsync = async () => {
        try {
          const beforeBalance = await refreshCoins();

          // Use hook to add coins (handles both auth and guest modes)
          await addCoins(reward.total, 'Daily Challenge', {
            puzzleDate,
            language,
            solved: solved ? 'yes' : 'no',
            efficiencyScore: efficiencyScore || 0,
            streakDays: streakDays || 0,
          });

          const afterBalance = await refreshCoins();
          if (afterBalance <= beforeBalance) {
            throw new Error('Coin award did not apply');
          }

          // Set reward state for UI display
          setCoinReward({
            awarded: reward.total,
            breakdown: reward.breakdown
          });

          // Mark as awarded locally to prevent double-awarding on re-renders
          if (typeof window !== 'undefined') {
            localStorage.setItem(awardKey, new Date().toISOString());
          }
        } catch (error) {
          console.error('[useCoinActions] Failed to award coins:', error);
          // Remove pending flag on error so user can retry
          if (typeof window !== 'undefined') {
            localStorage.removeItem(awardKey);
          }
        }
      };

      void awardCoinsAsync();
    }
  }, [isNewCompletion, puzzleDate, language, solved, efficiencyScore, streakDays, addCoins]);

  // Handle reveal target word (costs coins)
  const handleRevealTargetWord = useCallback(async () => {
    const cost = COIN_COSTS.REVEAL_TARGET_WORD;

    const success = await spendCoins(cost, 'Reveal Target Word', {
      puzzleDate,
      language,
    });

    if (success) {
      setTargetWordRevealed(true);
    }
  }, [puzzleDate, language, spendCoins]);

  // Handle retry challenge (costs coins)
  const handleRetryChallenge = useCallback(async () => {
    const cost = COIN_COSTS.DAILY_RETRY;

    const success = await spendCoins(cost, 'Daily Challenge Retry', {
      puzzleDate,
      language,
      puzzleNumber: String(puzzleNumber),
    });

    if (success) {
      onRetry();
    }
  }, [puzzleDate, language, puzzleNumber, onRetry, spendCoins]);

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
