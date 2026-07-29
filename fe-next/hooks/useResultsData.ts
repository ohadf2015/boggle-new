/**
 * useResultsData Hook
 *
 * Centralizes all data processing and calculations for results pages.
 * Extracted from ResultsPage.tsx to improve maintainability and reusability.
 *
 * Handles:
 * - Score sorting and ranking
 * - Player archetype calculation
 * - Missed words identification
 * - Share card stats calculation
 * - Win detection logic
 * - Banner player/rank determination
 */

import { useMemo, useCallback, useDeferredValue } from 'react';
import {
  calculateAllPlayerArchetypes,
  getMissedWords,
  type PlayerArchetype,
} from '@/utils/playerArchetypes';
import type { WordObject } from '@/components/results/types';
import type { Avatar } from '@/shared/types/game';
import { sortWithWordHuntWinner } from '@/shared/utils/scoring';

// ==============================================
// TYPES
// ==============================================

/** Player score data from game results */
export interface PlayerScore {
  username: string;
  score: number;
  isBot?: boolean;
  avatar?: Avatar;
  isHost?: boolean;
  allWords?: WordObject[];
  achievements?: any[]; // GameAchievement[] from types
  uniqueWords?: string[];
  invalidWords?: string[];
  wordsFoundCount?: number;
  rank?: number;
  title?: {
    icon: string;
    name: string;
    description: string;
  };
}

/** Configuration for useResultsData hook */
export interface UseResultsDataConfig {
  /** Final scores from all players */
  finalScores: PlayerScore[] | undefined | null;
  /** Current user's username */
  username: string | undefined;
  /** Game duration in seconds (for archetype calculation) */
  gameDuration?: number;
  /** Game mode (e.g. 'word-hunt', 'blast') */
  gameMode?: string;
  /** Username of the player who found the Word Hunt target (winner override) */
  wordHuntTargetFoundBy?: string | null;
}

/** Data returned from useResultsData hook */
export interface UseResultsDataReturn {
  // Score & Ranking
  /** Scores sorted by score (descending) */
  sortedScores: PlayerScore[];
  /** Winning player (highest score) */
  winner: PlayerScore | undefined;
  /** Whether current user won */
  isCurrentUserWinner: boolean;
  /** Current player's rank (1-based: 1 = first place) */
  currentPlayerRank: number;

  // Player Data
  /** Current player's data */
  currentPlayerData: PlayerScore | null;
  /** Current player's valid words */
  currentPlayerValidWords: WordObject[];
  /** Other players (excluding current user) */
  otherPlayers: PlayerScore[];

  // Banner Display
  /** Player to show in banner (current player if available) */
  bannerPlayer: PlayerScore | undefined;
  /** Rank to show in banner (4 for zero-score players in multiplayer) */
  bannerRank: number;
  /** Whether current user is the banner player */
  isCurrentUserInBanner: boolean;

  // Player Analysis
  /** Map of all player archetypes */
  playerArchetypes: Map<string, PlayerArchetype>;
  /** Current player's archetype */
  currentPlayerArchetype: PlayerArchetype | null;
  /** Missed words (high-value words current player didn't find) */
  missedWords: Array<{ word: string; score: number; foundBy: string[] }>;

  // Share Card Stats
  /** Stats for share card */
  shareCardStats: {
    maxCombo: number | undefined;
    longestWord: string | undefined;
  };

  // Word Analysis
  /** Map of all player words for duplicate detection */
  allPlayerWords: Record<string, Array<{
    word: string;
    username: string;
    score: number;
    validated?: boolean;
  }>>;

  // Game Analysis
  /** Whether all opponents are bots */
  isBotsOnlyGame: boolean;

