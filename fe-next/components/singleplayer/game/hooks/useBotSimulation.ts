'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateWordScoreByLength as canonicalWordScoreByLength } from '@/shared/utils/scoring';
import { applyCalmBotPacing } from '@/lib/cosy/cosyGameplay';
import type { BotOpponent } from '../../../singleplayer/SinglePlayerView';

type Difficulty = 'easy' | 'medium' | 'hard';

interface AvailableWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface UseBotSimulationOptions {
  /** Game mode - only runs for 'solo-bots' */
  mode: string;
  /** Bot opponents configuration */
  bots: BotOpponent[];
  /** Whether game is paused */
  isPaused: boolean;
  /** Whether game is over */
  isGameOver: boolean;
  /** Available words from grid solver */
  availableWords: AvailableWords | null;
  /**
   * Cozy / Calm Mode: stretch bot think-time so the player is never chased.
   * Reward-neutral — bot scores never feed the player's progression.
   */
  calmPacing?: boolean;
}

interface UseBotSimulationReturn {
  /** Current bot scores by bot ID */
  botScores: Record<string, number>;
  /** Words found by each bot */
  botWords: Record<string, string[]>;
  /** Reset bot state for new game */
  resetBots: () => void;
  /** Initialize bot used words (for game start) */
  initializeBotUsedWords: (bots: BotOpponent[]) => void;
}

/**
 * Hook to manage bot simulation in single-player mode
 * Handles bot word finding intervals and scoring
 */
export function useBotSimulation({
  mode,
  bots,
  isPaused,
  isGameOver,
  availableWords,
  calmPacing = false,
}: UseBotSimulationOptions): UseBotSimulationReturn {
  // Bot state
  const [botScores, setBotScores] = useState<Record<string, number>>({});
  const [botWords, setBotWords] = useState<Record<string, string[]>>({});

  // Refs for bot simulation
  const botIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const botIntervalsDataRef = useRef<Map<string, number>>(new Map());
  const botUsedWordsRef = useRef<Record<string, Set<string>>>({});
  const availableWordsRef = useRef(availableWords);

  // Keep availableWordsRef in sync
  useEffect(() => {
    availableWordsRef.current = availableWords;
  }, [availableWords]);

  /**
   * Get interval duration for bot word finding based on difficulty
   * Caches intervals per bot to maintain consistency during game
   */
  const getBotInterval = useCallback((difficulty: Difficulty, botId: string): number => {
    // Check cache first
    const cached = botIntervalsDataRef.current.get(botId);
    if (cached) return cached;

    // Base intervals: easy bots are slower, hard bots are faster
    const baseIntervals: Record<Difficulty, number> = {
      easy: 5000,   // 5 seconds base
      medium: 3000, // 3 seconds base
      hard: 1800,   // 1.8 seconds base
    };

    // Add randomness to make bots feel more natural
    const randomFactors: Record<Difficulty, number> = {
      easy: 3000,   // +0-3s random
      medium: 2000, // +0-2s random
      hard: 1200,   // +0-1.2s random
    };

    const rawInterval = baseIntervals[difficulty] + Math.random() * randomFactors[difficulty];
    const interval = applyCalmBotPacing(rawInterval, calmPacing);
    botIntervalsDataRef.current.set(botId, interval);
    return interval;
  }, [calmPacing]);

  /**
   * Simulate a bot finding a word
   * Uses real words from grid solver when available, falls back to simulated scores
   */
  const simulateBotFindWord = useCallback((bot: BotOpponent) => {
    // Simple scoring for bots: word length - 1 (no fire round multiplier, no combos)
    const getBotWordScore = (wordOrLength: string | number): number => {
      const len = typeof wordOrLength === 'string' ? wordOrLength.length : wordOrLength;
      return canonicalWordScoreByLength(len);
    };

    // Use ref to get current availableWords (avoids stale closure)
    const currentAvailableWords = availableWordsRef.current;

    // Try to use real words from the grid solver
    if (currentAvailableWords) {
      // Get words for this bot's difficulty
      const wordPool = currentAvailableWords[bot.difficulty] || [];
      const usedWords = botUsedWordsRef.current[bot.id] || new Set();

      // Find an unused word
      const unusedWords = wordPool.filter(w => !usedWords.has(w));

      if (unusedWords.length > 0) {
        // Pick a random unused word
        const word = unusedWords[Math.floor(Math.random() * unusedWords.length)];
        const wordScore = getBotWordScore(word.length);

        // Mark word as used by this bot
        usedWords.add(word);
        botUsedWordsRef.current[bot.id] = usedWords;

        setBotScores(prev => ({
          ...prev,
          [bot.id]: (prev[bot.id] || 0) + wordScore,
        }));

        setBotWords(prev => ({
          ...prev,
          [bot.id]: [...(prev[bot.id] || []), word],
        }));
        return;
      }
    }

    // Fallback: simulate with random word lengths if no words available
    const wordLengths: Record<Difficulty, number[]> = {
      easy: [3, 4, 4, 5],
      medium: [4, 5, 5, 6, 7],
      hard: [5, 6, 6, 7, 7, 8],
    };
    const lengths = wordLengths[bot.difficulty];
    const length = lengths[Math.floor(Math.random() * lengths.length)];
    const wordScore = getBotWordScore(length);

    setBotScores(prev => ({
      ...prev,
      [bot.id]: (prev[bot.id] || 0) + wordScore,
    }));

    setBotWords(prev => ({
      ...prev,
      [bot.id]: [...(prev[bot.id] || []), `word${length}`],
    }));
  }, []);

  /**
   * Reset bot state for new game
   */
  const resetBots = useCallback(() => {
    setBotScores({});
    setBotWords({});
    botUsedWordsRef.current = {};
    botIntervalsDataRef.current.clear();
    botIntervalsRef.current.forEach(clearInterval);
    botIntervalsRef.current = [];
  }, []);

  /**
   * Initialize bot used words tracking
   */
  const initializeBotUsedWords = useCallback((botsToInit: BotOpponent[]) => {
    const initialBotUsedWords: Record<string, Set<string>> = {};
    botsToInit.forEach(bot => {
      initialBotUsedWords[bot.id] = new Set();
    });
    botUsedWordsRef.current = initialBotUsedWords;
  }, []);

  // Bot simulation effect - runs when game is active with bots
  useEffect(() => {
    if (mode !== 'solo-bots' || isPaused || bots.length === 0 || isGameOver) return;
    // Wait for availableWords to be fetched before starting bot simulation
    if (!availableWords) return;

    // Clear cached intervals for fresh game
    botIntervalsDataRef.current.clear();

    bots.forEach(bot => {
      const interval = getBotInterval(bot.difficulty, bot.id);
      const botInterval = setInterval(() => {
        if (!isPaused) {
          simulateBotFindWord(bot);
        }
      }, interval);
      botIntervalsRef.current.push(botInterval);
    });

    return () => {
      botIntervalsRef.current.forEach(clearInterval);
      botIntervalsRef.current = [];
    };
  }, [mode, bots, isPaused, isGameOver, availableWords, getBotInterval, simulateBotFindWord]);

  return {
    botScores,
    botWords,
    resetBots,
    initializeBotUsedWords,
  };
}
