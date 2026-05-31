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

import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCoinContext } from '@/contexts/CoinContext';
import { useWinStreak } from '@/hooks/useWinStreak';
import { useSaveCognitiveScore } from '@/hooks/useSaveCognitiveScore';
import { useSignupPrompt } from '@/components/singleplayer/results/hooks/useSignupPrompt';
import logger from '@/utils/logger';
import {
  getGuestStatsSummary,
  updateGuestStatsAfterGame,
} from '@/utils/guestManager';
import { awardGameCoins } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import { trackGameCompletion, trackStreakMilestone } from '@/utils/growthTracking';
import type { WordObject } from '@/components/results/types';
import { markModePlayedLogic } from '@/hooks/useDailyModeQuest';
import { useMpWinStreak, type MpMode } from '@/hooks/useMpWinStreak';
import { syncGhostRivalScore } from '@/utils/ghostRivalSync';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

// ==============================================
// TYPES
// ==============================================

interface AllWordEntry {
  word: string;
  score: number;
  validated: boolean;
  comboBonus?: number;
  timestamp?: number;
}

type AchievementLike = string | { key?: string; name?: string };

interface PlayerData {
  score?: number;
  allWords?: AllWordEntry[];
  achievements?: AchievementLike[];
}

interface ScoreEntry {
  score?: number;
}

