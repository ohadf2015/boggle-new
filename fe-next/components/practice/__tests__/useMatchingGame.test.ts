import { renderHook, act } from '@testing-library/react';
import { useMatchingGame } from '../hooks/useMatchingGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

describe('useMatchingGame', () => {
  const mockWords: VocabularyWord[] = [
    { word: 'apple', definition: 'a fruit', canIntegrate: true },
    { word: 'car', definition: 'a vehicle', canIntegrate: true },
    { word: 'book', definition: 'for reading', canIntegrate: true },
  ];

  describe('initialization', () => {
    it('should initialize with shuffled columns', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      expect(result.current.wordColumn).toHaveLength(3);
      expect(result.current.definitionColumn).toHaveLength(3);
      expect(result.current.matchedPairs.size).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });

    it('should track attempts and correct count', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      expect(result.current.attempts).toBe(0);
      expect(result.current.correctCount).toBe(0);
    });
  });

  describe('checkMatch', () => {
    it('should return correct: true for valid match', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      let matchResult: { correct: boolean };
      act(() => {
        matchResult = result.current.checkMatch('apple', 'a fruit');
      });

      expect(matchResult!.correct).toBe(true);
      expect(result.current.matchedPairs.has('apple')).toBe(true);
      expect(result.current.attempts).toBe(1);
      expect(result.current.correctCount).toBe(1);
    });

    it('should return correct: false for invalid match', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      let matchResult: { correct: boolean };
      act(() => {
        matchResult = result.current.checkMatch('apple', 'a vehicle');
      });

      expect(matchResult!.correct).toBe(false);
      expect(result.current.matchedPairs.has('apple')).toBe(false);
      expect(result.current.attempts).toBe(1);
      expect(result.current.correctCount).toBe(0);
    });

    it('should not allow matching already matched pairs', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      act(() => {
        result.current.checkMatch('apple', 'a fruit');
      });

      const initialAttempts = result.current.attempts;

      act(() => {
        result.current.checkMatch('apple', 'a fruit');
      });

      // Attempts should not increment for already matched word
      expect(result.current.attempts).toBe(initialAttempts);
    });
  });

  describe('completion', () => {
    it('should set isComplete when all pairs matched', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      act(() => {
        result.current.checkMatch('apple', 'a fruit');
        result.current.checkMatch('car', 'a vehicle');
        result.current.checkMatch('book', 'for reading');
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.matchedPairs.size).toBe(3);
    });

    it('should calculate accuracy correctly', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      act(() => {
        result.current.checkMatch('apple', 'a vehicle'); // wrong
        result.current.checkMatch('apple', 'a fruit'); // correct
        result.current.checkMatch('car', 'a vehicle'); // correct
        result.current.checkMatch('book', 'for reading'); // correct
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.accuracy).toBe(0.75); // 3 correct / 4 attempts
    });

    it('should have 100% accuracy with all correct on first try', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      act(() => {
        result.current.checkMatch('apple', 'a fruit');
        result.current.checkMatch('car', 'a vehicle');
        result.current.checkMatch('book', 'for reading');
      });

      expect(result.current.accuracy).toBe(1.0); // 3 correct / 3 attempts
    });
  });

  describe('resetGame', () => {
    it('should reset all state and reshuffle', () => {
      const { result } = renderHook(() => useMatchingGame(mockWords));

      act(() => {
        result.current.checkMatch('apple', 'a fruit');
        result.current.checkMatch('car', 'a vehicle');
      });

      expect(result.current.matchedPairs.size).toBe(2);
      expect(result.current.attempts).toBe(2);

      act(() => {
        result.current.resetGame();
      });

      expect(result.current.matchedPairs.size).toBe(0);
      expect(result.current.attempts).toBe(0);
      expect(result.current.correctCount).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.wordColumn).toHaveLength(3);
      expect(result.current.definitionColumn).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty words array', () => {
      const { result } = renderHook(() => useMatchingGame([]));

      expect(result.current.wordColumn).toHaveLength(0);
      expect(result.current.definitionColumn).toHaveLength(0);
      expect(result.current.isComplete).toBe(true); // no pairs to match
    });

    it('should handle words without definitions', () => {
      const wordsWithoutDef: VocabularyWord[] = [
        { word: 'test', canIntegrate: true },
      ];

      const { result } = renderHook(() => useMatchingGame(wordsWithoutDef));

      expect(result.current.wordColumn).toHaveLength(1);
      expect(result.current.definitionColumn).toHaveLength(1);

      // Should use empty string as definition
      const def = result.current.definitionColumn[0];
      expect(def.text).toBe('');
    });
  });
});
