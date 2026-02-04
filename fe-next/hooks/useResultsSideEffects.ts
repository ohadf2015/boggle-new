/**
 * useResultsSideEffects Hook
 *
 * Centralizes all side effects and state management for results pages.
 * Extracted from ResultsPage.tsx to improve maintainability and testability.
 *
 * Handles:
 * - Guest stats updates (score, word count, achievements)
 * - Coin awards (multiplayer game rewards)
 * - Cognitive score saving (brain training)
 * - Game completion tracking (analytics, win streaks)
 * - Game history (performance chart data)
 * - Signup prompts (guest user conversion)
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoinContext } from '@/contexts/CoinContext';
import { useWinStreak } from '@/hooks/useWinStreak';
import { useSaveCognitiveScore } from '@/hooks/useSaveCognitiveScore';
import {
  getGuestStatsSummary,
  updateGuestStatsAfterGame,
  shouldShowUpgradePrompt,
  isFirstWin,
} from '@/utils/guestManager';
import { awardGameCoins } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import { trackGameCompletion, trackStreakMilestone } from '@/utils/growthTracking';
import type { WordObject } from '@/components/results/types';

// ==============================================
// TYPES
// ==============================================

/** Configuration for useResultsSideEffects hook */
export interface UseResultsSideEffectsConfig {
  /** Current player's data */
  currentPlayerData: any | null;
  /** Current player's valid words */
  currentPlayerValidWords: WordObject[];
  /** Whether current user won */
  isCurrentUserWinner: boolean;
  /** Current player's rank (1-based) */
  currentPlayerRank: number;
  /** Total number of players */
  totalPlayers: number;
  /** Sorted scores (all players) */
  sortedScores: any[];
  /** Current user's username */
  username: string | undefined;
  /** Game code (for multiplayer games) */
  gameCode?: string;
  /** Game duration in seconds */
  gameDuration?: number;
  /** Grid size */
  gridSize?: number;
  /** Achievements earned */
  achievements?: any[];
  /** Whether word feedback modal is showing */
  showWordFeedback: boolean;
  /** Username normalization function */
  normalizeUsername: (name: string | undefined | null) => string;
}

/** Data returned from useResultsSideEffects hook */
export interface UseResultsSideEffectsReturn {
  /** Brain points reward data */
  brainPointsReward: {
    scoreDelta: number;
    newScore: number;
  } | null;
  /** Win streak data for display */
  winStreakData: {
    currentStreak: number;
    bestStreak: number;
    isNewMilestone: boolean;
    previousStreak: number;
  } | null;
  /** Auth modal visibility state */
  showAuthModal: boolean;
  /** Set auth modal visibility */
  setShowAuthModal: (show: boolean) => void;
  /** First win modal visibility state */
  showFirstWinModal: boolean;
  /** Set first win modal visibility */
  setShowFirstWinModal: (show: boolean) => void;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to handle all results page side effects.
 *
 * Manages guest stats, coin awards, cognitive scores, game tracking,
 * and signup prompts. Extracted from ResultsPage to improve testability.
 *
 * @example
 * ```tsx
 * const {
 *   brainPointsReward,
 *   winStreakData,
 *   showAuthModal,
 *   setShowAuthModal,
 *   showFirstWinModal,
 *   setShowFirstWinModal,
 * } = useResultsSideEffects({
 *   currentPlayerData,
 *   currentPlayerValidWords,
 *   isCurrentUserWinner,
 *   currentPlayerRank,
 *   totalPlayers,
 *   sortedScores,
 *   username,
 *   gameCode,
 *   gameDuration: 180,
 *   gridSize: 16,
 *   achievements,
 *   showWordFeedback,
 *   normalizeUsername,
 * });
 * ```
 */
export function useResultsSideEffects({
  currentPlayerData,
  currentPlayerValidWords,
  isCurrentUserWinner,
  currentPlayerRank,
  totalPlayers,
  sortedScores,
  username,
  gameCode,
  gameDuration = 180,
  gridSize = 16,
  achievements,
  showWordFeedback,
  normalizeUsername,
}: UseResultsSideEffectsConfig): UseResultsSideEffectsReturn {
  // ==============================================
  // AUTH & CONTEXT
  // ==============================================

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { refreshCoins } = useCoinContext();
  const { currentStreak, bestStreak, lastWinDate, recordWin } = useWinStreak();
  const { saveCognitiveScore } = useSaveCognitiveScore();

  // ==============================================
  // STATE
  // ==============================================

  const [brainPointsReward, setBrainPointsReward] = useState<{
    scoreDelta: number;
    newScore: number;
  } | null>(null);

  const [winStreakData, setWinStreakData] = useState<{
    currentStreak: number;
    bestStreak: number;
    isNewMilestone: boolean;
    previousStreak: number;
  } | null>(null);

  const [previousStreak, setPreviousStreak] = useState<number>(0);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showFirstWinModal, setShowFirstWinModal] = useState<boolean>(false);
  const [hasShownUpgradePrompt, setHasShownUpgradePrompt] = useState<boolean>(false);

