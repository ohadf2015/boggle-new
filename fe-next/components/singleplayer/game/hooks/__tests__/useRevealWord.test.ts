import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRevealWord } from '../useRevealWord';
import type { LetterGrid, Language } from '@/shared/types/game';

// Mock external dependencies
vi.mock('@/utils/wordPathFinder', () => ({
  selectRandomRevealWord: vi.fn(),
  getRevealableWordCount: vi.fn(),
}));

import { selectRandomRevealWord, getRevealableWordCount } from '@/utils/wordPathFinder';

const mockSelectRandomRevealWord = selectRandomRevealWord as any;
const mockGetRevealableWordCount = getRevealableWordCount as any;

describe('useRevealWord', () => {
  const mockGrid: LetterGrid = [
    ['T', 'E', 'S', 'T', 'S'],
    ['W', 'O', 'R', 'D', 'S'],
    ['H', 'E', 'L', 'L', 'O'],
    ['W', 'O', 'R', 'L', 'D'],
    ['A', 'B', 'C', 'D', 'E'],
  ];

  const mockAvailableWords = {
    easy: ['test', 'word', 'hello'],
    medium: ['tests', 'words'],
    hard: ['testing'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetRevealableWordCount.mockReturnValue(5);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with zero reveals used', () => {
      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      expect(result.current.revealsUsed).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.highlightedPath).toEqual([]);
    });

    it('should calculate revealable word count', () => {
      mockGetRevealableWordCount.mockReturnValue(10);

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      expect(result.current.revealableWordCount).toBe(10);
      expect(mockGetRevealableWordCount).toHaveBeenCalledWith(
        mockAvailableWords,
        [],
        'en'
      );
    });

    it('should return 0 revealable words when no grid', () => {
      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: null,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      expect(result.current.revealableWordCount).toBe(0);
    });

    it('should return 0 revealable words when no available words', () => {
      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: null,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      expect(result.current.revealableWordCount).toBe(0);
    });
  });

  describe('handleReveal', () => {
    it('should reveal a word and highlight path', async () => {
      mockSelectRandomRevealWord.mockReturnValue({
        word: 'test',
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
        ],
      });

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      let revealResult: { word: string; path: Array<{ row: number; col: number }> } | null = null;
      await act(async () => {
        revealResult = await result.current.handleReveal();
      });

      expect(revealResult).toEqual({
        word: 'test',
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
        ],
      });
      expect(result.current.revealsUsed).toBe(1);
      expect(result.current.highlightedPath).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ]);
    });

    it('should increment reveals used on each reveal', async () => {
      mockSelectRandomRevealWord.mockReturnValue({
        word: 'test',
        path: [{ row: 0, col: 0 }],
      });

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      await act(async () => {
        await result.current.handleReveal();
      });
      expect(result.current.revealsUsed).toBe(1);

      await act(async () => {
        await result.current.handleReveal();
      });
      expect(result.current.revealsUsed).toBe(2);
    });

    it('should return null when no word available', async () => {
      mockSelectRandomRevealWord.mockReturnValue(null);

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      let revealResult: unknown = 'initial';
      await act(async () => {
        revealResult = await result.current.handleReveal();
      });

      expect(revealResult).toBeNull();
      expect(result.current.revealsUsed).toBe(0);
    });

    it('should return null when no grid', async () => {
      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: null,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      let revealResult: unknown = 'initial';
      await act(async () => {
        revealResult = await result.current.handleReveal();
      });

      expect(revealResult).toBeNull();
    });

    it('should return null when no available words', async () => {
      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: null,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      let revealResult: unknown = 'initial';
      await act(async () => {
        revealResult = await result.current.handleReveal();
      });

      expect(revealResult).toBeNull();
    });
  });

  describe('highlight timeout', () => {
    it('should clear highlight after 4 seconds', async () => {
      mockSelectRandomRevealWord.mockReturnValue({
        word: 'test',
        path: [{ row: 0, col: 0 }],
      });

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      await act(async () => {
        await result.current.handleReveal();
      });

      expect(result.current.highlightedPath).toHaveLength(1);

      // Advance time by 4 seconds
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(result.current.highlightedPath).toEqual([]);
    });
  });

  describe('clearHighlight', () => {
    it('should manually clear highlighted path', async () => {
      mockSelectRandomRevealWord.mockReturnValue({
        word: 'test',
        path: [{ row: 0, col: 0 }],
      });

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      await act(async () => {
        await result.current.handleReveal();
      });

      expect(result.current.highlightedPath).toHaveLength(1);

      act(() => {
        result.current.clearHighlight();
      });

      expect(result.current.highlightedPath).toEqual([]);
    });
  });

  describe('resetRevealState', () => {
    it('should reset all reveal state', async () => {
      mockSelectRandomRevealWord.mockReturnValue({
        word: 'test',
        path: [{ row: 0, col: 0 }],
      });

      const { result } = renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: [],
          language: 'en' as Language,
        })
      );

      // Use reveals
      await act(async () => {
        await result.current.handleReveal();
        await result.current.handleReveal();
      });

      expect(result.current.revealsUsed).toBe(2);
      expect(result.current.highlightedPath).toHaveLength(1);

      // Reset
      act(() => {
        result.current.resetRevealState();
      });

      expect(result.current.revealsUsed).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.highlightedPath).toEqual([]);
    });
  });

  describe('foundValidWords filtering', () => {
    it('should pass found words to getRevealableWordCount', () => {
      const foundWords = ['test', 'word'];

      renderHook(() =>
        useRevealWord({
          availableWords: mockAvailableWords,
          grid: mockGrid,
          foundValidWords: foundWords,
          language: 'en' as Language,
        })
      );

      expect(mockGetRevealableWordCount).toHaveBeenCalledWith(
        mockAvailableWords,
        foundWords,
        'en'
      );
    });
  });
});
