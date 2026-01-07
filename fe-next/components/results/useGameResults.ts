/**
 * useGameResults - Consolidated hook for game results side effects
 *
 * Handles:
 * - Game history tracking (for performance chart)
 * - Guest stats updates (for unauthenticated users)
 * - Coin rewards (for both single/multiplayer)
 * - Achievement saving (for authenticated users)
 *
 * Consolidates duplicated logic from:
 * - SinglePlayerResults.tsx
 * - ResultsPage.tsx (multiplayer)
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoins } from '@/hooks/useCoins';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import { updateGuestStatsAfterGame } from '@/utils/guestManager';
import { calculateGameReward } from '@/utils/coinManager';

/** Result type from awardGameCoins */
export interface CoinRewardResult {
  awarded: number;
  breakdown: {
    base: number;
    scoreBonus: number;
    placement: number;
  };
}
import type { WordObject } from './types';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

export interface GameResultsConfig {
  /** Game mode: 'singleplayer' or 'multiplayer' */
  mode: 'singleplayer' | 'multiplayer';
  /** All words submitted by the player */
  playerWords: WordObject[] | undefined;
  /** Player's final score */
  score: number;
  /** Player's rank (1-based) */
  rank: number;
  /** Total number of participants */
  totalPlayers: number;
  /** Whether player won */
  isWinner: boolean;
  /** Game duration in seconds (optional, used for single player) */
  gameDuration?: number;
  /** Total combo bonus earned */
  comboBonus?: number;
  /** Total fire round bonus earned */
  fireRoundBonus?: number;
  /** Player archetype for this game */
  archetype?: PlayerArchetype | null;
  /** Achievement keys earned */
  achievements?: string[];
  /** Unique session ID for the game */
  sessionId: string;
  /** Game code (for multiplayer) */
  gameCode?: string;
}

export interface GameResultsData {
  /** Calculated valid word count */
  validWordCount: number;
  /** Calculated accuracy percentage */
  accuracy: number;
  /** Longest word length */
  longestWordLength: number;
  /** Average word length */
  averageWordLength: number;
  /** Longest valid word */
  longestWord: string | undefined;
  /** Coin reward data (if awarded) */
  coinReward: CoinRewardResult | null;
}

/**
 * Hook to handle all game results side effects
 *
 * @example
 * ```tsx
 * const { coinReward, validWordCount, accuracy } = useGameResults({
 *   mode: 'singleplayer',
 *   playerWords: results.playerWordData,
 *   score: results.playerScore,
 *   rank: playerRank,
 *   totalPlayers: allParticipants.length,
 *   isWinner: isWinner,
 *   gameDuration: results.gameDuration,
 *   comboBonus: totalComboBonus,
 *   fireRoundBonus: totalFireRoundBonus,
 *   archetype: playerArchetype,
 *   achievements: results.achievements?.map(a => a.key),
 *   sessionId: results.gameSessionId || `sp_${Date.now()}`,
 * });
 * ```
 */