  // ==============================================
  // REFS (Prevent duplicate execution)
  // ==============================================

  const hasUpdatedStatsRef = useRef<boolean>(false);
  const hasTrackedGameRef = useRef<boolean>(false);
  const hasAddedToHistoryRef = useRef<boolean>(false);
  const hasAwardedCoinsRef = useRef<boolean>(false);
  const hasSavedCognitiveScoreRef = useRef<boolean>(false);

  // ==============================================
  // EFFECT 1: Update Guest Stats
  // ==============================================

  useEffect(() => {
    if (!isAuthenticated && !hasUpdatedStatsRef.current && currentPlayerData && username) {
      const longestValidWord = currentPlayerValidWords.reduce<string | undefined>(
        (longest, w) => (w.word.length > (longest?.length || 0) ? w.word : longest),
        undefined
      );

      updateGuestStatsAfterGame({
        score: typeof currentPlayerData.score === 'number' ? currentPlayerData.score : 0,
        wordCount: currentPlayerValidWords.length,
        longestWord: longestValidWord ?? undefined,
        isWinner: isCurrentUserWinner,
        achievements: (currentPlayerData.achievements || achievements || []).map((a: any) =>
          typeof a === 'string' ? a : a.key || a.name || ''
        ),
      });
      hasUpdatedStatsRef.current = true;
    }
  }, [
    isAuthenticated,
    currentPlayerData,
    username,
    isCurrentUserWinner,
    achievements,
    currentPlayerValidWords,
  ]);

  // ==============================================
  // EFFECT 2: Award Coins
  // ==============================================

  useEffect(() => {
    if (hasAwardedCoinsRef.current || !currentPlayerData || !gameCode) return;

    const sessionId = `mp_${gameCode}_${Date.now()}`;

    const reward = awardGameCoins(
      sessionId,
      'multiplayer',
      currentPlayerData.score || 0,
      currentPlayerRank,
      totalPlayers
    );

    if (reward && reward.awarded > 0) {
      if (user?.id) {
        // Authenticated: Sync to DB AND Refresh Profile
        syncCoinsToDatabase(
          user.id,
          reward.awarded,
          'Multiplayer Game',
          {
            gameCode,
            score: currentPlayerData.score || 0,
            rank: currentPlayerRank,
            totalPlayers,
          }
        ).then(() => {
          refreshCoins();
        });
      }
    }

    hasAwardedCoinsRef.current = true;
  }, [currentPlayerData, currentPlayerRank, totalPlayers, gameCode, user?.id, refreshCoins]);

  // ==============================================
  // EFFECT 3: Save Cognitive Score
  // ==============================================

  useEffect(() => {
    if (hasSavedCognitiveScoreRef.current) return;
    if (!user?.id || !currentPlayerData || !gameCode) return;

    // Calculate max combo streak
    const validWords = currentPlayerData.allWords?.filter((w: any) => w.validated && w.score > 0) || [];
    let maxCombo = 0;
    let currentCombo = 0;

    for (const word of validWords) {
      if (word.comboBonus && word.comboBonus > 0) {
        currentCombo++;
        maxCombo = Math.max(maxCombo, currentCombo);
      } else {
        currentCombo = 0;
      }
    }

    // Map words to expected format
    const playerWordData = (currentPlayerData.allWords || []).map((w: any) => ({
      word: w.word,
      score: w.score,
      isValid: w.validated,
      timestamp: w.timestamp,
    }));

    const sessionId = `mp_${gameCode}_${Date.now()}`;

    saveCognitiveScore({
      playerWordData,
      gameDuration,
      gridSize,
      maxCombo,
      hintsUsed: 0,
      gameSessionId: sessionId,
    }).then((cognitiveResult) => {
      if (cognitiveResult) {
        console.log('[useResultsSideEffects] Cognitive scores saved:', cognitiveResult);
        setBrainPointsReward({
          scoreDelta: cognitiveResult.scoreDelta,
          newScore: cognitiveResult.overallScore,
        });
      }
    });

    hasSavedCognitiveScoreRef.current = true;
  }, [user?.id, currentPlayerData, gameCode, saveCognitiveScore, gameDuration, gridSize]);

