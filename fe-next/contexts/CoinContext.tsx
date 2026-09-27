'use client';

/**
 * CoinContext - Unified Coin Management
 *
 * Provides a single source of truth for all coin operations across the app.
 * Handles:
 * - Auth/Guest mode detection transparently
 * - Real-time coin balance updates via events
 * - All coin earning operations (daily, game, combo, ad)
 * - All coin spending operations (reveals, retries)
 * - Duplicate award prevention via session tracking
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCoins,
  addCoins as addLocalCoins,
  spendCoins as spendLocalCoins,
  calculateDailyReward,
  calculateGameReward,
  calculateComboMilestoneReward,
  isComboMilestone,
  COIN_COSTS,
  COIN_REWARDS,
} from '@/utils/coinManager';
import { syncCoinsToDatabase, spendCoinsFromDatabase, getProfile } from '@/lib/supabase';
import { emitCoinEarned, emitCoinSpent } from '@/utils/coinEarnedFx';
import toast from 'react-hot-toast';
import { loadSentry } from '@/utils/sentryLazy';

// Coin effect toasts — neo-brutalist styled visual feedback for earn/spend
// The old "+X gold" earn toast was retired in favour of the casino-style
// CoinRewardHud (flying coins + rolling counter + arpeggio), driven by the
// `lexiclash:coin-earned` event. Spending fires `lexiclash:coin-spent`, which
// GlobalCoinEarnFx plays as the reverse: coins drain out of the counter, the
// total rolls down, and the HUD shows a red "-amount". No toast either way.

// Types
export interface CoinRewardBreakdown {
  base: number;
  efficiency?: number;
  streak?: number;
  scoreBonus?: number;
  placement?: number;
  /** Bonus from streak tier (e.g. +5% at 3-day, +25% at 30-day) */
  streakBonus?: number;
}

export interface CoinRewardResult {
  awarded: number;
  breakdown: CoinRewardBreakdown;
  newBalance: number;
}

interface CoinContextValue {
  // Current balance
  coins: number;
  isLoading: boolean;

  // Affordability checks
  canAfford: (amount: number) => boolean;

  // Core operations
  addCoins: (amount: number, reason: string, metadata?: Record<string, string | number>) => Promise<number>;
  spendCoins: (amount: number, reason: string, metadata?: Record<string, string | number>) => Promise<boolean>;
  refreshCoins: () => Promise<number>;

  // Unified award operations (handle duplicate prevention + sync)
  awardDailyCompletion: (params: {
    puzzleDate: string;
    language: string;
    solved: boolean;
    efficiencyScore: number;
    streakDays: number;
  }) => Promise<CoinRewardResult | null>;

  awardGameCompletion: (params: {
    sessionId: string;
    mode: 'singleplayer' | 'multiplayer';
    score: number;
    rank?: number;
    totalPlayers?: number;
    gameCode?: string;
    currentStreak?: number;
  }) => Promise<CoinRewardResult | null>;

  awardComboMilestone: (params: {
    comboLevel: number;
    gameMode: string;
    sessionId?: string;
  }) => Promise<number>;

  awardWatchedAd: (platform: string) => Promise<CoinRewardResult | null>;

  // Constants for UI
  costs: typeof COIN_COSTS;
  rewards: typeof COIN_REWARDS;
}

const CoinContext = createContext<CoinContextValue | null>(null);

/** Actions-only context — consumers that never read `coins` or `isLoading` won't re-render on balance changes. */
interface CoinActionsValue {
  addCoins: CoinContextValue['addCoins'];
  spendCoins: CoinContextValue['spendCoins'];
  refreshCoins: CoinContextValue['refreshCoins'];
  canAfford: CoinContextValue['canAfford'];
  awardDailyCompletion: CoinContextValue['awardDailyCompletion'];
  awardGameCompletion: CoinContextValue['awardGameCompletion'];
  awardComboMilestone: CoinContextValue['awardComboMilestone'];
  awardWatchedAd: CoinContextValue['awardWatchedAd'];
  costs: typeof COIN_COSTS;
  rewards: typeof COIN_REWARDS;
}
const CoinActionsContext = createContext<CoinActionsValue | null>(null);

// Helper to check if award already given
function isAlreadyAwarded(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(key);
}

// Helper to mark award as given
function markAsAwarded(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, new Date().toISOString());
}

