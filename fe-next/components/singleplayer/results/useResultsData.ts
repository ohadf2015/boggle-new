/**
 * useResultsData - Process and organize single player results data
 *
 * Uses shared utilities from results/utils.ts for word categorization
 * to maintain consistency with multiplayer results display.
 */

import { useMemo } from 'react';
import { calculatePlayerInsights, type PlayerInsights, type WordData } from '@/utils/gameInsights';
import { categorizeWords, calculateWordStats } from '@/components/results/utils';
import { calculateAllPlayerArchetypes, getMissedWords, type PlayerArchetype } from '@/utils/playerArchetypes';
import { calculateWordScore } from '@/shared/utils/scoring';
import type { WordObject } from '@/components/results/types';
import type { SinglePlayerResultsData, PlayerWordData } from '../SinglePlayerView';

// Re-export types for consumers
export type { PlayerInsights };

/** Type alias for word grouping by point values */
export type WordsByPoints = Record<number, WordObject[]>;

/** Type alias for invalid word display */
export type InvalidWord = WordObject;

/** Missed word that player could have found */
export interface MissedWord {
  word: string;
  score: number;
  foundBy: string[];
  path?: { row: number; col: number }[];
}

export interface BotWordDetail {
  name: string;
  score: number;
  totalWords: number;
  words: string[]; // Actual words the bot found
  wordsByLength: Record<number, number>;
  sortedLengths: number[];
}

export interface ProcessedResultsData {
  /** Words grouped by point value (uses shared WordObject type) */
  wordsByPoints: Record<number, WordObject[]>;
  /** Sorted point values for display (descending) */
  sortedPointGroups: number[];
  /** Invalid words (uses shared WordObject type) */
  invalidWords: WordObject[];
  totalComboBonus: number;
  totalFireRoundBonus: number;
}

/**
 * Convert PlayerWordData to WordObject format for shared component compatibility
 */
function playerWordDataToWordObject(word: PlayerWordData): WordObject {
  return {
    word: word.word,
    score: word.score,
    validated: word.isValid,
    isDuplicate: false, // Single player doesn't have duplicate words
    comboBonus: word.comboBonus,
    fireRoundBonus: word.fireRoundBonus,
    timestamp: word.timestamp,
    timeSinceStart: word.timeSinceStart,
  };
}

export interface ParticipantAvatar {
  customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
}

export interface Participant {
  name: string;
  score: number;
  isPlayer: boolean;
  avatar?: ParticipantAvatar;
}

