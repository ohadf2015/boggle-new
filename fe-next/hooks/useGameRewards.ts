'use client';

/**
 * useGameRewards — game-specific micro-celebration effects using react-rewards.
 *
 * Attaches confetti/emoji/balloon bursts to a DOM element.
 * Each reward type has tuned presets matching the neo-brutalist palette.
 *
 * react-rewards binds config at hook creation time, so we create one
 * useReward call per game reward type and dispatch at trigger time.
 *
 * @example
 * ```tsx
 * const { rewardId, triggerReward } = useGameRewards();
 * // ...
 * <span id={rewardId}><button onClick={() => triggerReward('wordFound')} /></span>
 * ```
 */

import { useRef, useCallback } from 'react';
import { useReward } from 'react-rewards';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export type GameRewardType = 'wordFound' | 'achievement' | 'streak' | 'levelUp' | 'coinCollect';

export function useGameRewards(rewardId?: string) {
  const { isLowEnd, prefersReducedMotion } = useDevicePerformance();
  const id = rewardId ?? `game-reward-${Math.random().toString(36).slice(2, 8)}`;
  const idRef = useRef(id);

  const { reward: wordFoundReward, isAnimating: a1 } = useReward(idRef.current, 'confetti', {
    lifetime: 120, elementCount: 15, elementSize: 8,
    spread: 60, startVelocity: 20, colors: ['#BFFF00', '#FFE135', '#FFFFFF'],
  });

  const { reward: achievementReward, isAnimating: a2 } = useReward(idRef.current, 'emoji', {
    lifetime: 150, elementCount: 10, elementSize: 24,
    spread: 80, startVelocity: 25, emoji: ['⭐', '🏆', '✨', '💎'],
  });

  const { reward: streakReward, isAnimating: a3 } = useReward(idRef.current, 'confetti', {
    lifetime: 100, elementCount: 20, elementSize: 6,
    spread: 90, startVelocity: 30, colors: ['#FF1493', '#FF69B4', '#BFFF00', '#00FFFF'],
  });

  const { reward: levelUpReward, isAnimating: a4 } = useReward(idRef.current, 'emoji', {
    lifetime: 200, elementCount: 15, elementSize: 28,
    spread: 120, startVelocity: 35, emoji: ['🎉', '🚀', '⬆️', '✨', '🌟'],
  });

  const { reward: coinCollectReward, isAnimating: a5 } = useReward(idRef.current, 'emoji', {
    lifetime: 100, elementCount: 8, elementSize: 20,
    spread: 40, startVelocity: 15, emoji: ['🪙', '💰', '✨'],
  });

  const rewardMap: Record<GameRewardType, () => void> = {
    wordFound: wordFoundReward,
    achievement: achievementReward,
    streak: streakReward,
    levelUp: levelUpReward,
    coinCollect: coinCollectReward,
  };

  const triggerReward = useCallback((type: GameRewardType) => {
    if (isLowEnd || prefersReducedMotion) return;
    // react-rewards looks up the anchor via document.getElementById at
    // dispatch time. If the anchor unmounted (phase change, route swap)
    // the library logs "Element with id … not found" to Sentry. Guard
    // the trigger so missing anchors silently no-op.
    if (typeof document === 'undefined' || !document.getElementById(idRef.current)) return;
    rewardMap[type]();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLowEnd, prefersReducedMotion, wordFoundReward, achievementReward, streakReward, levelUpReward, coinCollectReward]);

  const isAnimating = a1 || a2 || a3 || a4 || a5;

  return {
    rewardId: idRef.current,
    triggerReward,
    isAnimating,
  };
}

export default useGameRewards;
