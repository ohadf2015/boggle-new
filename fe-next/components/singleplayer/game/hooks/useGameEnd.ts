'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { trackGameEnd } from '@/utils/growthTracking';
import { safeRandomUUID } from '@/lib/safeRandomUUID';
import {
  calculateFinalAchievements,
  type WordData as AchievementWordData,
} from '@/utils/singlePlayerAchievements';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { SinglePlayerResultsData, BotOpponent } from '../../SinglePlayerView';

interface FoundWord {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean | null;
  comboBonus?: number;
  fireRoundBonus?: number;
}

interface UseGameEndOptions {
  /** Whether the game is over */
  isGameOver: boolean;
  /** Game settings */
  settings: {
    mode: string;
    language: Language;
    timerSeconds: number;
    bots: BotOpponent[];
  };
  /** Max combo achieved */
  maxCombo: number;
  /** Game start time for calculating actual duration */
  gameStartTime: number;
  /** Ref to found words for processing */
  foundWordsRef: React.MutableRefObject<FoundWord[]>;
  /** Ref to current grid */
  gridRef: React.MutableRefObject<LetterGrid | null>;
  /** Ref to bot scores */
  botScoresRef: React.MutableRefObject<Record<string, number>>;
  /** Ref to bot words */
  botWordsRef: React.MutableRefObject<Record<string, string[]>>;
  /** Callback when game ends with results */
  onGameEnd: (results: SinglePlayerResultsData) => void;
  /** Optional training finish callback */
  onTrainingFinish?: () => void;
}

interface UseGameEndReturn {
  /** Whether words are being validated */
  isValidatingWords: boolean;
  /** Ref to track if game over has been called */
  gameOverCalledRef: React.MutableRefObject<boolean>;
  /** Trigger game over */
  triggerGameOver: () => void;
}

/**
 * Hook to handle game end logic
 * Validates words, calculates achievements, and prepares results
 */
export function useGameEnd({
  isGameOver,
  settings,
  maxCombo,
  gameStartTime,
  foundWordsRef,
  gridRef,
  botScoresRef,
  botWordsRef,
  onGameEnd,
  onTrainingFinish,
}: UseGameEndOptions): UseGameEndReturn {
  const [isValidatingWords, setIsValidatingWords] = useState(false);
  const gameOverCalledRef = useRef(false);
  const onGameEndRef = useRef(onGameEnd);

  // Keep onGameEnd ref in sync
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  // Handle game over when isGameOver becomes true
  useEffect(() => {
    if (!isGameOver || gameOverCalledRef.current || !gridRef.current) return;

    gameOverCalledRef.current = true;

    const finalizeAndEndGame = (): void => {
      const currentWords = foundWordsRef.current;

      // No AI validation - treat pending words (isValid: null) as invalid
      // Words are already validated during gameplay, pending ones are uncertain
      const finalWords = currentWords.map(w => ({
        ...w,
        isValid: w.isValid === true, // null or false becomes false
      }));

      // Calculate final score from validated words only
      const validWords = finalWords.filter(w => w.isValid === true);
      const finalScore = validWords.reduce((sum, w) => sum + w.score, 0);

      // For practice mode, use actual elapsed time
      const actualGameDuration = settings.mode === 'practice'
        ? Math.max(1, Math.floor((Date.now() - gameStartTime) / 1000))
        : settings.timerSeconds;

      // Convert to achievement word data format
      const validWordData: AchievementWordData[] = validWords.map(w => ({
        word: w.word,
        score: w.score,
        timestamp: w.timestamp,
        timeSinceStart: w.timeSinceStart,
        isValid: true,
        comboBonus: w.comboBonus,
      }));

      const allWordData: AchievementWordData[] = finalWords.map(w => ({
        word: w.word,
        score: w.score,
        timestamp: w.timestamp,
        timeSinceStart: w.timeSinceStart,
        isValid: w.isValid === true,
        comboBonus: w.comboBonus,
      }));

      // Calculate final achievements
      const finalAchievements = calculateFinalAchievements(
        validWordData,
        allWordData,
        actualGameDuration,
        maxCombo
      );

      // Generate unique session ID for vote tracking
      const gameSessionId = safeRandomUUID();

      // Collect words for validation modal (community dictionary building)
      const allBotWords = settings.bots.flatMap(bot => {
        const words = botWordsRef.current[bot.id] || [];
        return words.filter(word => !word.match(/^word\d+$/));
      });

      const playerPendingWords = currentWords
        .filter(w => w.isValid === null)
        .map(w => w.word);

      const combinedWordsForValidation = [...new Set([...allBotWords, ...playerPendingWords])];
      const shuffledWords = combinedWordsForValidation.sort(() => Math.random() - 0.5);
      const botWordsForValidation = shuffledWords.slice(0, 5);

      const results: SinglePlayerResultsData = {
        playerScore: finalScore,
        playerWords: validWords.map(w => w.word),
        playerWordData: finalWords.map(w => ({
          word: w.word,
          score: w.isValid ? w.score : 0,
          timestamp: w.timestamp,
          timeSinceStart: w.timeSinceStart,
          isValid: w.isValid === true,
          comboBonus: w.isValid ? (w.comboBonus || 0) : 0,
          fireRoundBonus: w.isValid ? (w.fireRoundBonus || 0) : 0,
        })),
        gameDuration: actualGameDuration,
        botScores: settings.bots.map(bot => ({
          name: bot.name,
          score: botScoresRef.current[bot.id] || 0,
          words: botWordsRef.current[bot.id] || [],
        })),
        grid: gridRef.current!,
        allPossibleWords: [],
        isNewHighScore: false,
        achievements: finalAchievements,
        botWordsForValidation,
        gameSessionId,
        language: settings.language,
      };

      const maxBotScore = settings.bots.reduce(
        (max, bot) => Math.max(max, botScoresRef.current[bot.id] || 0),
        0
      );
      const isWinner = finalScore > maxBotScore;

      trackGameEnd(
        'singleplayer',
        finalScore,
        validWords.length,
        true,
        actualGameDuration,
        { isWinner, subMode: settings.mode }
      );

      // Mark training session as complete if in practice mode
      if (settings.mode === 'practice') {
        onTrainingFinish?.();
      }

      // Call onGameEnd callback
      onGameEndRef.current(results);
    };

    finalizeAndEndGame();
  }, [
    isGameOver,
    settings.bots,
    settings.language,
    settings.timerSeconds,
    settings.mode,
    maxCombo,
    gameStartTime,
    foundWordsRef,
    gridRef,
    botScoresRef,
    botWordsRef,
    onTrainingFinish,
  ]);

  const triggerGameOver = useCallback(() => {
    // This is called externally to trigger game over
    // The actual game over is handled by setting isGameOver in parent
  }, []);

  return {
    isValidatingWords,
    gameOverCalledRef,
    triggerGameOver,
  };
}
