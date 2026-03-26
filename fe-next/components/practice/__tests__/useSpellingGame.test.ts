import { renderHook, act } from '@testing-library/react';
import { useSpellingGame } from '../hooks/useSpellingGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

describe('useSpellingGame', () => {
  const mockWords: VocabularyWord[] = [
    { word: 'cat', definition: 'A small pet animal', canIntegrate: true },
    { word: 'elephant', definition: 'A large animal with trunk', canIntegrate: true },
    { word: 'dog', definition: 'A loyal pet', canIntegrate: true },
  ];

  describe('initialization and sorting', () => {
    it('should sort words by length (shortest first)', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // Should be in order: cat (3), dog (3), elephant (8)
      expect(result.current.currentWord?.definition).toBe('A small pet animal'); // cat
      expect(result.current.totalWords).toBe(3);
      expect(result.current.wordIndex).toBe(0);
    });

    it('should initialize with first letter as free hint', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      expect(result.current.currentHint).toBe('c'); // First letter of 'cat'
      expect(result.current.hintsUsed).toBe(0); // Free hint doesn't count
    });

    it('should initialize with zero streak and accuracy', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      expect(result.current.currentStreak).toBe(0);
      expect(result.current.maxStreak).toBe(0);
      expect(result.current.correctCount).toBe(0);
      expect(result.current.attempts).toBe(0);
      expect(result.current.accuracy).toBe(0);
    });

    it('should not be complete initially', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      expect(result.current.isComplete).toBe(false);
    });
  });

  describe('submitAnswer - correct answers', () => {
    it('should accept correct answer (exact match)', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      let response!: { correct: boolean; correctWord: string };
      act(() => {
        response = result.current.submitAnswer('cat');
      });

      expect(response.correct).toBe(true);
      expect(response.correctWord).toBe('cat');
      expect(result.current.correctCount).toBe(1);
      expect(result.current.currentStreak).toBe(1);
      expect(result.current.attempts).toBe(1);
    });

    it('should accept correct answer (case insensitive)', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      let response!: { correct: boolean; correctWord: string };
      act(() => {
        response = result.current.submitAnswer('Cat');
      });

      expect(response.correct).toBe(true);
      expect(result.current.correctCount).toBe(1);
    });

    it('should accept correct answer (with whitespace)', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      let response!: { correct: boolean; correctWord: string };
      act(() => {
        response = result.current.submitAnswer('  cat  ');
      });

      expect(response.correct).toBe(true);
    });

    it('should increment streak on consecutive correct answers', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // First correct
      act(() => {
        result.current.submitAnswer('cat');
      });
      expect(result.current.currentStreak).toBe(1);

      // Wait for auto-advance (1000ms for correct)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.wordIndex).toBe(1);

      // Second correct
      act(() => {
        result.current.submitAnswer('dog');
      });
      expect(result.current.currentStreak).toBe(2);
      expect(result.current.maxStreak).toBe(2);
    });
  });

  describe('submitAnswer - incorrect answers', () => {
    it('should reject incorrect answer', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      let response!: { correct: boolean; correctWord: string };
      act(() => {
        response = result.current.submitAnswer('kat');
      });

      expect(response.correct).toBe(false);
      expect(response.correctWord).toBe('cat');
      expect(result.current.correctCount).toBe(0);
      expect(result.current.attempts).toBe(1);
    });

    it('should reset streak on incorrect answer', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // First correct to build streak
      act(() => {
        result.current.submitAnswer('cat');
      });
      expect(result.current.currentStreak).toBe(1);

      // Wait for auto-advance (1000ms for correct)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.wordIndex).toBe(1);

      // Incorrect answer
      act(() => {
        result.current.submitAnswer('dag');
      });
      expect(result.current.currentStreak).toBe(0); // Reset
      expect(result.current.maxStreak).toBe(1); // Still tracks max
    });

    it('should not accept empty string', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      let response!: { correct: boolean; correctWord: string };
      act(() => {
        response = result.current.submitAnswer('');
      });

      expect(response.correct).toBe(false);
      expect(result.current.attempts).toBe(1);
    });
  });

  describe('hint system', () => {
    it('should reveal next letter on getHint', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // Initial: 'c' (first letter free)
      expect(result.current.currentHint).toBe('c');

      // Get hint
      act(() => {
        result.current.getHint();
      });
      expect(result.current.currentHint).toBe('ca');
      expect(result.current.hintsUsed).toBe(1);

      // Get another hint
      act(() => {
        result.current.getHint();
      });
      expect(result.current.currentHint).toBe('cat');
      expect(result.current.hintsUsed).toBe(2);
    });

    it('should reset streak when using hint (except first)', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // Build streak
      act(() => {
        result.current.submitAnswer('cat');
      });
      expect(result.current.currentStreak).toBe(1);

      // Wait for next word
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Use hint on second word - should reset streak
      act(() => {
        result.current.getHint();
      });
      expect(result.current.currentStreak).toBe(0);
    });

    it('should not reveal beyond word length', () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // Initial: 'c' (first letter free)
      expect(result.current.currentHint).toBe('c');

      // Reveal all letters
      act(() => {
        result.current.getHint(); // ca
      });
      expect(result.current.currentHint).toBe('ca');

      act(() => {
        result.current.getHint(); // cat
      });
      expect(result.current.currentHint).toBe('cat');

      act(() => {
        result.current.getHint(); // Still cat (can't go beyond)
      });
      expect(result.current.currentHint).toBe('cat');
      expect(result.current.hintsUsed).toBe(2); // Only 2 actual hints
    });
  });

  describe('completion', () => {
    it('should complete when all words attempted', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // Answer all words
      act(() => {
        result.current.submitAnswer('cat');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.submitAnswer('dog');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.submitAnswer('elephant');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should be complete
      expect(result.current.isComplete).toBe(true);
    });

    it('should calculate accuracy correctly', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // 2 correct, 1 incorrect
      act(() => {
        result.current.submitAnswer('cat'); // Correct
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        result.current.submitAnswer('dag'); // Incorrect (should be 'dog')
      });
      act(() => {
        vi.advanceTimersByTime(2000); // 2s for incorrect
      });

      act(() => {
        result.current.submitAnswer('elephant'); // Correct
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should be complete
      expect(result.current.isComplete).toBe(true);

      // 2/3 = 66.67%
      expect(result.current.accuracy).toBeCloseTo(0.6667, 2);
      expect(result.current.correctCount).toBe(2);
      expect(result.current.attempts).toBe(3);
    });
  });

  describe('resetGame', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useSpellingGame(mockWords));

      // Make progress
      act(() => {
        result.current.submitAnswer('cat');
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Reset
      act(() => {
        result.current.resetGame();
      });

      // Should be back to start
      expect(result.current.wordIndex).toBe(0);
      expect(result.current.currentStreak).toBe(0);
      expect(result.current.maxStreak).toBe(0);
      expect(result.current.correctCount).toBe(0);
      expect(result.current.attempts).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.currentHint).toBe('c'); // First letter again
    });
  });

  describe('Hebrew word normalization', () => {
    it('should handle Hebrew words with diacritics', () => {
      const hebrewWords: VocabularyWord[] = [
        { word: 'שָׁלוֹם', definition: 'Peace', canIntegrate: true },
      ];

      const { result } = renderHook(() => useSpellingGame(hebrewWords));

      // Submit without diacritics (normalized)
      let response!: { correct: boolean; correctWord: string };
      act(() => {
        response = result.current.submitAnswer('שלום');
      });

      expect(response.correct).toBe(true);
    });
  });
});

// Setup/teardown for timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  vi.useRealTimers();
});
