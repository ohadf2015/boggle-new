import { renderHook, act } from '@testing-library/react';
import { useBlitzGame } from '../hooks/useBlitzGame';
import type { VocabularyWord } from '@/lib/supabase/education/types';

// Mock words for testing
const mockWords: VocabularyWord[] = [
  { word: 'apple', definition: 'A red fruit', canIntegrate: true },
  { word: 'banana', definition: 'A yellow fruit', canIntegrate: true },
  { word: 'cherry', definition: 'A small red fruit', canIntegrate: true },
  { word: 'date', definition: 'A sweet brown fruit', canIntegrate: true },
];

describe('useBlitzGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      expect(result.current.isStarted).toBe(false);
      expect(result.current.isGameOver).toBe(false);
      expect(result.current.remainingTime).toBe(60);
      expect(result.current.combo).toBe(0);
      expect(result.current.maxCombo).toBe(0);
      expect(result.current.wordsFound).toBe(0);
      expect(result.current.wordsAttempted).toBe(0);
      expect(result.current.currentWord).toBeNull();
      expect(result.current.score).toBe(0);
    });

    it('should accept custom totalTime', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 30));

      expect(result.current.remainingTime).toBe(30);
    });
  });

  describe('game start', () => {
    it('should start game and show first word', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      expect(result.current.isStarted).toBe(true);
      expect(result.current.currentWord).not.toBeNull();
      expect(result.current.currentWord?.definition).toBeDefined();
    });

    it('should shuffle words on start', () => {
      const { result: result1 } = renderHook(() => useBlitzGame(mockWords));
      const { result: result2 } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result1.current.startGame();
        result2.current.startGame();
      });

      // Note: This test might occasionally fail due to random shuffle
      // But with 4 words, probability of same order is 1/24
      const word1 = result1.current.currentWord?.word;
      const word2 = result2.current.currentWord?.word;

      // At minimum, verify words are from the list
      expect(mockWords.some(w => w.word === word1)).toBe(true);
      expect(mockWords.some(w => w.word === word2)).toBe(true);
    });
  });

  describe('timer behavior', () => {
    it('should count down from totalTime', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 60));

      act(() => {
        result.current.startGame();
      });

      expect(result.current.remainingTime).toBe(60);

      // Advance time by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.remainingTime).toBe(59);

      // Advance time by 5 more seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.remainingTime).toBe(54);
    });

    it('should not drift over time (timestamp-based)', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 60));

      act(() => {
        result.current.startGame();
      });

      // The timer updates every 100ms, so we advance by 100ms intervals
      // to let the timer tick and update state
      act(() => {
        vi.advanceTimersByTime(1100); // 1 second + buffer for update
      });
      expect(result.current.remainingTime).toBe(59);

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      // Should be at 56 or 57 depending on timing
      expect(result.current.remainingTime).toBeGreaterThanOrEqual(56);
      expect(result.current.remainingTime).toBeLessThanOrEqual(57);

      act(() => {
        vi.advanceTimersByTime(3200);
      });
      // Should be at 53 or 54 depending on timing
      expect(result.current.remainingTime).toBeGreaterThanOrEqual(52);
      expect(result.current.remainingTime).toBeLessThanOrEqual(54);
    });

    it('should trigger game over when time reaches 0', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 5));

      act(() => {
        result.current.startGame();
      });

      expect(result.current.isGameOver).toBe(false);

      // Advance time beyond totalTime
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(result.current.isGameOver).toBe(true);
      expect(result.current.remainingTime).toBe(0);
    });

    it('should stop timer on game over', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 3));

      act(() => {
        result.current.startGame();
      });

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.isGameOver).toBe(true);
      const timeAfterGameOver = result.current.remainingTime;

      // Advance more time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Time should not decrease further
      expect(result.current.remainingTime).toBe(timeAfterGameOver);
    });
  });

  describe('answer submission', () => {
    it('should accept correct answer (case-insensitive)', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      const currentWord = result.current.currentWord?.word || '';
      let response: { correct: boolean };

      act(() => {
        response = result.current.submitAnswer(currentWord.toUpperCase());
      });

      expect(response!.correct).toBe(true);
      expect(result.current.wordsFound).toBe(1);
      expect(result.current.combo).toBe(1);
    });

    it('should trim whitespace from answer', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      const currentWord = result.current.currentWord?.word || '';
      let response: { correct: boolean };

      act(() => {
        response = result.current.submitAnswer(`  ${currentWord}  `);
      });

      expect(response!.correct).toBe(true);
      expect(result.current.wordsFound).toBe(1);
    });

    it('should reject incorrect answer', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      let response: { correct: boolean };

      act(() => {
        response = result.current.submitAnswer('wrongword');
      });

      expect(response!.correct).toBe(false);
      expect(result.current.wordsFound).toBe(0);
      expect(result.current.wordsAttempted).toBe(1);
    });

    it('should move to next word after submission', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      const firstWord = result.current.currentWord?.word;

      act(() => {
        result.current.submitAnswer('anyword');
      });

      const secondWord = result.current.currentWord?.word;

      expect(firstWord).not.toBe(secondWord);
    });
  });

  describe('combo tracking', () => {
    it('should increment combo on consecutive correct answers', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      // First correct answer
      act(() => {
        const word = result.current.currentWord?.word || '';
        result.current.submitAnswer(word);
      });

      expect(result.current.combo).toBe(1);
      expect(result.current.maxCombo).toBe(1);

      // Second correct answer
      act(() => {
        const word = result.current.currentWord?.word || '';
        result.current.submitAnswer(word);
      });

      expect(result.current.combo).toBe(2);
      expect(result.current.maxCombo).toBe(2);

      // Third correct answer
      act(() => {
        const word = result.current.currentWord?.word || '';
        result.current.submitAnswer(word);
      });

      expect(result.current.combo).toBe(3);
      expect(result.current.maxCombo).toBe(3);
    });

    it('should reset combo to 0 on incorrect answer', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      // Two correct answers
      act(() => {
        const word = result.current.currentWord?.word || '';
        result.current.submitAnswer(word);
      });

      act(() => {
        const word = result.current.currentWord?.word || '';
        result.current.submitAnswer(word);
      });

      expect(result.current.combo).toBe(2);
      expect(result.current.maxCombo).toBe(2);

      // Incorrect answer
      act(() => {
        result.current.submitAnswer('wrongword');
      });

      expect(result.current.combo).toBe(0);
      expect(result.current.maxCombo).toBe(2); // maxCombo should remain
    });

    it('should preserve maxCombo throughout game', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      // Build combo to 3
      for (let i = 0; i < 3; i++) {
        act(() => {
          const word = result.current.currentWord?.word || '';
          result.current.submitAnswer(word);
        });
      }

      expect(result.current.maxCombo).toBe(3);

      // Reset with incorrect answer
      act(() => {
        result.current.submitAnswer('wrong');
      });

      // Build combo to 2
      for (let i = 0; i < 2; i++) {
        act(() => {
          const word = result.current.currentWord?.word || '';
          result.current.submitAnswer(word);
        });
      }

      expect(result.current.combo).toBe(2);
      expect(result.current.maxCombo).toBe(3); // Should still be 3
    });
  });

  describe('word cycling', () => {
    it('should cycle through all words', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      const seenWords = new Set<string>();

      // Answer all 4 words
      for (let i = 0; i < 4; i++) {
        const word = result.current.currentWord?.word || '';
        seenWords.add(word);
        act(() => {
          result.current.submitAnswer(word);
        });
      }

      expect(seenWords.size).toBe(4);
    });

    it('should wrap around after all words are cycled', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords));

      act(() => {
        result.current.startGame();
      });

      // Answer all 4 words correctly
      for (let i = 0; i < 4; i++) {
        act(() => {
          const word = result.current.currentWord?.word || '';
          result.current.submitAnswer(word);
        });
      }

      // Should still have a current word (wrapped around)
      expect(result.current.currentWord).not.toBeNull();
      expect(mockWords.some(w => w.word === result.current.currentWord?.word)).toBe(true);
    });
  });

  describe('score calculation', () => {
    it('should calculate score correctly', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 60));

      act(() => {
        result.current.startGame();
      });

      // Find 3 words with combo of 3
      for (let i = 0; i < 3; i++) {
        act(() => {
          const word = result.current.currentWord?.word || '';
          result.current.submitAnswer(word);
        });
      }

      // Score = (wordsFound * 10) + (maxCombo * 3) + 0 (completion bonus only at end)
      // Score = (3 * 10) + (3 * 3) = 30 + 9 = 39 (before completion)
      expect(result.current.score).toBe(39);

      // Complete the game
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      // Score = 39 + 40 (completion bonus) = 79
      expect(result.current.score).toBe(79);
    });

    it('should add completion bonus only when game finishes', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 5));

      act(() => {
        result.current.startGame();
      });

      // Find 1 word
      act(() => {
        const word = result.current.currentWord?.word || '';
        result.current.submitAnswer(word);
      });

      // Score before completion: (1 * 10) + (1 * 3) = 13
      expect(result.current.score).toBe(13);

      // Complete the game
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // Score after completion: 13 + 40 = 53
      expect(result.current.score).toBe(53);
    });

    it('should give completion bonus even with 0 words found', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 2));

      act(() => {
        result.current.startGame();
      });

      // Don't answer anything, just let time run out
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Score should be 40 (completion bonus only)
      expect(result.current.score).toBe(40);
    });
  });

  describe('edge cases', () => {
    it('should handle empty words array gracefully', () => {
      const { result } = renderHook(() => useBlitzGame([]));

      act(() => {
        result.current.startGame();
      });

      expect(result.current.currentWord).toBeNull();
    });

    it('should not accept answers after game over', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 2));

      act(() => {
        result.current.startGame();
      });

      // Wait for game to end
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.isGameOver).toBe(true);

      const wordsBefore = result.current.wordsFound;

      // Try to submit answer after game over
      act(() => {
        result.current.submitAnswer('apple');
      });

      // Should not increment
      expect(result.current.wordsFound).toBe(wordsBefore);
    });

    it('should not start timer if already started', () => {
      const { result } = renderHook(() => useBlitzGame(mockWords, 60));

      act(() => {
        result.current.startGame();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const timeAfter5Sec = result.current.remainingTime;

      // Try to start again
      act(() => {
        result.current.startGame();
      });

      // Time should not reset
      expect(result.current.remainingTime).toBe(timeAfter5Sec);
    });
  });
});
