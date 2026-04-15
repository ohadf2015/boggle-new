/**
 * useBossRushArcade — standalone arcade boss-rush mode.
 *
 * Fight 5 bosses drawn from a predefined random sequence (see `lib/adventure/bossRush`).
 * Defeat ends the run. Full clear gives bonus rewards.
 *
 * NOT the same as `components/adventure/hooks/useBossRush`, which runs inside
 * the adventure hub and only sequences bosses the player has already beaten.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  createBossRushState,
  advanceBossRush,
  getBossRushReward,
  type BossRushState,
  type BossRushReward,
} from '@/lib/adventure/bossRush';

export interface UseBossRushArcadeReturn {
  /** Current boss rush state */
  state: BossRushState;
  /** Current boss world ID (null if complete) */
  currentBossWorldId: number | null;
  /** Whether the rush is active (started, not complete) */
  isActive: boolean;
  /** Start a new boss rush */
  startRush: () => void;
  /** Report a fight result */
  reportResult: (result: 'victory' | 'defeat') => void;
  /** Get rewards for current progress */
  rewards: BossRushReward;
  /** Reset to allow starting a new rush */
  reset: () => void;
}

export function useBossRushArcade(): UseBossRushArcadeReturn {
  const [state, setState] = useState<BossRushState>(createBossRushState);
  const [isActive, setIsActive] = useState(false);

  const startRush = useCallback(() => {
    setState(createBossRushState());
    setIsActive(true);
  }, []);

  const reportResult = useCallback((result: 'victory' | 'defeat') => {
    setState(prev => {
      const next = advanceBossRush(prev, result);
      if (next.isComplete) setIsActive(false);
      return next;
    });
  }, []);

  const rewards = useMemo(() => getBossRushReward(state.defeatedCount, state.difficulty), [state.defeatedCount, state.difficulty]);

  const currentBossWorldId = useMemo(() => {
    if (state.isComplete || state.currentBossIndex >= state.bossSequence.length) return null;
    return state.bossSequence[state.currentBossIndex];
  }, [state]);

  const reset = useCallback(() => {
    setState(createBossRushState());
    setIsActive(false);
  }, []);

  return { state, currentBossWorldId, isActive, startRush, reportResult, rewards, reset };
}