export function useResultsData(
  results: SinglePlayerResultsData,
  t: (key: string) => string,
  playerAvatar?: ParticipantAvatar
) {
  // Calculate rankings for solo-bots mode
  const allParticipants = useMemo((): Participant[] => {
    return [
      {
        name: t('common.you') || 'You',
        score: results.playerScore,
        isPlayer: true,
        avatar: playerAvatar,
      },
      ...results.botScores.map(bot => ({
        name: bot.name,
        score: bot.score,
        isPlayer: false,
        avatar: undefined, // Bots use Bot icon in Top3Leaderboard
      })),
    ].sort((a, b) => b.score - a.score);
  }, [results.playerScore, results.botScores, t, playerAvatar]);

  const playerRank = allParticipants.findIndex(p => p.isPlayer) + 1;
  const isWinner = playerRank === 1;

  // Debug logging for win streak diagnosis
  if (process.env.NODE_ENV === 'development') {
    console.log('[ResultsData] Player rank calculation', {
      playerScore: results.playerScore,
      botScores: results.botScores.map(b => ({ name: b.name, score: b.score })),
      allParticipantsSorted: allParticipants.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        score: p.score,
        isPlayer: p.isPlayer,
      })),
      playerRank,
      isWinner,
    });
  }

  // Convert PlayerWordData to WordObject format for shared utilities
  const wordObjects = useMemo((): WordObject[] => {
    if (!results.playerWordData?.length) return [];
    return results.playerWordData.map(playerWordDataToWordObject);
  }, [results.playerWordData]);

  // Calculate player insights from word data
  const playerInsights = useMemo(() => {
    if (!results.playerWordData?.length) return null;

    const wordData: WordData[] = results.playerWordData.map(w => ({
      word: w.word,
      validated: w.isValid,
      timestamp: w.timestamp,
      timeSinceStart: w.timeSinceStart,
      score: w.score,
    }));

    return calculatePlayerInsights(wordData, results.gameDuration, results.playerScore);
  }, [results.playerWordData, results.gameDuration, results.playerScore]);

  // Use shared utilities for word categorization
  const processedWords = useMemo((): ProcessedResultsData => {
    if (!wordObjects.length) {
      return {
        wordsByPoints: {},
        sortedPointGroups: [],
        invalidWords: [],
        totalComboBonus: 0,
        totalFireRoundBonus: 0,
      };
    }

    const { validWords, invalidWords, wordsByPoints, sortedPointGroups } = categorizeWords(wordObjects);
    const stats = calculateWordStats(wordObjects);

    return {
      wordsByPoints,
      sortedPointGroups,
      invalidWords,
      totalComboBonus: stats.totalComboBonus,
      totalFireRoundBonus: stats.totalFireRoundBonus,
    };
  }, [wordObjects]);

  // Process bot words for display
  const botWordDetails = useMemo((): BotWordDetail[] => {
    return results.botScores.map(bot => {
      const wordsByLength: Record<number, number> = {};
      let totalWords = 0;
      const actualWords: string[] = [];

      bot.words.forEach(word => {
        // Check if this is a fallback format (word5, word6, etc.) or an actual word
        const fallbackMatch = word.match(/^word(\d+)$/);
        if (fallbackMatch) {
          // Fallback format - just count by length
          const length = parseInt(fallbackMatch[1], 10);
          wordsByLength[length] = (wordsByLength[length] || 0) + 1;
        } else {
          // Actual word
          actualWords.push(word);
          wordsByLength[word.length] = (wordsByLength[word.length] || 0) + 1;
        }
        totalWords++;
      });

      const sortedLengths = Object.keys(wordsByLength)
        .map(Number)
        .sort((a, b) => b - a);

      return {
        name: bot.name,
        score: bot.score,
        totalWords,
        words: actualWords,
        wordsByLength,
        sortedLengths,
      };
    });
  }, [results.botScores]);

  // Calculate player archetypes for solo-bots mode
  // Requires at least 2 participants (player + bots)
  const playerArchetypes = useMemo((): Map<string, PlayerArchetype> => {
    if (results.botScores.length === 0) return new Map();

    const playerUsername = t('common.you') || 'You';

    // Convert player data to archetype calculation format
    const playerData = {
      username: playerUsername,
      score: results.playerScore,
      allWords: results.playerWordData?.map(w => ({
        word: w.word,
        validated: w.isValid,
        score: w.score,
        timeSinceStart: w.timeSinceStart,
      })) || [],
    };

    // Convert bot data to archetype calculation format
    const botData = results.botScores.map(bot => ({
      username: bot.name,
      score: bot.score,
      allWords: bot.words
        .filter(word => !word.match(/^word\d+$/)) // Filter out fallback format
        .map(word => ({
          word,
          validated: true,
          score: calculateWordScore(word),
        })),
    }));

    const allPlayers = [playerData, ...botData];
    return calculateAllPlayerArchetypes(allPlayers, results.gameDuration);
  }, [results.botScores, results.playerScore, results.playerWordData, results.gameDuration, t]);

  // Get player's archetype
  const playerArchetype = useMemo((): PlayerArchetype | null => {
    const playerUsername = t('common.you') || 'You';
    return playerArchetypes.get(playerUsername) || null;
  }, [playerArchetypes, t]);

  // Calculate missed words for solo-bots mode
  // Shows high-value words found by bots that the player didn't find
  const missedWords = useMemo(() => {
    if (results.botScores.length === 0) return [];

    const playerUsername = t('common.you') || 'You';
    const playerWords = results.playerWordData || [];

    // Build allPlayersWords map — include ALL player words (even invalid)
    // so words the player attempted don't show as "missed"
    const allPlayersWords: Record<string, Array<{ word: string; validated: boolean; score: number }>> = {
      [playerUsername]: playerWords.map(w => ({
        word: w.word,
        validated: w.isValid,
        score: w.score,
      })),
    };

    // Add bot words
    results.botScores.forEach(bot => {
      allPlayersWords[bot.name] = bot.words
        .filter(word => !word.match(/^word\d+$/)) // Filter out fallback format
        .map(word => ({
          word,
          validated: true,
          score: calculateWordScore(word),
        }));
    });

    return getMissedWords(playerUsername, allPlayersWords, 10);
  }, [results.botScores, results.playerWordData, t]);

  return {
    allParticipants,
    playerRank,
    isWinner,
    playerInsights,
    ...processedWords,
    botWordDetails,
    playerArchetypes,
    playerArchetype,
    missedWords,
  };
}
