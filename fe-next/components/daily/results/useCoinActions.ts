/**
 * Coin Actions Hook
 * Handles coin earning and spending for daily challenge results
 * Uses unified CoinContext for consistent behavior across auth/guest modes
 */

import { useState, useCallback, useEffect } from 'react';
import { useCoinContext } from '@/contexts/CoinContext';
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
  onRetry: () => void | Promise<void>;
}

export function useCoinActions({
  puzzleDate,
  puzzleNumber,
  language,
  isNewCompletion,
  solved,
  efficiencyScore,
  streakDays,
  onRetry,
}: UseCoinActionsProps) {
  const [coinReward, setCoinReward] = useState<CoinReward | null>(null);
  const [targetWordRevealed, setTargetWordRevealed] = useState(false);

  // Use unified CoinContext for all coin operations
  const { coins: currentCoins, spendCoins, canAfford, awardDailyCompletion, costs } = useCoinContext();

  // Award coins for completing the daily challenge
  // Uses unified awardDailyCompletion which handles:
  // - Auth/guest mode detection
  // - Duplicate prevention
  // - Database sync for authenticated users
  useEffect(() => {
    if (!isNewCompletion) return;

    const awardCoins = async () => {
      const reward = await awardDailyCompletion({
        puzzleDate,
        language,
        solved,
        efficiencyScore: efficiencyScore || 0,
        streakDays: streakDays || 0,
      });

      if (reward) {
        setCoinReward({
          awarded: reward.awarded,
          breakdown: reward.breakdown as CoinReward['breakdown'],
        });
      }
    };

    void awardCoins();
  }, [isNewCompletion, puzzleDate, language, solved, efficiencyScore, streakDays, awardDailyCompletion]);

  // Handle reveal target word (costs coins)
  const handleRevealTargetWord = useCallback(async () => {
    const cost = costs.REVEAL_TARGET_WORD;

    const success = await spendCoins(cost, 'Reveal Target Word', {
      puzzleDate,
      language,
    });

    if (success) {
      setTargetWordRevealed(true);
    }
  }, [puzzleDate, language, spendCoins, costs]);

  // Reveal without spending — used by the rewarded-ad paywall-softener flow
  const handleRevealTargetWordViaAd = useCallback(() => {
    setTargetWordRevealed(true);
  }, []);

  // Handle retry challenge (costs coins)
  const handleRetryChallenge = useCallback(async () => {
    const cost = costs.DAILY_RETRY;

    const success = await spendCoins(cost, 'Daily Challenge Retry', {
      puzzleDate,
      language,
      puzzleNumber: String(puzzleNumber),
    });

    if (success) {
      await onRetry();
    }
  }, [puzzleDate, language, puzzleNumber, onRetry, spendCoins, costs]);

  return {
    coinReward,
    targetWordRevealed,
    currentCoins,
    canAffordReveal: canAfford(costs.REVEAL_TARGET_WORD),
    canAffordRetry: canAfford(costs.DAILY_RETRY),
    revealCost: costs.REVEAL_TARGET_WORD,
    retryCost: costs.DAILY_RETRY,
    handleRevealTargetWord,
    handleRevealTargetWordViaAd,
    handleRetryChallenge,
  };
}
