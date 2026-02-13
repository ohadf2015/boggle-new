import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { VocabularyWord } from '@/lib/supabase/education/types';

// XP constants from educationXpManager (for score calculation)
const BLITZ_WORD_FOUND = 10;
const BLITZ_COMBO_BONUS = 3;
const BLITZ_COMPLETION = 40;

interface BlitzGameState {
  currentWord: VocabularyWord | null;
  remainingTime: number;
  combo: number;
  maxCombo: number;
  wordsFound: number;
  wordsAttempted: number;
  isGameOver: boolean;
  isStarted: boolean;
  score: number;
}

interface SubmitAnswerResponse {
  correct: boolean;
}

export interface UseBlitzGameReturn extends BlitzGameState {
  submitAnswer: (input: string) => SubmitAnswerResponse;
  startGame: () => void;
}

/**
 * Fisher-Yates shuffle algorithm
 * Returns a new shuffled array without mutating the original
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * useBlitzGame - Timed blitz practice mode hook
 *
 * Manages 60-second speed round with timer, combo tracking, and score calculation.
 * Uses timestamp-based timing to avoid drift (research pitfall 2).
 *
 * @param words - Vocabulary words to cycle through
 * @param totalTime - Total game time in seconds (default: 60)
 * @returns Game state and control functions
 */
export function useBlitzGame(
  words: VocabularyWord[],
  totalTime: number = 60
): UseBlitzGameReturn {
  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [remainingTime, setRemainingTime] = useState(totalTime);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wordsFound, setWordsFound] = useState(0);
  const [wordsAttempted, setWordsAttempted] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<VocabularyWord[]>([]);

  // Refs for timestamp-based timing (avoid drift)
  const startTimestamp = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Current word
  const currentWord = useMemo(() => {
    if (shuffledWords.length === 0) return null;
    return shuffledWords[currentWordIndex] || null;
  }, [shuffledWords, currentWordIndex]);

  // Score calculation
  const score = useMemo(() => {
    const wordScore = wordsFound * BLITZ_WORD_FOUND;
    const comboScore = maxCombo * BLITZ_COMBO_BONUS;
    const completionBonus = isGameOver ? BLITZ_COMPLETION : 0;
    return wordScore + comboScore + completionBonus;
  }, [wordsFound, maxCombo, isGameOver]);

  /**
   * Start the game
   * Shuffles words and begins timer
   */
  const startGame = useCallback(() => {
    // Only start if not already started
    if (isStarted) return;

    // Shuffle words
    const shuffled = shuffle(words);
    setShuffledWords(shuffled);
    setCurrentWordIndex(0);

    // Reset state
    setCombo(0);
    setMaxCombo(0);
    setWordsFound(0);
    setWordsAttempted(0);
    setIsGameOver(false);
    setRemainingTime(totalTime);

    // Start timer with timestamp approach (avoid drift)
    startTimestamp.current = Date.now();
    setIsStarted(true);
  }, [words, totalTime, isStarted]);

  /**
   * Submit an answer
   * Case-insensitive, trimmed comparison
   */
  const submitAnswer = useCallback(
    (input: string): SubmitAnswerResponse => {
      // Don't accept answers after game over
      if (isGameOver) {
        return { correct: false };
      }

      if (!currentWord) {
        return { correct: false };
      }

      // Normalize input: trim and lowercase
      const normalizedInput = input.trim().toLowerCase();
      const normalizedCorrect = currentWord.word.trim().toLowerCase();

      const correct = normalizedInput === normalizedCorrect;

      // Always count the attempt
      setWordsAttempted((prev) => prev + 1);

      if (correct) {
        // Increment combo and wordsFound
        setCombo((prev) => prev + 1);
        setMaxCombo((prev) => Math.max(prev, combo + 1));
        setWordsFound((prev) => prev + 1);
      } else {
        // Reset combo on incorrect
        setCombo(0);
      }

      // Move to next word
      setCurrentWordIndex((prev) => {
        const nextIndex = prev + 1;
        // Wrap around if we've gone through all words
        if (nextIndex >= shuffledWords.length) {
          // Re-shuffle for variety
          setShuffledWords(shuffle(shuffledWords));
          return 0;
        }
        return nextIndex;
      });

      return { correct };
    },
    [currentWord, shuffledWords, isGameOver, combo]
  );

  /**
   * Timer effect
   * Updates remainingTime based on timestamp (no drift)
   */
  useEffect(() => {
    if (!isStarted || isGameOver) {
      return;
    }

    // Poll every 100ms for smooth updates
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimestamp.current) / 1000);
      const remaining = Math.max(0, totalTime - elapsed);

      setRemainingTime(remaining);

      // Game over when time reaches 0
      if (remaining === 0) {
        setIsGameOver(true);
      }
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isStarted, isGameOver, totalTime]);

  return {
    currentWord,
    remainingTime,
    combo,
    maxCombo,
    wordsFound,
    wordsAttempted,
    isGameOver,
    isStarted,
    score,
    submitAnswer,
    startGame,
  };
}
