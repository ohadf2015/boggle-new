import { renderHook, waitFor, act } from '@testing-library/react';
import { useGameEnd } from '../useGameEnd';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BotOpponent } from '../../../SinglePlayerView';

// Mock external dependencies
jest.mock('@/utils/wordValidationAPI', () => ({
  finalizeWordValidation: jest.fn(),
}));

jest.mock('@/utils/singlePlayerAchievements', () => ({
  calculateFinalAchievements: jest.fn(),
}));

import { finalizeWordValidation } from '@/utils/wordValidationAPI';
import { calculateFinalAchievements } from '@/utils/singlePlayerAchievements';

const mockFinalizeWordValidation = finalizeWordValidation as jest.Mock;
const mockCalculateFinalAchievements = calculateFinalAchievements as jest.Mock;

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
      onGameEnd: jest.fn(),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'test-uuid-123',
      },
      writable: true,
    });

    mockFinalizeWordValidation.mockResolvedValue([
      { word: 'test', score: 3, timestamp: Date.now() - 5000, timeSinceStart: 5, isValid: true, comboBonus: 0 },
      { word: 'word', score: 3, timestamp: Date.now() - 3000, timeSinceStart: 7, isValid: true, comboBonus: 1 },
      { word: 'invalid', score: 5, timestamp: Date.now() - 1000, timeSinceStart: 9, isValid: false },
    ]);

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
      const onGameEnd = jest.fn();

      renderHook(() =>
        useGameEnd(createDefaultOptions({ isGameOver: false, onGameEnd }))
      );

      expect(onGameEnd).not.toHaveBeenCalled();
    });

    it('should validate words and call onGameEnd when game ends', async () => {
      const onGameEnd = jest.fn();

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

      expect(mockFinalizeWordValidation).toHaveBeenCalled();
      expect(result.current.gameOverCalledRef.current).toBe(true);
    });

    it('should only call game end once', async () => {
      const onGameEnd = jest.fn();

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
      const onGameEnd = jest.fn();

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
      const onGameEnd = jest.fn();

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
      const onGameEnd = jest.fn();

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

    it('should include game session ID', async () => {
      const onGameEnd = jest.fn();

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
  });

  describe('practice mode', () => {
    it('should use actual elapsed time for practice mode', async () => {
      const onGameEnd = jest.fn();
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
      const onGameEnd = jest.fn();
      const onTrainingFinish = jest.fn();

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

  describe('validating words state', () => {
    it('should set validating state during validation', async () => {
      const onGameEnd = jest.fn();

      // Create a delayed mock to test loading state
      let resolveValidation: (value: unknown) => void;
      mockFinalizeWordValidation.mockReturnValue(
        new Promise((resolve) => {
          resolveValidation = resolve;
        })
      );

      const { result, rerender } = renderHook(
        (props) => useGameEnd(props),
        { initialProps: createDefaultOptions({ isGameOver: false, onGameEnd }) }
      );

      rerender(createDefaultOptions({ isGameOver: true, onGameEnd }));

      // Should be validating
      await waitFor(() => {
        expect(result.current.isValidatingWords).toBe(true);
      });

      // Resolve validation
      act(() => {
        resolveValidation!([
          { word: 'test', score: 3, isValid: true },
        ]);
      });

      // Should not be validating anymore
      await waitFor(() => {
        expect(result.current.isValidatingWords).toBe(false);
      });
    });
  });

  describe('bot words for validation', () => {
    it('should filter out fallback format bot words', async () => {
      const onGameEnd = jest.fn();
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
  });
});
