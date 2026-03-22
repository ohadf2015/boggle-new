'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  SEASON_1,
  getTierForXP,
  getDaysRemaining,
  type BattlePassTier,
} from '@/lib/battlepass/battlePassConfig';

interface BattlePassState {
  currentXP: number;
  isPremium: boolean;
  claimedTiers: number[];
}

const STORAGE_KEY = `lexiclash_battle_pass_${SEASON_1.id}`;

function loadState(): BattlePassState {
  if (typeof window === 'undefined') {
    return { currentXP: 0, isPremium: false, claimedTiers: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // noop
  }
  return { currentXP: 0, isPremium: false, claimedTiers: [] };
}

function saveState(state: BattlePassState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

export function useBattlePass() {
  const [state, setState] = useState<BattlePassState>(loadState);

  const currentTier = useMemo(() => getTierForXP(state.currentXP), [state.currentXP]);

  const xpToNextTier = useMemo(() => {
    if (currentTier >= SEASON_1.totalTiers) return 0;
    const nextTierData = SEASON_1.tiers[currentTier]; // 0-indexed = next tier
    return nextTierData ? nextTierData.xpRequired - state.currentXP : 0;
  }, [currentTier, state.currentXP]);

  const progress = useMemo(() => {
    if (currentTier >= SEASON_1.totalTiers) return 1;
    if (currentTier === 0) {
      const firstTierXP = SEASON_1.tiers[0].xpRequired;
      return Math.min(1, state.currentXP / firstTierXP);
    }
    const prevXP = SEASON_1.tiers[currentTier - 1].xpRequired;
    const nextXP = SEASON_1.tiers[currentTier]?.xpRequired ?? prevXP;
    const range = nextXP - prevXP;
    if (range <= 0) return 1;
    return Math.min(1, (state.currentXP - prevXP) / range);
  }, [currentTier, state.currentXP]);

  const update = useCallback((updater: (prev: BattlePassState) => BattlePassState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addXP = useCallback(
    (amount: number) => {
      update((prev) => ({ ...prev, currentXP: prev.currentXP + amount }));
    },
    [update]
  );

  const claimReward = useCallback(
    (tierNumber: number) => {
      update((prev) => {
        if (prev.claimedTiers.includes(tierNumber)) return prev;
        const tierData = SEASON_1.tiers.find((t) => t.tier === tierNumber);
        if (!tierData) return prev;
        const requiredTier = getTierForXP(prev.currentXP);
        if (requiredTier < tierNumber) return prev;
        return {
          ...prev,
          claimedTiers: [...prev.claimedTiers, tierNumber],
        };
      });
    },
    [update]
  );

  const upgradeToPremium = useCallback(() => {
    update((prev) => ({ ...prev, isPremium: true }));
  }, [update]);

  return {
    currentTier,
    currentXP: state.currentXP,
    xpToNextTier,
    progress,
    isPremium: state.isPremium,
    claimedTiers: state.claimedTiers,
    tiers: SEASON_1.tiers as readonly BattlePassTier[],
    addXP,
    claimReward,
    upgradeToPremium,
    season: SEASON_1,
    daysRemaining: getDaysRemaining(),
  };
}