/** Configuration for useResultsSideEffects hook */
export interface UseResultsSideEffectsConfig {
  /** Current player's data */
  currentPlayerData: PlayerData | null;
  /** Current player's valid words */
  currentPlayerValidWords: WordObject[];
  /** Whether current user won */
  isCurrentUserWinner: boolean;
  /** Current player's rank (1-based) */
  currentPlayerRank: number;
  /** Total number of players */
  totalPlayers: number;
  /** Sorted scores (all players) */
  sortedScores: ScoreEntry[];
  /** Current user's username */
  username: string | undefined;
  /** Game code (for multiplayer games) */
  gameCode?: string;
  /** Game duration in seconds */
  gameDuration?: number;
  /** Grid size */
  gridSize?: number;
  /** Achievements earned */
  achievements?: AchievementLike[];
  /** Whether word feedback modal is showing */
  showWordFeedback: boolean;
  /** Game mode for daily quest tracking ('classic' | 'wordHunt') */
  mpGameMode?: 'classic' | 'wordHunt';
  /** Engine mode (e.g. 'multiplayer'|'word-hunt'|'blast'|'wheel-rush'|'singleplayer'). Used to populate `mode` on first_game_won. */
  gameMode?: string;
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
  /** Coin reward earned this game (null if none) */
  coinReward: { awarded: number; breakdown: { base: number; scoreBonus?: number; placement?: number; efficiency?: number; streak?: number; streakBonus?: number } } | null;
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
  mpGameMode,
  gameMode,
}: UseResultsSideEffectsConfig): UseResultsSideEffectsReturn {
  // ==============================================
  // AUTH & CONTEXT
  // ==============================================

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { refreshCoins } = useCoinContext();
  const { currentStreak, bestStreak, lastWinDate, recordWin } = useWinStreak();
  const { saveCognitiveScore } = useSaveCognitiveScore();
  const mpWinStreak = useMpWinStreak();

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
  const hasRoutedSignupPromptRef = useRef<boolean>(false);

  // ==============================================
  // REFS (Prevent duplicate execution)
  // ==============================================

  const hasUpdatedStatsRef = useRef<boolean>(false);
  const hasTrackedGameRef = useRef<boolean>(false);
  const hasAddedToHistoryRef = useRef<boolean>(false);
  const hasAwardedCoinsRef = useRef<boolean>(false);
  const hasSavedCognitiveScoreRef = useRef<boolean>(false);
  const hasSyncedGhostRivalRef = useRef<boolean>(false);

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
        achievements: (currentPlayerData.achievements || achievements || []).map((a) =>
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

  const [coinReward, setCoinReward] = useState<{ awarded: number; breakdown: { base: number; scoreBonus?: number; placement?: number; efficiency?: number; streak?: number; streakBonus?: number } } | null>(null);

  useEffect(() => {
    if (hasAwardedCoinsRef.current || !currentPlayerData || !gameCode) return;

    // Defer one frame past first paint. awardGameCoins fires a 'coinsChanged'
    // event that re-renders every CoinContext consumer; running it inline with
    // the other mount effects compounds the results-page setState cascade and
    // costs visible jank in the first ~100ms.
    const rafId = requestAnimationFrame(() => {
      const sessionId = `mp_${gameCode}_${Date.now()}`;
      const reward = awardGameCoins(
        sessionId,
        'multiplayer',
        currentPlayerData.score || 0,
        currentPlayerRank,
        totalPlayers,
        currentStreak,
      );

      if (reward && reward.awarded > 0) {
        startTransition(() => setCoinReward(reward));
        if (user?.id) {
          syncCoinsToDatabase(
            user.id,
            reward.awarded,
            'Multiplayer Game',
            {
              gameCode,
              score: currentPlayerData.score || 0,
              rank: currentPlayerRank,
              totalPlayers,
            },
          ).then(() => {
            refreshCoins();
          }).catch((err: unknown) => {
            logger.error('[useResultsSideEffects] Coin sync failed:', err);
          });
        }
      }

      hasAwardedCoinsRef.current = true;
    });

    return () => cancelAnimationFrame(rafId);
  }, [currentPlayerData, currentPlayerRank, totalPlayers, gameCode, user?.id, refreshCoins, currentStreak]);

  // ==============================================
  // EFFECT 3: Save Cognitive Score
  // ==============================================

  useEffect(() => {
    if (hasSavedCognitiveScoreRef.current) return;
    if (!user?.id || !currentPlayerData || !gameCode) return;

    // Calculate max combo streak
    const validWords = currentPlayerData.allWords?.filter((w) => w.validated && w.score > 0) || [];
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
    const playerWordData = (currentPlayerData.allWords || []).map((w) => ({
      word: w.word,
      score: w.score,
      isValid: w.validated,
      timestamp: w.timestamp,
    }));

    // gridSize is the grid dimension (e.g. 4 for 4x4), convert to total cells
    const totalCells = gridSize * gridSize;

    saveCognitiveScore({
      playerWordData,
      gameDuration,
      gridSize: totalCells,
      maxCombo,
      hintsUsed: 0,
      // No gameSessionId for multiplayer — the mp_ format is not a valid UUID
      // and would be rejected by FK constraint. Cognitive scores are still saved
      // but without a session link.
    }).then((cognitiveResult) => {
      if (cognitiveResult) {
        logger.log('[useResultsSideEffects] Cognitive scores saved:', cognitiveResult);
        startTransition(() => setBrainPointsReward({
          scoreDelta: cognitiveResult.scoreDelta,
          newScore: cognitiveResult.overallScore,
        }));
      }
    }).catch((err: unknown) => {
      logger.error('[useResultsSideEffects] Cognitive score save failed:', err);
    });

    hasSavedCognitiveScoreRef.current = true;
  }, [user?.id, currentPlayerData, gameCode, saveCognitiveScore, gameDuration, gridSize]);

  // ==============================================
  // EFFECT 4: Track Game Completion & Win Streak
  // ==============================================

  useEffect(() => {
    if (hasTrackedGameRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter((w) => w.validated && w.score > 0) || [];
    const guestStats = getGuestStatsSummary();
    const isFirstGame = guestStats.gamesPlayed <= 1;

    // Track game completion for analytics
    trackGameCompletion(
      isCurrentUserWinner,
      currentPlayerData.score || 0,
      validWords.length,
      isFirstGame,
      gameMode || (gameCode ? 'multiplayer' : 'singleplayer')
    );

    // Record game completion for streak (any game mode, win or loss)
    {
      const alreadyPlayedToday =
        lastWinDate && new Date(lastWinDate).toDateString() === new Date().toDateString();

      const prevStreak = currentStreak;
      recordWin();

      const newStreak = alreadyPlayedToday ? currentStreak : prevStreak + 1;
      trackStreakMilestone(newStreak);

      const tierThresholds = [3, 7, 14, 30];
      const isNewMilestone = !alreadyPlayedToday && tierThresholds.some((t) => newStreak === t);

      // Wrap setStates in startTransition so the first paint of the results
      // page isn't blocked by the streak/badge cascade.
      startTransition(() => {
        setPreviousStreak(prevStreak);
        setWinStreakData({
          currentStreak: newStreak,
          bestStreak: Math.max(bestStreak, newStreak),
          isNewMilestone,
          previousStreak: prevStreak,
        });
      });
    }

    // Track daily quest mode completion
    if (mpGameMode === 'wordHunt') {
      markModePlayedLogic('wordHuntMp');
    } else if (mpGameMode === 'classic') {
      markModePlayedLogic('classicMp');
    } else if (gameMode === 'blast') {
      // Single-player Blast game
      markModePlayedLogic('blast');
    }

    // Track MP win streak
    if (gameCode && mpGameMode) {
      const mpMode: MpMode | null =
        mpGameMode === 'wordHunt' ? 'wordHunt' :
        mpGameMode === 'classic' ? 'classic' : null;
      if (mpMode) {
        if (isCurrentUserWinner) {
          mpWinStreak.recordWin(mpMode);
        } else {
          mpWinStreak.recordLoss(mpMode);
        }
      }
    }

    hasTrackedGameRef.current = true;
  }, [currentPlayerData, isCurrentUserWinner, currentStreak, bestStreak, lastWinDate, recordWin, mpGameMode, gameCode, gameMode, mpWinStreak]);

  // ==============================================
  // EFFECT 5: Add Game to History
  // ==============================================

  useEffect(() => {
    if (hasAddedToHistoryRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter((w) => w.validated && w.score > 0) || [];
    const totalAttempts = currentPlayerData.allWords?.length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
    const longestWordLength = validWords.reduce((max: number, w) => Math.max(max, w.word.length), 0);

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
  // EFFECT 7: Sync Ghost Rival Score
  // ==============================================
  // Fire-and-forget increment of the player's weekly rivalry score.
  // Guard prevents React 18 strict-mode double-fire, which would
  // otherwise double-count the player's score against their rival.

  useEffect(() => {
    if (hasSyncedGhostRivalRef.current) return;
    if (!user?.id || !currentPlayerData) return;

    const points = currentPlayerData.score || 0;
    if (points <= 0) return;

    syncGhostRivalScore(user.id, points);
    hasSyncedGhostRivalRef.current = true;
  }, [user?.id, currentPlayerData]);

  // ==============================================
  // EFFECT 6: Signup Prompt (hook-driven, timer-based)
  //
  // Prior scroll-gated logic fired ~5% of the time (PostHog `first_win_signup`
  // modalId had 0 events in 7d) because most mobile results screens fit in one
  // viewport — users never scrolled past 80%. `useSignupPrompt` uses a 3.5s
  // post-results timer + sessionStorage guard. Route its decision to one of
  // the two existing modal slots based on winner status.
  // ==============================================

  const signupPrompt = useSignupPrompt({
    isAuthenticated,
    hasUser: !!user,
    authLoading,
    disabled:
      !!gameCode ||
      isOnCrazyGamesPlatform ||
      showWordFeedback ||
      !hasUpdatedStatsRef.current,
  });

  useEffect(() => {
    if (!signupPrompt.showSignupModal) return;
    if (hasRoutedSignupPromptRef.current) return;
    hasRoutedSignupPromptRef.current = true;
    if (isCurrentUserWinner && signupPrompt.isFirstWin) {
      setShowFirstWinModal(true);
    } else {
      setShowAuthModal(true);
    }
  }, [signupPrompt.showSignupModal, signupPrompt.isFirstWin, isCurrentUserWinner]);

  const dismissSignupModal = signupPrompt.dismissSignupModal;
  const wrappedSetShowAuthModal = useCallback(
    (show: boolean) => {
      setShowAuthModal(show);
      if (!show) dismissSignupModal();
    },
    [dismissSignupModal],
  );
  const wrappedSetShowFirstWinModal = useCallback(
    (show: boolean) => {
      setShowFirstWinModal(show);
      if (!show) dismissSignupModal();
    },
    [dismissSignupModal],
  );

  // ==============================================
  // RETURN ALL DATA
  // ==============================================

  return {
    brainPointsReward,
    winStreakData,
    showAuthModal,
    setShowAuthModal: wrappedSetShowAuthModal,
    showFirstWinModal,
    setShowFirstWinModal: wrappedSetShowFirstWinModal,
    coinReward,
  };
}