export function useGameResults(config: GameResultsConfig): GameResultsData {
  const { user, isAuthenticated, profile, updateProfile } = useAuth();
  const { addCoins, refreshCoins } = useCoins();

  // Refs to prevent duplicate side effects
  const hasUpdatedStatsRef = useRef(false);
  const hasAddedToHistoryRef = useRef(false);
  const hasAwardedCoinsRef = useRef(false);
  const hasSavedAchievementsRef = useRef(false);

  // Coin reward state
  const [coinReward, setCoinReward] = useState<CoinRewardResult | null>(null);

  // Calculate derived data from words
  const validWords = config.playerWords?.filter(w => w.validated && w.score > 0) || [];
  const validWordCount = validWords.length;
  const totalAttempts = config.playerWords?.length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((validWordCount / totalAttempts) * 100) : 0;
  const longestWordLength = validWords.reduce((max, w) => Math.max(max, w.word.length), 0);
  const averageWordLength = validWordCount > 0
    ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWordCount
    : 0;
  const longestWord = validWords.reduce<string | undefined>(
    (longest, w) => (w.word.length > (longest?.length || 0) ? w.word : longest),
    undefined
  );

  // Effect: Update guest stats (for unauthenticated users only)
  useEffect(() => {
    if (isAuthenticated || hasUpdatedStatsRef.current) return;
    if (!config.playerWords || config.playerWords.length === 0) return;

    updateGuestStatsAfterGame({
      score: config.score,
      wordCount: validWordCount,
      longestWord,
      isWinner: config.isWinner,
      achievements: config.achievements || [],
      comboBonus: config.comboBonus,
      fireRoundBonus: config.fireRoundBonus,
      archetype: config.archetype?.id,
      averageWordLength,
    });

    hasUpdatedStatsRef.current = true;
  }, [
    isAuthenticated,
    config.playerWords,
    config.score,
    validWordCount,
    longestWord,
    config.isWinner,
    config.achievements,
    config.comboBonus,
    config.fireRoundBonus,
    config.archetype,
    averageWordLength,
  ]);

  // Effect: Add game to history (for performance chart)
  useEffect(() => {
    if (hasAddedToHistoryRef.current) return;
    if (!config.playerWords || config.playerWords.length === 0) return;

    addGameToHistory({
      score: config.score,
      wordCount: validWordCount,
      accuracy,
      rank: config.rank,
      totalPlayers: config.totalPlayers,
      mode: config.mode === 'singleplayer' ? 'single' : 'multiplayer',
      isWinner: config.isWinner,
      longestWordLength,
      // Additional tracking data (for single player)
      duration: config.gameDuration,
      comboBonus: config.comboBonus,
      fireRoundBonus: config.fireRoundBonus,
      archetype: config.archetype?.id,
      averageWordLength,
      achievementCount: config.achievements?.length || 0,
    });

    hasAddedToHistoryRef.current = true;
  }, [
    config.playerWords,
    config.score,
    validWordCount,
    accuracy,
    config.rank,
    config.totalPlayers,
    config.mode,
    config.isWinner,
    longestWordLength,
    config.gameDuration,
    config.comboBonus,
    config.fireRoundBonus,
    config.archetype,
    averageWordLength,
    config.achievements,
  ]);

  // Effect: Award coins
  useEffect(() => {
    if (hasAwardedCoinsRef.current) return;

    if (typeof window === 'undefined') return;

    const awardKey = `lexiclash_game_coin_award_${config.sessionId}`;
    if (localStorage.getItem(awardKey)) {
      hasAwardedCoinsRef.current = true;
      return;
    }

    const calculated = calculateGameReward(
      config.score,
      config.mode,
      config.rank,
      config.totalPlayers
    );

    if (calculated.total <= 0) {
      hasAwardedCoinsRef.current = true;
      return;
    }

    const transactionName = config.mode === 'singleplayer' ? 'Single Player Game' : 'Multiplayer Game';
    const metadata = {
      sessionId: config.sessionId,
      ...(config.gameCode && { gameCode: config.gameCode }),
      score: config.score,
      rank: config.rank,
      totalPlayers: config.totalPlayers,
    };

    async function awardCoins() {
      const beforeBalance = await refreshCoins();
      await addCoins(calculated.total, transactionName, metadata);
      const afterBalance = await refreshCoins();

      if (afterBalance > beforeBalance) {
        localStorage.setItem(awardKey, new Date().toISOString());
        setCoinReward({ awarded: calculated.total, breakdown: calculated.breakdown });
      }
    }

    awardCoins().catch(error => {
      console.error('Failed to award coins:', error);
    }).finally(() => {
      hasAwardedCoinsRef.current = true;
    });
  }, [
    config.sessionId,
    config.mode,
    config.score,
    config.rank,
    config.totalPlayers,
    config.gameCode,
    addCoins,
    refreshCoins,
  ]);

  // Effect: Save achievements to profile (for authenticated users)
  useEffect(() => {
    if (!isAuthenticated || !profile || hasSavedAchievementsRef.current) return;

    const achievements = config.achievements || [];
    if (achievements.length === 0) return;

    async function saveAchievements() {
      try {
        // Merge new achievements with existing counts
        const currentCounts = profile?.achievement_counts || {};
        const updatedCounts = { ...currentCounts };

        for (const achievement of achievements) {
          updatedCounts[achievement] = (updatedCounts[achievement] || 0) + 1;
        }

        // Update profile with new achievement counts
        await updateProfile({
          achievement_counts: updatedCounts,
        });

        console.log('[useGameResults] Saved achievements to profile:', achievements);
      } catch (error) {
        console.error('[useGameResults] Failed to save achievements:', error);
      }
    }

    saveAchievements();
    hasSavedAchievementsRef.current = true;
  }, [isAuthenticated, profile, config.achievements, updateProfile]);

  return {
    validWordCount,
    accuracy,
    longestWordLength,
    averageWordLength,
    longestWord,
    coinReward,
  };
}

export default useGameResults;
