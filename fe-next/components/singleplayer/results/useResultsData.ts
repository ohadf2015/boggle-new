/**
 * useResultsData - Process and organize single player results data
 *
 * Uses shared utilities from results/utils.ts for word categorization
 * to maintain consistency with multiplayer results display.
 */

import { useMemo } from 'react';
import { calculatePlayerInsights, WordData } from '@/utils/gameInsights';
import { categorizeWords, calculateWordStats } from '@/components/results/utils';
import type { WordObject } from '@/components/results/types';
import type { SinglePlayerResultsData, PlayerWordData } from '../SinglePlayerView';

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

export function useResultsData(results: SinglePlayerResultsData, t: (key: string) => string) {
  // Calculate rankings for solo-bots mode
  const allParticipants = useMemo(() => {
    return [
      { name: t('common.you') || 'You', score: results.playerScore, isPlayer: true },
      ...results.botScores.map(bot => ({ name: bot.name, score: bot.score, isPlayer: false })),
    ].sort((a, b) => b.score - a.score);
  }, [results.playerScore, results.botScores, t]);

  const playerRank = allParticipants.findIndex(p => p.isPlayer) + 1;
  const isWinner = playerRank === 1;

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

  return {
    allParticipants,
    playerRank,
    isWinner,
    playerInsights,
    ...processedWords,
    botWordDetails,
  };
}