  // Utilities
  /** Normalize username for comparison (trim + lowercase) */
  normalizeUsername: (name: string | undefined | null) => string;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook to process and calculate all results page data.
 *
 * Extracts all data processing logic from ResultsPage to improve maintainability.
 *
 * @example
 * ```tsx
 * const {
 *   sortedScores,
 *   currentPlayerRank,
 *   isCurrentUserWinner,
 *   playerArchetypes,
 *   missedWords,
 *   shareCardStats,
 * } = useResultsData({
 *   finalScores: results.scores,
 *   username: user?.username,
 *   gameDuration: 180,
 * });
 * ```
 */
export function useResultsData({
  finalScores,
  username,
  gameDuration = 180,
  gameMode,
  wordHuntTargetFoundBy,
}: UseResultsDataConfig): UseResultsDataReturn {
  // ==============================================
  // USERNAME NORMALIZATION
  // ==============================================

  /**
   * Normalize username for comparison (trim whitespace, case-insensitive).
   * Prevents rank mismatch bugs when frontend username differs slightly from server.
   */
  const normalizeUsername = useCallback((name: string | undefined | null): string => {
    return (name || '').trim().toLowerCase();
  }, []);

  // ==============================================
  // SCORE SORTING & RANKING
  // ==============================================

  /** Sort scores by score (descending). In Word Hunt, target finder ranks first.
   *  Also ensures wordsFoundCount is always populated from allWords if not set by backend. */
  const sortedScores = useMemo(() => {
    if (!finalScores) return [];
    // Enrich each player with wordsFoundCount if missing
    const enriched = finalScores.map(p => {
      if (p.wordsFoundCount != null) return p;
      const validWords = p.allWords?.filter(w => w.validated && !w.isDuplicate) ?? [];
      return { ...p, wordsFoundCount: validWords.length };
    });
    const sorted = [...enriched].sort((a, b) => b.score - a.score);
    if (gameMode === 'word-hunt' && wordHuntTargetFoundBy) {
      return sortWithWordHuntWinner(sorted, wordHuntTargetFoundBy, (p) => p.score);
    }
    return sorted;
  }, [finalScores, gameMode, wordHuntTargetFoundBy]);

  /** Winning player (highest score) */
  const winner = sortedScores[0];

  /** Whether current user won */
  const isCurrentUserWinner =
    normalizeUsername(winner?.username) === normalizeUsername(username);

  /** Current player's rank (1-based: 1st, 2nd, 3rd, etc.) */
  const currentPlayerRank = useMemo(() => {
    if (!username || sortedScores.length === 0) return -1;
    const normalizedUsername = normalizeUsername(username);
    const index = sortedScores.findIndex(
      (p) => normalizeUsername(p.username) === normalizedUsername
    );
    return index >= 0 ? index + 1 : -1;
  }, [sortedScores, username, normalizeUsername]);

  // ==============================================
  // PLAYER DATA EXTRACTION
  // ==============================================

  /** Get current player data */
  const currentPlayerData = useMemo(() => {
    if (!finalScores || !username) return null;
    const normalizedUsername = normalizeUsername(username);
    return finalScores.find((p) => normalizeUsername(p.username) === normalizedUsername) || null;
  }, [finalScores, username, normalizeUsername]);

  /** Current player's valid words */
  const currentPlayerValidWords = useMemo(() => {
    return currentPlayerData?.allWords?.filter((w) => w.validated && w.score > 0) || [];
  }, [currentPlayerData]);

  /** Other players (excluding current user) */
  const otherPlayers = useMemo(() => {
    const normalizedUsername = normalizeUsername(username);
    return sortedScores.filter((p) => normalizeUsername(p.username) !== normalizedUsername);
  }, [sortedScores, username, normalizeUsername]);

  // ==============================================
  // BANNER DISPLAY LOGIC
  // ==============================================

  /**
   * Always show the current player in the celebration banner.
   * This ensures personalized feedback regardless of rank.
   */
  const bannerPlayer = useMemo(() => {
    if (currentPlayerRank >= 1) {
      return sortedScores[currentPlayerRank - 1];
    }
    return winner;
  }, [currentPlayerRank, sortedScores, winner]);

  /**
   * Use actual player rank for styling (1st=gold, 2nd=silver, 3rd=bronze, 4+=purple encouraging).
   * When playing alone (only 1 player), always show actual rank (1st) even with zero score.
   */
  const hasZeroScore =
    currentPlayerData?.score === 0 || currentPlayerValidWords.length === 0;
  const totalPlayers = sortedScores.length;
  const bannerRank =
    hasZeroScore && totalPlayers > 1
      ? Math.min(Math.max(currentPlayerRank, 4), totalPlayers)
      : currentPlayerRank >= 1 ? currentPlayerRank : 1;

  const isCurrentUserInBanner =
    normalizeUsername(bannerPlayer?.username) === normalizeUsername(username);

  // ==============================================
  // GAME ANALYSIS
  // ==============================================

  /**
   * Detect if all opponents are bots (for NextStepPrompt - suggest brain training).
   */
  const isBotsOnlyGame = useMemo(() => {
    if (!sortedScores || sortedScores.length === 0) return false;
    const normalizedUsername = normalizeUsername(username);
    const opponents = sortedScores.filter(
      (p) => normalizeUsername(p.username) !== normalizedUsername
    );
    // Game is bots-only if there are opponents and ALL of them are bots
    return opponents.length > 0 && opponents.every((p) => p.isBot === true);
  }, [sortedScores, username, normalizeUsername]);

  // ==============================================
  // WORD ANALYSIS
  // ==============================================

  /** Create a map of all player words for duplicate detection */
  const allPlayerWords = useMemo(() => {
    const wordMap: Record<
      string,
      Array<{
        word: string;
        username: string;
        score: number;
        validated?: boolean;
      }>
    > = {};

    if (!finalScores) return wordMap;

    finalScores.forEach((player) => {
      if (!player.allWords) return;

      player.allWords.forEach((wordObj) => {
        const key = wordObj.word.toLowerCase();
        if (!wordMap[key]) {
          wordMap[key] = [];
        }
        wordMap[key].push({
          word: wordObj.word,
          username: player.username,
          score: wordObj.score || 0,
          validated: wordObj.validated,
        });
      });
    });

    return wordMap;
  }, [finalScores]);

  // ==============================================
  // PLAYER ARCHETYPES (Deferred for Performance)
  // ==============================================

  /** Defer final scores for archetype calculation (non-critical UI) */
  const deferredFinalScores = useDeferredValue(finalScores);

  /** Calculate player archetypes for all players */
  const playerArchetypes = useMemo(() => {
    if (!deferredFinalScores || deferredFinalScores.length === 0) {
      return new Map<string, PlayerArchetype>();
    }
    return calculateAllPlayerArchetypes(deferredFinalScores, gameDuration);
  }, [deferredFinalScores, gameDuration]);

  /** Get current player's archetype */
  const currentPlayerArchetype = useMemo(() => {
    if (!username) return null;
    return playerArchetypes.get(username) || null;
  }, [playerArchetypes, username]);

  // ==============================================
  // SHARE CARD STATS
  // ==============================================

  /** Calculate max combo and longest word for sharing */
  const shareCardStats = useMemo(() => {
    if (!currentPlayerData) return { maxCombo: undefined, longestWord: undefined };

    const validWords = currentPlayerData.allWords?.filter((w) => w.validated && w.score > 0) || [];

    // Find max combo
    const maxCombo = validWords.reduce((max, word) => {
      const combo = word.comboBonus || 0;
      return combo > max ? combo : max;
    }, 0);

    // Find longest word
    const longestWord = validWords.reduce(
      (longest, word) => {
        return word.word.length > longest.length ? word.word : longest;
      },
      ''
    );

    return {
      maxCombo: maxCombo > 0 ? maxCombo : undefined,
      longestWord: longestWord || undefined,
    };
  }, [currentPlayerData]);

  // ==============================================
  // MISSED WORDS
  // ==============================================

  /** Build player→words map for missed words (different structure from allPlayerWords which is word→players) */
  const playerToWordsMap = useMemo(() => {
    const map: Record<string, Array<{ word: string; validated?: boolean; score?: number }>> = {};
    if (!finalScores) return map;

    finalScores.forEach((player) => {
      if (!player.allWords) return;
      map[player.username] = player.allWords.map((w) => ({
        word: w.word,
        validated: w.validated,
        score: w.score || 0,
      }));
    });

    return map;
  }, [finalScores]);

  /** Calculate missed words for current player (high-value words others found) */
  const missedWords = useMemo(() => {
    if (!username || !finalScores) return [];
    return getMissedWords(username, playerToWordsMap, 10);
  }, [username, finalScores, playerToWordsMap]);

  // ==============================================
  // RETURN ALL DATA
  // ==============================================

  return {
    // Score & Ranking
    sortedScores,
    winner,
    isCurrentUserWinner,
    currentPlayerRank,

    // Player Data
    currentPlayerData,
    currentPlayerValidWords,
    otherPlayers,

    // Banner Display
    bannerPlayer,
    bannerRank,
    isCurrentUserInBanner,

    // Player Analysis
    playerArchetypes,
    currentPlayerArchetype,
    missedWords,

    // Share Card Stats
    shareCardStats,

    // Word Analysis
    allPlayerWords,

    // Game Analysis
    isBotsOnlyGame,

    // Utilities
    normalizeUsername,
  };
}
