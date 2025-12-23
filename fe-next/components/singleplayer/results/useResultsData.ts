/**
 * useResultsData - Process and organize single player results data
 */

import { useMemo } from 'react';
import { calculatePlayerInsights, WordData } from '@/utils/gameInsights';
import type { SinglePlayerResultsData, PlayerWordData } from '../SinglePlayerView';

export interface BotWordDetail {
  name: string;
  score: number;
  totalWords: number;
  wordsByLength: Record<number, number>;
  sortedLengths: number[];
}

export interface ProcessedResultsData {
  wordsByPoints: Record<number, PlayerWordData[]>;
  sortedPointGroups: number[];
  invalidWords: PlayerWordData[];
  totalComboBonus: number;
  totalFireRoundBonus: number;
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

  // Group words by points for display
  const processedWords = useMemo((): ProcessedResultsData => {
    if (!results.playerWordData?.length) {
      return {
        wordsByPoints: {},
        sortedPointGroups: [],
        invalidWords: [],
        totalComboBonus: 0,
        totalFireRoundBonus: 0,
      };
    }

    const validWords = results.playerWordData.filter(w => w.isValid);
    const invalidWords = results.playerWordData.filter(w => !w.isValid);

    const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);
    const totalFireRoundBonus = validWords.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0);

    const wordsByPoints: Record<number, PlayerWordData[]> = {};
    validWords.forEach(wordObj => {
      const points = wordObj.score || 0;
      if (!wordsByPoints[points]) {
        wordsByPoints[points] = [];
      }
      wordsByPoints[points].push(wordObj);
    });

    // Sort words alphabetically within each point group
    Object.keys(wordsByPoints).forEach(points => {
      const wordList = wordsByPoints[Number(points)];
      if (wordList) {
        wordList.sort((a, b) => a.word.localeCompare(b.word));
      }
    });

    const sortedPointGroups = Object.keys(wordsByPoints)
      .map(Number)
      .sort((a, b) => b - a);

    return { wordsByPoints, sortedPointGroups, invalidWords, totalComboBonus, totalFireRoundBonus };
  }, [results.playerWordData]);

  // Process bot words for display
  const botWordDetails = useMemo((): BotWordDetail[] => {
    return results.botScores.map(bot => {
      const wordsByLength: Record<number, number> = {};
      let totalWords = 0;

      bot.words.forEach(word => {
        const match = word.match(/word(\d+)/);
        const length = match ? parseInt(match[1], 10) : word.length;
        wordsByLength[length] = (wordsByLength[length] || 0) + 1;
        totalWords++;
      });

      const sortedLengths = Object.keys(wordsByLength)
        .map(Number)
        .sort((a, b) => b - a);

      return {
        name: bot.name,
        score: bot.score,
        totalWords,
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
