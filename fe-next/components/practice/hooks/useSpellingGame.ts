'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { normalizeForStorage, type VocabularyWord } from '@/lib/supabase/education/types';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface WordProgress {
  word: string;
  correct: boolean;
  hintsUsed: number;
  timeTaken: number;
}

export interface UseSpellingGameReturn {
  // Current word state
  currentWord: { definition: string } | null;
  wordIndex: number;
  totalWords: number;

  // Hint system
  currentHint: string;
  hintsUsed: number;
  getHint: () => void;

  // Answer submission
  submitAnswer: (input: string) => { correct: boolean; correctWord: string };

  // Game progress
  currentStreak: number;
  maxStreak: number;
  correctCount: number;
  attempts: number;
  accuracy: number;
  isComplete: boolean;

  // Reset
  resetGame: () => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Hook for managing spelling challenge game state
 *
 * Features:
 * - Progressive difficulty (sorts words by length)
 * - Hint system with first letter free
 * - Streak tracking
 * - Auto-advance after answers
 * - Hebrew normalization support
 */
export function useSpellingGame(words: VocabularyWord[]): UseSpellingGameReturn {
  // Sort words by length for progressive difficulty
  const sortedWords = useRef<VocabularyWord[]>(
    [...words].sort((a, b) => a.word.length - b.word.length)
  );

  // Game state
  const [wordIndex, setWordIndex] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Hint state (first letter always shown)
  const [currentHintIndex, setCurrentHintIndex] = useState(1);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Progress tracking
  const wordProgress = useRef<WordProgress[]>([]);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Current word
  const currentWord = sortedWords.current[wordIndex];
  const currentHint = currentWord ? currentWord.word.substring(0, currentHintIndex) : '';

  // Calculate accuracy
  const accuracy = attempts > 0 ? correctCount / attempts : 0;

  /**
   * Get next hint (reveal one more letter)
   */
  const getHint = useCallback(() => {
    if (!currentWord) return;

    const newHintIndex = Math.min(currentHintIndex + 1, currentWord.word.length);
    setCurrentHintIndex(newHintIndex);

    // Only count as hint if we actually revealed a new letter
    if (newHintIndex > currentHintIndex) {
      setHintsUsed(prev => prev + 1);
      // Reset streak when using hints (except the first free letter)
      setCurrentStreak(0);
    }
  }, [currentWord, currentHintIndex]);

  /**
   * Submit answer and check correctness
   */
  const submitAnswer = useCallback((input: string): { correct: boolean; correctWord: string } => {
    if (!currentWord) {
      return { correct: false, correctWord: '' };
    }

    // Normalize both input and correct answer
    const normalizedInput = normalizeForStorage(input.trim());
    const normalizedCorrect = normalizeForStorage(currentWord.word);

    const isCorrect = normalizedInput === normalizedCorrect && input.trim() !== '';

    // Update stats
    setAttempts(prev => prev + 1);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setCurrentStreak(prev => {
        const newStreak = prev + 1;
        setMaxStreak(current => Math.max(current, newStreak));
        return newStreak;
      });
    } else {
      setCurrentStreak(0);
    }

    // Track word progress
    wordProgress.current[wordIndex] = {
      word: currentWord.word,
      correct: isCorrect,
      hintsUsed,
      timeTaken: 0, // TODO: track time
    };

    // Auto-advance after delay
    const delay = isCorrect ? 1000 : 2000; // 1s for correct, 2s for incorrect
    advanceTimeoutRef.current = setTimeout(() => {
      const nextIndex = wordIndex + 1;
      if (nextIndex < sortedWords.current.length) {
        setWordIndex(nextIndex);
        setCurrentHintIndex(1); // Reset to first letter
        setHintsUsed(0); // Reset hints counter
      } else {
        setIsComplete(true);
      }
    }, delay);

    return {
      correct: isCorrect,
      correctWord: currentWord.word,
    };
  }, [currentWord, wordIndex, hintsUsed]);

  /**
   * Reset game to initial state
   */
  const resetGame = useCallback(() => {
    setWordIndex(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setAttempts(0);
    setIsComplete(false);
    setCurrentHintIndex(1);
    setHintsUsed(0);
    wordProgress.current = [];

    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentWord: currentWord ? { definition: currentWord.definition || '' } : null,
    wordIndex,
    totalWords: sortedWords.current.length,
    currentHint,
    hintsUsed,
    getHint,
    submitAnswer,
    currentStreak,
    maxStreak,
    correctCount,
    attempts,
    accuracy,
    isComplete,
    resetGame,
  };
}
