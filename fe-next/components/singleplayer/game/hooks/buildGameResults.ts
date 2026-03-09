/**
 * Game Results Builder
 *
 * Pure utility functions for building single-player game results data.
 * Extracted from useSinglePlayerCore to reduce hook complexity.
 */

import {
  calculateFinalAchievements,
  type WordData as AchievementWordData,
} from '@/utils/singlePlayerAchievements';
import type { SinglePlayerResultsData, BotOpponent } from '../../SinglePlayerView';
import type { LetterGrid } from '@/shared/types/game';
import type { FoundWord } from '../types';
import type { Language } from '@/types';

interface BuildResultsParams {
  foundWords: FoundWord[];
  grid: LetterGrid;
  bots: BotOpponent[];
  botScores: Record<string, number>;
  botWords: Record<string, string[]>;
  gameStartTime: number;
  timerSeconds: number;
  maxCombo: number;
  mode: string;
  language: Language;
}

/**
 * Build the final game results from current game state
 */
export function buildGameResults(params: BuildResultsParams): SinglePlayerResultsData {
  const {
    foundWords, grid, bots, botScores, botWords,
    gameStartTime, timerSeconds, maxCombo, mode, language,
  } = params;

  // Treat pending words (isValid: null) as invalid
  const finalWords = foundWords.map(w => ({
    ...w,
    isValid: w.isValid === true,
  }));

  const validWords = finalWords.filter(w => w.isValid === true);
  const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);
  const actualGameDuration = mode === 'practice'
    ? Math.max(1, Math.floor((Date.now() - gameStartTime) / 1000))
    : timerSeconds;

  const validWordData: AchievementWordData[] = validWords.map(w => ({
    word: w.word, score: w.score, timestamp: w.timestamp,
    timeSinceStart: w.timeSinceStart, isValid: true, comboBonus: w.comboBonus,
  }));

  const allWordData: AchievementWordData[] = finalWords.map(w => ({
    word: w.word, score: w.score, timestamp: w.timestamp,
    timeSinceStart: w.timeSinceStart, isValid: w.isValid === true, comboBonus: w.comboBonus,
  }));

  const finalAchievements = calculateFinalAchievements(validWordData, allWordData, actualGameDuration, maxCombo);
  const gameSessionId = crypto.randomUUID();

  // Collect words for validation modal
  const allBotWords = bots.flatMap(bot => {
    const words = botWords[bot.id] || [];
    return words.filter(word => !word.match(/^word\d+$/));
  });

  const playerPendingWords = foundWords
    .filter(w => w.isValid === null)
    .map(w => w.word);

  const combinedWordsForValidation = [...new Set([...allBotWords, ...playerPendingWords])];
  const shuffledWords = combinedWordsForValidation.sort(() => Math.random() - 0.5);
  const botWordsForValidation = shuffledWords.slice(0, 5);

  return {
    playerScore: finalScore,
    playerWords: validWords.map(w => w.word),
    playerWordData: finalWords.map(w => ({
      word: w.word, score: w.isValid ? w.score : 0,
      timestamp: w.timestamp, timeSinceStart: w.timeSinceStart,
      isValid: w.isValid === true,
      comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
      fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
    })),
    gameDuration: actualGameDuration,
    botScores: bots.map(bot => ({
      name: bot.name,
      score: botScores[bot.id] || 0,
      words: botWords[bot.id] || [],
    })),
    grid,
    allPossibleWords: [],
    isNewHighScore: false,
    achievements: finalAchievements,
    botWordsForValidation,
    gameSessionId,
    language,
  };
}

/**
 * Build fallback results when game-end processing fails
 */
export function buildFallbackResults(params: BuildResultsParams): SinglePlayerResultsData {
  const {
    foundWords, grid, bots, botScores, botWords,
    gameStartTime, timerSeconds, mode, language,
  } = params;

  const validWords = foundWords.filter(w => w.isValid === true);
  const fallbackScore = validWords.reduce((sum, w) => sum + w.score, 0);
  const fallbackDuration = mode === 'practice'
    ? Math.max(1, Math.floor((Date.now() - gameStartTime) / 1000))
    : timerSeconds;

  const fallbackSessionId = crypto.randomUUID();
  const fallbackBotWords = bots.flatMap(bot => {
    const words = botWords[bot.id] || [];
    return words.filter(word => !word.match(/^word\d+$/));
  }).slice(0, 5);

  return {
    playerScore: fallbackScore,
    playerWords: validWords.map(w => w.word),
    playerWordData: foundWords.map(w => ({
      word: w.word, score: w.isValid ? w.score : 0,
      timestamp: w.timestamp, timeSinceStart: w.timeSinceStart,
      isValid: w.isValid === true,
      comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
      fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
    })),
    gameDuration: fallbackDuration,
    botScores: bots.map(bot => ({
      name: bot.name,
      score: botScores[bot.id] || 0,
      words: botWords[bot.id] || [],
    })),
    grid,
    allPossibleWords: [],
    isNewHighScore: false,
    achievements: [],
    botWordsForValidation: fallbackBotWords,
    gameSessionId: fallbackSessionId,
    language,
  };
}
