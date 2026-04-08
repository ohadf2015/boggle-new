/**
 * useAdventureWordValidation Hook Tests
 *
 * Tests for Adventure Mode word validation
 * Following TDD: Write tests FIRST, then implement
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdventureWordValidation, clearWordValidationCache } from '../useAdventureWordValidation';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;

// ==============================================
// TEST FIXTURES
// ==============================================

const mockGrid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'E'],
  ['B', 'I', 'R', 'D'],
  ['F', 'I', 'S', 'H'],
];

// Path for "CAT" - valid adjacent path
const validCatPath = [
  { row: 0, col: 0 }, // C
  { row: 0, col: 1 }, // A
  { row: 0, col: 2 }, // T
];

// Path for "DOG" - valid adjacent path
const validDogPath = [
  { row: 1, col: 0 }, // D
  { row: 1, col: 1 }, // O
  { row: 1, col: 2 }, // G
];

// Invalid path - non-adjacent tiles (3 tiles to pass length check)
const invalidPath = [
  { row: 0, col: 0 }, // C
  { row: 2, col: 2 }, // R (not adjacent to C)
  { row: 2, col: 3 }, // D
];

// ==============================================
// MOCKS
// ==============================================

// Mock fetch for API validation
const mockFetch = vi.fn();

// Mock invalidWordTracker to prevent actual API calls
vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: vi.fn(),
  recordNotInDictionary: vi.fn(),
  recordInvalidWord: vi.fn(),
}));

// Valid words on the mockGrid that the solve-grid endpoint would return
const MOCK_GRID_VALID_WORDS = ['cat', 'dog', 'bird', 'fish', 'cats', 'dogs', 'sir', 'ode', 'ire', 'ore', 'god', 'rid', 'rod', 'rig'];

/**
 * Default fetch implementation that handles:
 * 1. /api/adventure/solve-grid → returns pre-solved valid words
 * 2. /api/dictionary/check → returns based on word (fallback path)
 */