  // ==============================================
  // EFFECT 4: Track Game Completion & Win Streak
  // ==============================================

  useEffect(() => {
    if (hasTrackedGameRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter((w: any) => w.validated && w.score > 0) || [];
    const guestStats = getGuestStatsSummary();
    const isFirstGame = guestStats.gamesPlayed <= 1;

    // Track game completion for analytics
    trackGameCompletion(
      isCurrentUserWinner,
      currentPlayerData.score || 0,
      validWords.length,
      isFirstGame
    );

    // Record win and update streak
    if (isCurrentUserWinner) {
      const alreadyWonToday =
        lastWinDate && new Date(lastWinDate).toDateString() === new Date().toDateString();

      const prevStreak = currentStreak;
      setPreviousStreak(prevStreak);
      recordWin();

      const newStreak = alreadyWonToday ? currentStreak : prevStreak + 1;
      trackStreakMilestone(newStreak);

      const tierThresholds = [3, 7, 14, 30];
      const isNewMilestone = !alreadyWonToday && tierThresholds.some((t) => newStreak === t);

      setWinStreakData({
        currentStreak: newStreak,
        bestStreak: Math.max(bestStreak, newStreak),
        isNewMilestone,
        previousStreak: prevStreak,
      });
    }

    hasTrackedGameRef.current = true;
  }, [currentPlayerData, isCurrentUserWinner, currentStreak, bestStreak, lastWinDate, recordWin]);

  // ==============================================
  // EFFECT 5: Add Game to History
  // ==============================================

  useEffect(() => {
    if (hasAddedToHistoryRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter((w: any) => w.validated && w.score > 0) || [];
    const totalAttempts = currentPlayerData.allWords?.length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
    const longestWordLength = validWords.reduce((max: number, w: any) => Math.max(max, w.word.length), 0);

    addGameToHistory({
      score: currentPlayerData.score || 0,
      wordCount: validWords.length,
      accuracy,
      rank: currentPlayerRank,
      totalPlayers,
      mode: 'multiplayer',
      isWinner: isCurrentUserWinner,
      longestWordLength,
    });

    hasAddedToHistoryRef.current = true;
  }, [currentPlayerData, currentPlayerRank, totalPlayers, isCurrentUserWinner]);

  // ==============================================
  // EFFECT 6: Signup Prompt (Scroll-Based)
  // ==============================================

  useEffect(() => {
    if (
      isAuthenticated ||
      user ||
      authLoading ||
      hasShownUpgradePrompt ||
      !hasUpdatedStatsRef.current ||
      showWordFeedback
    ) {
      return;
    }

    const shouldShowModal = shouldShowUpgradePrompt();
    const isFirstWinUser = isFirstWin();

    if (!shouldShowModal && !(isCurrentUserWinner && isFirstWinUser)) {
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= 0.8 && !showWordFeedback) {
        if (isCurrentUserWinner && (isFirstWinUser || shouldShowModal)) {
          setShowFirstWinModal(true);
        } else if (shouldShowModal) {
          setShowAuthModal(true);
        }
        setHasShownUpgradePrompt(true);
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const initialCheckTimeout = setTimeout(() => {
      if (!showWordFeedback) {
        handleScroll();
      }
    }, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheckTimeout);
    };
  }, [isAuthenticated, user, authLoading, hasShownUpgradePrompt, isCurrentUserWinner, showWordFeedback]);

  // ==============================================
  // RETURN ALL DATA
  // ==============================================

  return {
    brainPointsReward,
    winStreakData,
    showAuthModal,
    setShowAuthModal,
    showFirstWinModal,
    setShowFirstWinModal,
  };
}
