/**
 * useUnfinishedBoard Tests
 *
 * Tests for saving/loading unfinished board data to localStorage.
 * TDD RED phase — written before implementation.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnfinishedBoard } from '../useUnfinishedBoard';
import type { LetterGrid } from '@/shared/types/game';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const STORAGE_KEY = 'lexiclash_unfinished_board';

const mockGrid: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const mockMissedWords = ['QUARTZ', 'JUMBLE', 'FROZEN', 'APEX', 'BLITZ'];

describe('useUnfinishedBoard', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('saveUnfinishedBoard', () => {
    it('should save board data with top 3 missed words', () => {
      const { result } = renderHook(() => useUnfinishedBoard());

      act(() => {
        result.current.saveUnfinishedBoard(mockGrid, mockMissedWords, 'classic', 120);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved.grid).toEqual(mockGrid);
      expect(saved.missedWords).toEqual(['QUARTZ', 'JUMBLE', 'FROZEN']);
      expect(saved.missedWords).toHaveLength(3);
      expect(saved.mode).toBe('classic');
      expect(saved.score).toBe(120);
      expect(saved.date).toBeDefined();
    });

    it('should not save if fewer than 3 missed words', () => {
      const { result } = renderHook(() => useUnfinishedBoard());

      act(() => {
        result.current.saveUnfinishedBoard(mockGrid, ['APPLE', 'BANANA'], 'classic', 50);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should save exactly 3 missed words even if more provided', () => {
      const { result } = renderHook(() => useUnfinishedBoard());

      act(() => {
        result.current.saveUnfinishedBoard(mockGrid, mockMissedWords, 'blast', 200);
      });

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved.missedWords).toHaveLength(3);
    });

    it('should store the current date as ISO string', () => {
      const { result } = renderHook(() => useUnfinishedBoard());

      act(() => {
        result.current.saveUnfinishedBoard(mockGrid, mockMissedWords, 'classic', 100);
      });

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      // Date should be a valid ISO date string (YYYY-MM-DD)
      expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getUnfinishedBoard', () => {
    it('should return null when no board is saved', () => {
      const { result } = renderHook(() => useUnfinishedBoard());

      expect(result.current.getUnfinishedBoard()).toBeNull();
    });

    it('should return saved board data', () => {
      const savedData = {
        grid: mockGrid,
        missedWords: ['QUARTZ', 'JUMBLE', 'FROZEN'],
        date: new Date().toISOString().split('T')[0],
        mode: 'classic',
        score: 120,
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedData));

      const { result } = renderHook(() => useUnfinishedBoard());

      const board = result.current.getUnfinishedBoard();
      expect(board).toEqual(savedData);
    });

    it('should return null for corrupted data', () => {
      localStorageMock.getItem.mockReturnValueOnce('not-valid-json');

      const { result } = renderHook(() => useUnfinishedBoard());

      expect(result.current.getUnfinishedBoard()).toBeNull();
    });
  });

  describe('clearUnfinishedBoard', () => {
    it('should remove the saved board from localStorage', () => {
      const { result } = renderHook(() => useUnfinishedBoard());

      act(() => {
        result.current.clearUnfinishedBoard();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });
});