export function CoinProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAuthenticated, refreshProfile } = useAuth();

  // Local state for guests
  const [localCoins, setLocalCoins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Track in-flight operations to prevent duplicates
  const pendingOperationsRef = useRef<Set<string>>(new Set());

  // Initialize local coins on mount (for guests)
  useEffect(() => {
    if (!isAuthenticated) {
      setLocalCoins(getCoins());
    }
    setIsLoading(false);
  }, [isAuthenticated]);

  // Sync local coins when profile changes (for auth users who just logged in)
  useEffect(() => {
    if (isAuthenticated && profile) {
      setIsLoading(false);
    }
  }, [isAuthenticated, profile]);

  // Determine effective coin balance
  const coins = user
    ? (profile?.total_coins ?? 0)
    : localCoins;

  // Ref keeps latest coins so canAfford identity stays stable
  const coinsRef = useRef(coins);
  coinsRef.current = coins;

  /**
   * Refresh coin balance from source of truth
   */
  const refreshCoins = useCallback(async (): Promise<number> => {
    if (isAuthenticated && user?.id) {
      await refreshProfile();
      const { data: freshProfile } = await getProfile(user.id);
      return freshProfile?.total_coins ?? 0;
    } else {
      const newBalance = getCoins();
      setLocalCoins(newBalance);
      return newBalance;
    }
  }, [isAuthenticated, user, refreshProfile]);

  /**
   * Check if user can afford an amount (ref-based for stable identity)
   */
  const canAfford = useCallback((amount: number) => {
    return coinsRef.current >= amount;
  }, []);

  /**
   * Core: Add coins to balance
   */
  const addCoins = useCallback(async (
    amount: number,
    reason: string,
    metadata?: Record<string, string | number>
  ): Promise<number> => {
    if (amount <= 0) return coins;

    // Fire global coin-earned event so GlobalCoinEarnFx can play sound + fly coins
    const fireCoinEarnedFx = () => emitCoinEarned(amount);

    if (isAuthenticated && user) {
      const result = await syncCoinsToDatabase(user.id, amount, reason, metadata);

      if (result.success) {
        await refreshProfile();
        const { data: freshProfile } = await getProfile(user.id);
        fireCoinEarnedFx();
        return freshProfile?.total_coins ?? result.newBalance ?? (coins + amount);
      } else {
        // Rate-limits are expected under burst play — don't surface as Sentry errors.
        if (result.error === 'TOO_MANY_REQUESTS') {
          console.debug('[CoinContext] Coin sync rate-limited; balance will reconcile on next sync');
        } else {
          console.error('[CoinContext] Failed to add coins:', result.error);
        }
        toast.error('Failed to update coin balance');
        return coins;
      }
    } else {
      const newTotal = addLocalCoins(amount, reason, metadata);
      setLocalCoins(newTotal);
      fireCoinEarnedFx();
      return newTotal;
    }
  }, [isAuthenticated, user, coins, refreshProfile]);

  /**
   * Core: Spend coins from balance
   */
  const spendCoins = useCallback(async (
    amount: number,
    reason: string,
    metadata?: Record<string, string | number>
  ): Promise<boolean> => {
    if (!canAfford(amount)) return false;

    if (isAuthenticated && user) {
      const result = await spendCoinsFromDatabase(user.id, amount, reason, metadata);

      if (result.success) {
        await refreshProfile();
        emitCoinSpent(amount);
        return true;
      } else {
        console.error('[CoinContext] Failed to spend coins:', result.error);
        toast.error('Failed to process transaction');
        return false;
      }
    } else {
      const success = spendLocalCoins(amount, reason, metadata);
      if (success) {
        setLocalCoins(getCoins());
        emitCoinSpent(amount);
      }
      return success;
    }
  }, [isAuthenticated, user, canAfford, refreshProfile]);

  /**
   * Award coins for Daily Challenge completion
   * Handles duplicate prevention and auth/guest sync
   *
   * IMPORTANT: Guests do NOT receive actual coins - they only see a "teasing"
   * message showing what they would earn if signed in. This returns the
   * calculated reward for display purposes, but does not award coins.
   */
  const awardDailyCompletion = useCallback(async (params: {
    puzzleDate: string;
    language: string;
    solved: boolean;
    efficiencyScore: number;
    streakDays: number;
  }): Promise<CoinRewardResult | null> => {
    const { puzzleDate, language, solved, efficiencyScore, streakDays } = params;
    const awardKey = `lexiclash_daily_coin_award_${puzzleDate}_${language}`;

    // Calculate reward first (needed for both auth and guest modes)
    const reward = calculateDailyReward(solved, efficiencyScore, streakDays);

    // Don't show anything if reward is 0
    if (reward.total <= 0) {
      return null;
    }

    // For guests: return the potential reward WITHOUT actually awarding coins
    // This enables the "teasing" UI showing what they could earn
    if (!isAuthenticated || !user) {
      return {
        awarded: reward.total,
        breakdown: reward.breakdown,
        newBalance: 0, // Guests don't have a real balance
      };
    }

    // For authenticated users: proceed with actual coin award
    // Check if already awarded
    if (isAlreadyAwarded(awardKey)) {
      return null;
    }

    // Prevent concurrent duplicate awards
    if (pendingOperationsRef.current.has(awardKey)) {
      return null;
    }
    pendingOperationsRef.current.add(awardKey);

    try {
      // Award coins using unified method
      const newBalance = await addCoins(reward.total, 'Daily Challenge', {
        puzzleDate,
        language,
        solved: solved ? 'yes' : 'no',
        efficiencyScore,
        streakDays,
      });

      // Mark as awarded
      markAsAwarded(awardKey);

      return {
        awarded: reward.total,
        breakdown: reward.breakdown,
        newBalance,
      };
    } catch (error) {
      console.error('[CoinContext] Failed to award daily coins:', error);
      return null;
    } finally {
      pendingOperationsRef.current.delete(awardKey);
    }
  }, [isAuthenticated, user, addCoins]);

  /**
   * Award coins for game completion (singleplayer/multiplayer)
   * Handles duplicate prevention and auth/guest sync
   *
   * IMPORTANT: Guests do NOT receive actual coins - they only see a "teasing"
   * message showing what they would earn if signed in. This returns the
   * calculated reward for display purposes, but does not award coins.
   */
  const awardGameCompletion = useCallback(async (params: {
    sessionId: string;
    mode: 'singleplayer' | 'multiplayer';
    score: number;
    rank?: number;
    totalPlayers?: number;
    gameCode?: string;
    currentStreak?: number;
  }): Promise<CoinRewardResult | null> => {
    const { sessionId, mode, score, rank, totalPlayers, gameCode, currentStreak } = params;
    const awardKey = `lexiclash_game_coin_award_${sessionId}`;

    // Calculate reward first (needed for both auth and guest modes)
    const reward = calculateGameReward(score, mode, rank, totalPlayers, currentStreak);

    // Don't show anything if reward is 0
    if (reward.total <= 0) {
      return null;
    }

    // For guests: return the potential reward WITHOUT actually awarding coins
    // This enables the "teasing" UI showing what they could earn
    if (!isAuthenticated || !user) {
      return {
        awarded: reward.total,
        breakdown: reward.breakdown,
        newBalance: 0, // Guests don't have a real balance
      };
    }

    // For authenticated users: proceed with actual coin award
    // Check if already awarded
    if (isAlreadyAwarded(awardKey)) {
      return null;
    }

    // Prevent concurrent duplicate awards
    if (pendingOperationsRef.current.has(awardKey)) {
      return null;
    }
    pendingOperationsRef.current.add(awardKey);

    try {
      // Award coins using unified method
      const reason = mode === 'multiplayer' ? 'Multiplayer Game' : 'Single Player Game';
      const newBalance = await addCoins(reward.total, reason, {
        sessionId,
        ...(gameCode && { gameCode }),
        score,
        rank: rank ?? 0,
        totalPlayers: totalPlayers ?? 1,
      });

      // Mark as awarded
      markAsAwarded(awardKey);

      return {
        awarded: reward.total,
        breakdown: reward.breakdown,
        newBalance,
      };
    } catch (error) {
      console.error('[CoinContext] Failed to award game coins:', error);
      return null;
    } finally {
      pendingOperationsRef.current.delete(awardKey);
    }
  }, [isAuthenticated, user, addCoins]);

  /**
   * Award coins for reaching a combo milestone
   * Handles auth/guest sync (unlike the old awardComboCoins which only did localStorage)
   */
  const awardComboMilestone = useCallback(async (params: {
    comboLevel: number;
    gameMode: string;
    sessionId?: string;
  }): Promise<number> => {
    const { comboLevel, gameMode, sessionId } = params;

    if (!isComboMilestone(comboLevel)) {
      return 0;
    }

    const reward = calculateComboMilestoneReward(comboLevel);
    if (reward <= 0) return 0;

    // Optional: prevent duplicate combo awards within same session
    if (sessionId) {
      const awardKey = `lexiclash_combo_${sessionId}_${comboLevel}`;
      if (isAlreadyAwarded(awardKey)) {
        return 0;
      }
      markAsAwarded(awardKey);
    }

    // Award coins using unified method (syncs to DB for auth users)
    await addCoins(reward, 'Combo Milestone', {
      comboLevel,
      gameMode,
    });

    return reward;
  }, [addCoins]);

  /**
   * Award coins for watching a rewarded ad.
   *
   * Bypasses the generic addCoins() wrapper so we get a typed success/failure
   * signal — addCoins() swallows errors (returns current balance on failure)
   * which makes it impossible to detect server-side daily-cap rejections.
   * Uses syncCoinsToDatabase directly for auth users (routes to award_ad_coins
   * RPC with server-enforced 10-watch/day limit) and addLocalCoins for guests.
   */
  const awardWatchedAd = useCallback(async (platform: string): Promise<CoinRewardResult | null> => {
    const amount = COIN_REWARDS.WATCH_AD;
    const metadata = { platform, timestamp: new Date().toISOString() };

    if (isAuthenticated && user) {
      const result = await syncCoinsToDatabase(user.id, amount, 'Watched Ad', metadata);
      if (!result.success) {
        console.error('[CoinContext] Failed to award ad coins:', result.error);
        toast.error(result.error === 'Daily ad limit reached'
          ? 'Daily ad limit reached'
          : 'Failed to grant ad reward');
        return null;
      }
      await refreshProfile();
      const { data: freshProfile } = await getProfile(user.id);
      const newBalance = freshProfile?.total_coins ?? result.newBalance ?? (coins + amount);
      emitCoinEarned(amount);
      return { awarded: amount, breakdown: { base: amount }, newBalance };
    } else {
      const newBalance = addLocalCoins(amount, 'Watched Ad', metadata);
      setLocalCoins(newBalance);
      emitCoinEarned(amount);
      return { awarded: amount, breakdown: { base: amount }, newBalance };
    }
  }, [isAuthenticated, user, coins, refreshProfile, setLocalCoins]);

  // Memoize context value to prevent unnecessary re-renders in consumers
  const value = useMemo<CoinContextValue>(() => ({
    coins,
    isLoading,
    canAfford,
    addCoins,
    spendCoins,
    refreshCoins,
    awardDailyCompletion,
    awardGameCompletion,
    awardComboMilestone,
    awardWatchedAd,
    costs: COIN_COSTS,
    rewards: COIN_REWARDS,
  }), [
    coins,
    isLoading,
    canAfford,
    addCoins,
    spendCoins,
    refreshCoins,
    awardDailyCompletion,
    awardGameCompletion,
    awardComboMilestone,
    awardWatchedAd,
  ]);

  // Actions-only value — stable across balance changes (no coins/isLoading deps)
  const actionsValue = useMemo<CoinActionsValue>(() => ({
    addCoins,
    spendCoins,
    refreshCoins,
    canAfford,
    awardDailyCompletion,
    awardGameCompletion,
    awardComboMilestone,
    awardWatchedAd,
    costs: COIN_COSTS,
    rewards: COIN_REWARDS,
  }), [addCoins, spendCoins, refreshCoins, canAfford, awardDailyCompletion, awardGameCompletion, awardComboMilestone, awardWatchedAd]);

  return (
    <CoinContext.Provider value={value}>
      <CoinActionsContext.Provider value={actionsValue}>
        {children}
      </CoinActionsContext.Provider>
    </CoinContext.Provider>
  );
}

