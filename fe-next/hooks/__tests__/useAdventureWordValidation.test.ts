/**
 * useAdventureWordValidation Hook Tests
 *
 * Tests for Adventure Mode word validation
 * Following TDD: Write tests FIRST, then implement
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdventureWordValidation } from '../useAdventureWordValidation';

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
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock invalidWordTracker to prevent actual API calls
jest.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: jest.fn(),
  recordNotInDictionary: jest.fn(),
  recordInvalidWord: jest.fn(),
}));

// ==============================================
// TESTS
// ==============================================

describe('useAdventureWordValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Default implementation for any unexpected fetch calls (e.g., from invalidWordTracker)
    // This prevents "Cannot read properties of undefined (reading 'catch')" errors
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    );
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
      );

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
      );

      // WHEN - "CRD" with non-adjacent path
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CRD', invalidPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.invalidPath');
      expect(mockFetch).not.toHaveBeenCalled(); // No API call for invalid path
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
      );

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
      );

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
      );

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN
      expect(validationResult!.isValid).toBe(false);
      expect(validationResult!.errorKey).toBe('adventure.errors.alreadyFound');
      expect(mockFetch).not.toHaveBeenCalled(); // No API call for duplicate
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
      );

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
    it('should validate word against dictionary API when path is valid', async () => {
      // GIVEN
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, source: 'dictionary' }),
      });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      );

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN
      expect(mockFetch).toHaveBeenCalledWith('/api/validate-word', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: 'CAT', language: 'en' }),
        // signal is also passed for request deduplication (AbortController)
      }));
      expect(validationResult!.isValid).toBe(true);
    });

    it('should reject word not in dictionary', async () => {
      // GIVEN
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: false, reason: 'Word not in dictionary', source: 'pending' }),
      });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      );

      // Path for "DOGE" - valid adjacent path but not a real word
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

    it('should handle API errors gracefully', async () => {
      // GIVEN
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      );

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
    it('should set isValidating during API call', async () => {
      // GIVEN
      let resolvePromise: (value: unknown) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(delayedPromise);

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      );

      // WHEN - start validation
      let validationPromise: Promise<unknown>;
      act(() => {
        validationPromise = result.current.validateWord('CAT', validCatPath);
      });

      // THEN - should be validating
      expect(result.current.isValidating).toBe(true);

      // Resolve the API call
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ isValid: true }),
        });
        await validationPromise;
      });

      // THEN - should no longer be validating
      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    it('should return base score for valid word', async () => {
      // GIVEN
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, source: 'dictionary' }),
      });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      );

      // WHEN
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN - 3 letter word = base score
      expect(validationResult!.isValid).toBe(true);
      expect(validationResult!.score).toBeGreaterThan(0);
    });

    it('should return 3x score when word path contains gold tile', async () => {
      // GIVEN - Grid with tiles and gold tile info passed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, source: 'dictionary' }),
      });

      // Mock tiles with gold tile at position (0,0)
      const mockTiles = [
        [
          { letter: 'C', type: 'gold' as const, isCleared: false },
          { letter: 'A', type: 'standard' as const, isCleared: false },
          { letter: 'T', type: 'standard' as const, isCleared: false },
          { letter: 'S', type: 'standard' as const, isCleared: false },
        ],
        [
          { letter: 'D', type: 'standard' as const, isCleared: false },
          { letter: 'O', type: 'standard' as const, isCleared: false },
          { letter: 'G', type: 'standard' as const, isCleared: false },
          { letter: 'E', type: 'standard' as const, isCleared: false },
        ],
        [
          { letter: 'B', type: 'standard' as const, isCleared: false },
          { letter: 'I', type: 'standard' as const, isCleared: false },
          { letter: 'R', type: 'standard' as const, isCleared: false },
          { letter: 'D', type: 'standard' as const, isCleared: false },
        ],
        [
          { letter: 'F', type: 'standard' as const, isCleared: false },
          { letter: 'I', type: 'standard' as const, isCleared: false },
          { letter: 'S', type: 'standard' as const, isCleared: false },
          { letter: 'H', type: 'standard' as const, isCleared: false },
        ],
      ];

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
          tiles: mockTiles,
        })
      );

      // WHEN - Validate CAT starting with gold tile
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN - Score should be 3x the base score (30 * 3 = 90 for 3-letter word)
      // Base score = 3 letters * 10 points = 30
      // With gold multiplier = 30 * 3 = 90
      expect(validationResult!.isValid).toBe(true);
      expect(validationResult!.score).toBe(90); // 3x multiplier applied
    });

    it('should return 1.25x score when word path contains rainbow tile', async () => {
      // GIVEN - Grid with rainbow tile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isValid: true, source: 'dictionary' }),
      });

      const mockTiles = [
        [
          { letter: 'C', type: 'rainbow' as const, isCleared: false },
          { letter: 'A', type: 'standard' as const, isCleared: false },
          { letter: 'T', type: 'standard' as const, isCleared: false },
          { letter: 'S', type: 'standard' as const, isCleared: false },
        ],
        [
          { letter: 'D', type: 'standard' as const, isCleared: false },
          { letter: 'O', type: 'standard' as const, isCleared: false },
          { letter: 'G', type: 'standard' as const, isCleared: false },
          { letter: 'E', type: 'standard' as const, isCleared: false },
        ],
        [
          { letter: 'B', type: 'standard' as const, isCleared: false },
          { letter: 'I', type: 'standard' as const, isCleared: false },
          { letter: 'R', type: 'standard' as const, isCleared: false },
          { letter: 'D', type: 'standard' as const, isCleared: false },
        ],
        [
          { letter: 'F', type: 'standard' as const, isCleared: false },
          { letter: 'I', type: 'standard' as const, isCleared: false },
          { letter: 'S', type: 'standard' as const, isCleared: false },
          { letter: 'H', type: 'standard' as const, isCleared: false },
        ],
      ];

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
          tiles: mockTiles,
        })
      );

      // WHEN - Validate CAT starting with rainbow tile
      let validationResult: Awaited<ReturnType<typeof result.current.validateWord>>;
      await act(async () => {
        validationResult = await result.current.validateWord('CAT', validCatPath);
      });

      // THEN - Score should be 1.25x the base score (30 * 1.25 = 37.5 -> 37)
      expect(validationResult!.isValid).toBe(true);
      expect(validationResult!.score).toBe(37); // 1.25x multiplier applied and floored
    });

    it('should return higher score for longer words', async () => {
      // GIVEN
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isValid: true, source: 'dictionary' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isValid: true, source: 'dictionary' }),
        });

      const { result } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: [],
        })
      );

      // Path for "BIRD" (4 letters)
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

      // Update foundWords for next call
      const { result: result2 } = renderHook(() =>
        useAdventureWordValidation({
          grid: mockGrid,
          language: 'en',
          minWordLength: 3,
          foundWords: ['CAT'],
        })
      );

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
      );

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
      );

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
