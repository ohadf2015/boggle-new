import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameEnd } from '../useGameEnd';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BotOpponent } from '../../../SinglePlayerView';

// Mock external dependencies
vi.mock('@/utils/singlePlayerAchievements', () => ({
  calculateFinalAchievements: vi.fn(),
}));

import { calculateFinalAchievements } from '@/utils/singlePlayerAchievements';

const mockCalculateFinalAchievements = calculateFinalAchievements as any;

describe('useGameEnd', () => {
  const mockGrid: LetterGrid = [
    ['T', 'E', 'S', 'T', 'S'],
    ['W', 'O', 'R', 'D', 'S'],
    ['H', 'E', 'L', 'L', 'O'],
    ['W', 'O', 'R', 'L', 'D'],
    ['A', 'B', 'C', 'D', 'E'],
  ];

  const mockBots: BotOpponent[] = [
    { id: 'bot1', name: 'Bot 1', difficulty: 'medium', score: 0, wordsFound: [] },
    { id: 'bot2', name: 'Bot 2', difficulty: 'hard', score: 0, wordsFound: [] },
  ];

  const mockFoundWords = [
    { word: 'test', score: 3, timestamp: Date.now() - 5000, timeSinceStart: 5, isValid: true, comboBonus: 0 },
    { word: 'word', score: 3, timestamp: Date.now() - 3000, timeSinceStart: 7, isValid: true, comboBonus: 1 },
    { word: 'invalid', score: 5, timestamp: Date.now() - 1000, timeSinceStart: 9, isValid: null },
  ];

  const mockAchievements = {
    wordsPerMinute: 5,
    longestWord: 'test',
    highestScoringWord: { word: 'test', score: 10 },
  };

  // Create refs
  function createRefs() {
    return {
      foundWordsRef: { current: mockFoundWords },
      gridRef: { current: mockGrid },
      botScoresRef: { current: { bot1: 50, bot2: 75 } },
      botWordsRef: { current: { bot1: ['hello', 'world'], bot2: ['testing'] } },
    };
  }

  function createDefaultOptions(overrides: Partial<Parameters<typeof useGameEnd>[0]> = {}) {
    const refs = createRefs();
    return {
      isGameOver: false,
      settings: {
        mode: 'solo-bots',
        language: 'en' as Language,
        timerSeconds: 120,
        bots: mockBots,
      },
      maxCombo: 3,
      gameStartTime: Date.now() - 60000, // 1 minute ago
      foundWordsRef: refs.foundWordsRef,
      gridRef: refs.gridRef,
      botScoresRef: refs.botScoresRef,
      botWordsRef: refs.botWordsRef,
      onGameEnd: vi.fn(),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock crypto.randomUUID for gameSessionId generation
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'test-uuid-123',
      },
      writable: true,
    });

    mockCalculateFinalAchievements.mockReturnValue(mockAchievements);
  });

  describe('initial state', () => {
    it('should not be validating initially', () => {
      const { result } = renderHook(() =>
        useGameEnd(createDefaultOptions())
      );

      expect(result.current.isValidatingWords).toBe(false);
    });

    it('should have gameOverCalledRef as false initially', () => {
      const { result } = renderHook(() =>
        useGameEnd(createDefaultOptions())
      );

      expect(result.current.gameOverCalledRef.current).toBe(false);
    });
  });

  describe('game over handling', () => {
    it('should not trigger game end when isGameOver is false', () => {
      const onGameEnd = vi.fn();

      renderHook(() =>
        useGameEnd(createDefaultOptions({ isGameOver: false, onGameEnd }))
      );

      expect(onGameEnd).not.toHaveBeenCalled();
    });

    it('should process words and call onGameEnd when game ends', async () => {
      const onGameEnd = vi.fn();

      const { result, rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      // Game ends
      const newProps = createDefaultOptions({ isGameOver: true, onGameEnd });
      rerender(newProps);

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      expect(result.current.gameOverCalledRef.current).toBe(true);
    });

    it('should only call game end once', async () => {
      const onGameEnd = vi.fn();

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      // Game ends
      const newProps = createDefaultOptions({ isGameOver: true, onGameEnd });
      rerender(newProps);

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props
      rerender(newProps);

      // Should still only be called once
      expect(onGameEnd).toHaveBeenCalledTimes(1);
    });

    it('should calculate final score from valid words only', async () => {
      const onGameEnd = vi.fn();

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      rerender(createDefaultOptions({ isGameOver: true, onGameEnd }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      // Score should be 3 + 3 = 6 (only valid words)
      expect(results.playerScore).toBe(6);
    });

    it('should include bot scores and words', async () => {
      const onGameEnd = vi.fn();

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      rerender(createDefaultOptions({ isGameOver: true, onGameEnd }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      expect(results.botScores).toHaveLength(2);
      expect(results.botScores[0]).toEqual({
        name: 'Bot 1',
        score: 50,
        words: ['hello', 'world'],
      });
    });

    it('should include achievements', async () => {
      const onGameEnd = vi.fn();

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      rerender(createDefaultOptions({ isGameOver: true, onGameEnd }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      expect(results.achievements).toEqual(mockAchievements);
    });
  });

  describe('practice mode', () => {
    it('should use actual elapsed time for practice mode', async () => {
      const onGameEnd = vi.fn();
      const gameStartTime = Date.now() - 45000; // 45 seconds ago

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        {
          initialProps: createDefaultOptions({
            isGameOver: false,
            onGameEnd,
            settings: {
              mode: 'practice',
              language: 'en' as Language,
              timerSeconds: 120,
              bots: [],
            },
            gameStartTime,
          }),
        }
      );

      rerender(createDefaultOptions({
        isGameOver: true,
        onGameEnd,
        settings: {
          mode: 'practice',
          language: 'en' as Language,
          timerSeconds: 120,
          bots: [],
        },
        gameStartTime,
      }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      // Should be approximately 45 seconds (allowing for test execution time)
      expect(results.gameDuration).toBeGreaterThanOrEqual(44);
      expect(results.gameDuration).toBeLessThanOrEqual(50);
    });

    it('should call onTrainingFinish for practice mode', async () => {
      const onGameEnd = vi.fn();
      const onTrainingFinish = vi.fn();

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        {
          initialProps: createDefaultOptions({
            isGameOver: false,
            onGameEnd,
            onTrainingFinish,
            settings: {
              mode: 'practice',
              language: 'en' as Language,
              timerSeconds: 120,
              bots: [],
            },
          }),
        }
      );

      rerender(createDefaultOptions({
        isGameOver: true,
        onGameEnd,
        onTrainingFinish,
        settings: {
          mode: 'practice',
          language: 'en' as Language,
          timerSeconds: 120,
          bots: [],
        },
      }));

      await waitFor(() => {
        expect(onTrainingFinish).toHaveBeenCalled();
      });
    });
  });

  describe('game session and validation', () => {
    it('should include game session ID', async () => {
      const onGameEnd = vi.fn();

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      rerender(createDefaultOptions({ isGameOver: true, onGameEnd }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      expect(results.gameSessionId).toBe('test-uuid-123');
    });

    it('should filter out fallback format bot words', async () => {
      const onGameEnd = vi.fn();
      const refs = createRefs();
      refs.botWordsRef.current = {
        bot1: ['hello', 'word1', 'word2'], // word1, word2 are fallback format
        bot2: ['testing', 'word3'],
      };

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        {
          initialProps: createDefaultOptions({
            isGameOver: false,
            onGameEnd,
            botWordsRef: refs.botWordsRef,
          }),
        }
      );

      rerender(createDefaultOptions({
        isGameOver: true,
        onGameEnd,
        botWordsRef: refs.botWordsRef,
      }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      // botWordsForValidation should only include real words, not word1, word2, word3
      expect(results.botWordsForValidation).not.toContain('word1');
      expect(results.botWordsForValidation).not.toContain('word2');
      expect(results.botWordsForValidation).not.toContain('word3');
    });

    it('should treat unvalidated words as invalid', async () => {
      const onGameEnd = vi.fn();
      const refs = createRefs();
      // Include an unvalidated word (isValid: null)
      refs.foundWordsRef.current = [
        { word: 'valid', score: 3, timestamp: Date.now(), timeSinceStart: 5, isValid: true, comboBonus: 0 },
        { word: 'unvalidated', score: 4, timestamp: Date.now(), timeSinceStart: 7, isValid: null },
      ];

      const { rerender } = renderHook(
        (props) => useGameEnd(props),
        {
          initialProps: createDefaultOptions({
            isGameOver: false,
            onGameEnd,
            foundWordsRef: refs.foundWordsRef,
          }),
        }
      );

      rerender(createDefaultOptions({
        isGameOver: true,
        onGameEnd,
        foundWordsRef: refs.foundWordsRef,
      }));

      await waitFor(() => {
        expect(onGameEnd).toHaveBeenCalled();
      });

      const results = onGameEnd.mock.calls[0][0];
      // Only the valid word should count towards score
      expect(results.playerScore).toBe(3);
      // Unvalidated word should be marked as invalid in playerWordData
      const unvalidatedWord = results.playerWordData.find((w: { word: string }) => w.word === 'unvalidated');
      expect(unvalidatedWord.isValid).toBe(false);
      expect(unvalidatedWord.score).toBe(0);
    });
  });
});
