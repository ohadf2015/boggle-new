import { useState, useMemo, useCallback } from 'react';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export interface MatchingItem {
  id: string;
  text: string;
}

export interface MatchingGameState {
  wordColumn: MatchingItem[];
  definitionColumn: MatchingItem[];
  matchedPairs: Map<string, string>;
  attempts: number;
  correctCount: number;
  isComplete: boolean;
  accuracy: number;
  checkMatch: (wordId: string, definitionId: string) => { correct: boolean };
  resetGame: () => void;
}

/**
 * Hook for managing word matching game state
 * Handles shuffling, matching logic, accuracy tracking, and completion detection
 */
export function useMatchingGame(words: VocabularyWord[]): MatchingGameState {
  // Create mapping of word -> definition for validation
  const wordDefinitionMap = useMemo(() => {
    const map = new Map<string, string>();
    words.forEach((w) => {
      map.set(w.word, w.definition || '');
    });
    return map;
  }, [words]);

  // Shuffle helper
  const shuffle = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Initialize columns with shuffled items
  const [wordColumn, setWordColumn] = useState<MatchingItem[]>(() =>
    shuffle(
      words.map((w) => ({
        id: w.word,
        text: w.word,
      }))
    )
  );

  const [definitionColumn, setDefinitionColumn] = useState<MatchingItem[]>(() =>
    shuffle(
      words.map((w) => ({
        id: w.word, // Use word as ID to match with word column
        text: w.definition || '',
      }))
    )
  );

  const [matchedPairs, setMatchedPairs] = useState<Map<string, string>>(new Map());
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Check if game is complete
  const isComplete = useMemo(() => {
    if (words.length === 0) return true;
    return matchedPairs.size === words.length;
  }, [matchedPairs.size, words.length]);

  // Calculate accuracy
  const accuracy = useMemo(() => {
    if (attempts === 0) return 0;
    return correctCount / attempts;
  }, [attempts, correctCount]);

  // Check if a word-definition pair matches
  const checkMatch = useCallback(
    (wordId: string, definitionText: string): { correct: boolean } => {
      // Don't allow re-matching already matched words
      if (matchedPairs.has(wordId)) {
        return { correct: false };
      }

      const correctDefinition = wordDefinitionMap.get(wordId);
      const isCorrect = correctDefinition === definitionText;

      setAttempts((prev) => prev + 1);

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setMatchedPairs((prev) => {
          const newMap = new Map(prev);
          newMap.set(wordId, definitionText);
          return newMap;
        });
      }

      return { correct: isCorrect };
    },
    [matchedPairs, wordDefinitionMap]
  );

  // Reset game state and reshuffle
  const resetGame = useCallback(() => {
    setWordColumn(
      shuffle(
        words.map((w) => ({
          id: w.word,
          text: w.word,
        }))
      )
    );
    setDefinitionColumn(
      shuffle(
        words.map((w) => ({
          id: w.word,
          text: w.definition || '',
        }))
      )
    );
    setMatchedPairs(new Map());
    setAttempts(0);
    setCorrectCount(0);
  }, [words, shuffle]);

  return {
    wordColumn,
    definitionColumn,
    matchedPairs,
    attempts,
    correctCount,
    isComplete,
    accuracy,
    checkMatch,
    resetGame,
  };
}
