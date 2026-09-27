import { vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGridInit } from '../useGridInit';
import type { DifficultyLevel, Language } from '@/shared/types/game';

// Mock external dependencies
vi.mock('@/utils/utils', () => ({
  generateRandomTable: vi.fn(),
}));

vi.mock('@/utils/consts', () => ({
  DIFFICULTIES: {
    easy: { rows: 4, cols: 4, wordCount: 5 },
    medium: { rows: 5, cols: 5, wordCount: 7 },
    hard: { rows: 6, cols: 6, wordCount: 10 },
  },
}));

import { generateRandomTable } from '@/utils/utils';

const mockGenerateRandomTable = generateRandomTable as any;

describe('useGridInit', () => {
  const mockGrid = [
    ['T', 'E', 'S', 'T'],
    ['W', 'O', 'R', 'D'],
    ['H', 'E', 'L', 'L'],
    ['W', 'O', 'R', 'D'],
  ];

  const mockAvailableWords = {
    easy: ['test', 'word', 'hello'],
    medium: ['tests', 'words', 'testing'],
    hard: ['testword'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateRandomTable.mockReturnValue(mockGrid);
    global.fetch = vi.fn();
  });

  describe('grid initialization', () => {
    it('should initialize grid on mount', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: ['test', 'word'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.grid).toBeTruthy();
      });

      expect(mockGenerateRandomTable).toHaveBeenCalledWith(5, 5, 'en', expect.any(Array));
    });

    it('should skip themed words for Japanese language', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
      });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'ja' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.grid).toBeTruthy();
      });

      // Should not call themed-words API for Japanese
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/themed-words',
        expect.any(Object)
      );
      expect(mockGenerateRandomTable).toHaveBeenCalledWith(5, 5, 'ja', []);
    });

    it('should use more words in practice mode', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: ['test'] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'practice',
        })
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/themed-words',
          expect.objectContaining({
            body: expect.stringContaining('"count":16'), // baseWordCount * 2 for practice
          })
        );
      });
    });
  });

  describe('grid solving', () => {
    it('should fetch available words after grid is set', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.availableWords).toEqual(mockAvailableWords);
      });
    });

    it('should set empty words on API error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.availableWords).toEqual({ easy: [], medium: [], hard: [] });
      });
    });

    it('should set empty words on network error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.availableWords).toEqual({ easy: [], medium: [], hard: [] });
      });
    });
  });

  describe('totalBoardWords calculation', () => {
    it('should calculate total words with 5+ letters', async () => {
      const wordsWithMixedLength = {
        easy: ['test', 'word', 'hello'], // hello is 5 letters
        medium: ['tests', 'words'], // both 5 letters
        hard: ['testing'], // 7 letters
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: wordsWithMixedLength }),
        });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.totalBoardWords).toBe(4); // hello, tests, words, testing
      });
    });

    it('should return null when no available words', () => {
      mockGenerateRandomTable.mockReturnValue(null);

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      expect(result.current.totalBoardWords).toBeNull();
    });
  });

  describe('onGridChange callback', () => {
    it('should call onGridChange when grid changes', async () => {
      const onGridChange = vi.fn();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
          onGridChange,
        })
      );

      await waitFor(() => {
        expect(onGridChange).toHaveBeenCalled();
      });
    });
  });

  describe('setGrid', () => {
    it('should allow external grid updates', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      const newGrid = [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P'],
      ];

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.grid).toBeTruthy();
      });

      act(() => {
        result.current.setGrid(newGrid);
      });

      expect(result.current.grid).toEqual(newGrid);
    });
  });

  describe('refs', () => {
    it('should keep gridRef in sync', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.gridRef.current).toEqual(result.current.grid);
      });
    });

    it('should keep availableWordsRef in sync', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ words: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, words: mockAvailableWords }),
        });

      const { result } = renderHook(() =>
        useGridInit({
          difficulty: 'medium' as DifficultyLevel,
          language: 'en' as Language,
          mode: 'solo',
        })
      );

      await waitFor(() => {
        expect(result.current.availableWordsRef.current).toEqual(mockAvailableWords);
      });
    });
  });
});