/**
 * Hook to access coin context
 * Must be used within a CoinProvider
 */
export function useCoinContext(): CoinContextValue {
  const context = useContext(CoinContext);
  if (!context) {
    void loadSentry().then((Sentry) =>
      Sentry.captureMessage('useCoinContext used outside CoinProvider — returning defaults', 'warning')
    );
    return {
      coins: 0,
      isLoading: false,
      canAfford: () => false,
      addCoins: async () => 0,
      spendCoins: async () => false,
      refreshCoins: async () => 0,
      awardDailyCompletion: async () => null,
      awardGameCompletion: async () => null,
      awardComboMilestone: async () => 0,
      awardWatchedAd: async () => null,
      costs: COIN_COSTS,
      rewards: COIN_REWARDS,
    };
  }
  return context;
}

/**
 * Hook to access coin actions without re-rendering on balance changes.
 * Use this in components that only call actions (spend, award, etc.)
 * but don't display the coin balance.
 */
export function useCoinActions(): CoinActionsValue {
  const context = useContext(CoinActionsContext);
  if (!context) {
    void loadSentry().then((Sentry) =>
      Sentry.captureMessage('useCoinActions used outside CoinProvider — returning defaults', 'warning')
    );
    return {
      addCoins: async () => 0,
      spendCoins: async () => false,
      refreshCoins: async () => 0,
      canAfford: () => false,
      awardDailyCompletion: async () => null,
      awardGameCompletion: async () => null,
      awardComboMilestone: async () => 0,
      awardWatchedAd: async () => null,
      costs: COIN_COSTS,
      rewards: COIN_REWARDS,
    };
  }
  return context;
}

/**
 * Legacy-compatible hook that wraps the context
 * Can be used anywhere the old useCoins was used
 */
export function useCoinsFromContext() {
  const context = useContext(CoinContext);

  // Fallback for components outside provider (shouldn't happen, but safe)
  if (!context) {
    console.warn('[useCoinsFromContext] Used outside CoinProvider, returning defaults');
    return {
      coins: 0,
      canAfford: () => false,
      addCoins: async () => 0,
      spendCoins: async () => false,
      refreshCoins: async () => 0,
    };
  }

  return {
    coins: context.coins,
    canAfford: context.canAfford,
    addCoins: context.addCoins,
    spendCoins: context.spendCoins,
    refreshCoins: context.refreshCoins,
  };
}