function createDefaultFetchImpl() {
  return (url: string, opts?: RequestInit) => {
    const body = opts?.body ? JSON.parse(opts.body as string) : {};
    if (url === '/api/adventure/solve-grid') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ words: MOCK_GRID_VALID_WORDS, count: MOCK_GRID_VALID_WORDS.length }),
      });
    }
    if (url === '/api/dictionary/check') {
      const isValid = MOCK_GRID_VALID_WORDS.includes(body.word?.toLowerCase());
      return Promise.resolve({
        ok: true,
        json: async () => ({ isValid, source: isValid ? 'dictionary' : 'not_found' }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  };
}

// ==============================================
// TESTS
// ==============================================

describe('useAdventureWordValidation', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Clear grid solution cache to ensure test isolation
    clearWordValidationCache();
    // Default: handle both solve-grid and dictionary/check
    mockFetch.mockImplementation(createDefaultFetchImpl());
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      // GIVEN / WHEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      // THEN
      expect(result.current.isValidating).toBe(false);
      expect(result.current.lastValidationResult).toBeNull();
    });
  });

  describe('Path Validation', () => {
    it('should reject non-adjacent path without API call', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      // WHEN - "CRD" with non-adjacent path
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CRD', invalidPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.invalidPath');
      // No per-word API call for invalid path
      const dictCheckCalls = mockFetch.mock.calls.filter(
        (c: unknown[]) => c[0] === '/api/dictionary/check'
      );
      expect(dictCheckCalls.length).toBe(0);
    });

    it('should reject word that does not match path letters', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      // WHEN - word "DOG" but path spells "CAT"
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('DOG', validCatPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.wordMismatch');
    });
  });

  describe('Length Validation', () => {
    it('should reject word shorter than minimum length', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      const shortPath = [
        { row: 0, col: 0 }, // C
        { row: 0, col: 1 }, // A
      ];

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CA', shortPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.tooShort');
    });
  });

  describe('Duplicate Word Validation', () => {
    it('should reject already found word', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: ['CAT', 'DOG'],
        })
      , { wrapper });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.alreadyFound');
      // No per-word API call for duplicate (solve-grid may have been called)
      const dictCheckCalls = mockFetch.mock.calls.filter(
        (c: unknown[]) => c[0] === '/api/dictionary/check'
      );
      expect(dictCheckCalls.length).toBe(0);
    });

    it('should reject duplicate regardless of case', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: ['cat'], // lowercase
        })
      , { wrapper });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath); // uppercase
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.alreadyFound');
    });
  });

  describe('Dictionary Validation', () => {
    it('should validate word against pre-solved word set (instant, no per-word API call)', async () => {
      // GIVEN — solve-grid is handled by default mock
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      // Wait for solve-grid query to resolve and populate hook state
      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });
      // Extra flush to allow TanStack Query to process the response and trigger re-render
      await act(async () => { await Promise.resolve(); });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN — should be valid (CAT is in MOCK_GRID_VALID_WORDS)
      expect(validationResult!.isValid).toBe(true);
      // No per-word API call — only the solve-grid call should have been made
      expect(mockFetch).toHaveBeenCalledWith('/api/adventure/solve-grid', expect.anything());
      const dictCheckCalls = mockFetch.mock.calls.filter(
        (c: unknown[]) => c[0] === '/api/dictionary/check'
      );
      expect(dictCheckCalls.length).toBe(0);
    });

    it('should reject word not in pre-solved word set', async () => {
      // GIVEN — solve-grid returns words that do NOT include "DOGE"
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      const dogePath = [
        { row: 1, col: 0 }, // D
        { row: 1, col: 1 }, // O
        { row: 1, col: 2 }, // G
        { row: 1, col: 3 }, // E
      ];

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('DOGE', dogePath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.notInDictionary');
    });

    it('should fall back to per-word API when solve-grid fails', async () => {
      // GIVEN — solve-grid fails, per-word API succeeds
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/adventure/solve-grid') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ isValid: true, source: 'dictionary' }),
        });
      });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN — should fall back to per-word API call
      expect(validationResult!.isValid).toBe(true);
      const dictCheckCalls = mockFetch.mock.calls.filter(
        (c: unknown[]) => c[0] === '/api/dictionary/check'
      );
      expect(dictCheckCalls.length).toBe(1);
    });

    it('should handle fallback API errors gracefully', async () => {
      // GIVEN — both solve-grid and per-word API fail
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/adventure/solve-grid') {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Network error'));
      });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN - should fail gracefully
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.validationFailed');
    });
  });

  describe('Loading State', () => {
    it('should NOT set isValidating when pre-solved words are available (instant validation)', async () => {
      // GIVEN — solve-grid loaded
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      // WHEN
      await act(async () => {
        await result.current.validateWord('CAT', validCatPath);
      });

      // THEN — client-side validation, never sets isValidating
      expect(result.current.isValidating).toBe(false);
    });

    it('should set isValidating during fallback API call', async () => {
      // GIVEN — solve-grid fails
      let resolveDict: (value: unknown) => void;
      const dictPromise = new Promise((resolve) => { resolveDict = resolve; });

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/adventure/solve-grid') {
          return Promise.reject(new Error('fail'));
        }
        return dictPromise;
      });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      // WHEN — start validation (falls back to API)
      let validationPromise: Promise<unknown>;
      act(() => {
        validationPromise = result.current.validateWord('CAT', validCatPath);
      });

      // THEN — should be validating during API call
      expect(result.current.isValidating).toBe(true);

      // Resolve the API call
      await act(async () => {
        resolveDict!({ ok: true, json: async () => ({ isValid: true }) });
        await validationPromise;
      });

      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    it('should return base score for valid word', async () => {
      // GIVEN — solve-grid loaded via default mock
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN - 3 letter word = base score (30 = 3 * 10 * 1x)
      expect(validationResult!.isValid).toBe(true);
      expect(validationResult!.score).toBeGreaterThan(0);
    });

    it('should return base score only (no tile multiplier — reducer handles it)', async () => {
      // GIVEN — solve-grid loaded
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      // WHEN - Validate CAT
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN - Base score = 3 letters * 10 points * 1x length bonus = 30
      expect(validationResult!.isValid).toBe(true);
      expect(validationResult!.score).toBe(30);
    });

    it('should return higher score for longer words', async () => {
      // GIVEN — solve-grid loaded
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      const birdPath = [
        { row: 2, col: 0 }, // B
        { row: 2, col: 1 }, // I
        { row: 2, col: 2 }, // R
        { row: 2, col: 3 }, // D
      ];

      // WHEN
      let catResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      let birdResult: Awaited<ReturnType<typeof result.current.validateWord>>;

      await act(async () => {
        catResult = await result.current.validateWord('CAT', validCatPath);
      });

      // Render with foundWords=['CAT'] for second validation
      const { result: result2 } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: ['CAT'],
        })
      , { wrapper });

      await waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });

      await act(async () => {
        birdResult = await result2.current.validateWord('BIRD', birdPath);
      });

      // THEN - 4 letter word should score more than 3 letter word
      expect(birdResult!.score).toBeGreaterThan(catResult!.score!);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('', []);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.tooShort');
    });

    it('should handle path with repeated tile', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      , { wrapper });

      // Path with same tile twice
      const repeatedPath = [
        { row: 0, col: 0 }, // C
        { row: 0, col: 1 }, // A
        { row: 0, col: 0 }, // C again (invalid)
      ];

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAC', repeatedPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.invalidPath');
    });
  });
});
