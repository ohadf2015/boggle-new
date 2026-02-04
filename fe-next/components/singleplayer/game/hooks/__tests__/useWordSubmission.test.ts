import { renderHook, act, waitFor } from '@testing-library/react';
import { useWordSubmission } from '../useWordSubmission';
import type { Language, LetterGrid } from '@/shared/types/game';
import type { ComboSystemReturn } from '@/hooks/useComboSystem';
import type { UseSpamDetectionReturn } from '../useSpamDetection';

// Mock external dependencies
jest.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: jest.fn(),
  isWordOnBoard: jest.fn(),
}));

jest.mock('@/utils/haptics', () => ({
  hapticForWordScore: jest.fn(),
  hapticError: jest.fn(),
}));

// Mock invalidWordTracker to prevent fetch calls during tests
jest.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: jest.fn(),
  recordNotInDictionary: jest.fn(),
  recordInvalidWord: jest.fn(),
}));

// Mock useDictionaryCache to prevent dictionary loading in tests
const mockCheckWord = jest.fn().mockReturnValue(false);
const mockDictionaryCacheState = {
  isLoaded: false,
  isLoading: false,
  wordCount: 0,
  error: null,
};

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: mockCheckWord,
    ...mockDictionaryCacheState,
  }),
}));

// Mock usePrevalidation for pre-typing validation
const mockPrefetch = jest.fn();
const mockGetCached = jest.fn().mockReturnValue(undefined);
const mockClearCache = jest.fn();

jest.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({
    prefetch: mockPrefetch,
    getCached: mockGetCached,
    clearCache: mockClearCache,
  }),
}));

// Import mocked modules
import { validateWordLocally, isWordOnBoard } from '@/utils/clientWordValidator';

const mockValidateWordLocally = validateWordLocally as jest.Mock;
const mockIsWordOnBoard = isWordOnBoard as jest.Mock;

describe('useWordSubmission', () => {
  // Create mock grid
  const mockGrid: LetterGrid = [
    ['T', 'E', 'S', 'T', 'S'],
    ['W', 'O', 'R', 'D', 'S'],
    ['H', 'E', 'L', 'L', 'O'],
    ['W', 'O', 'R', 'L', 'D'],
    ['A', 'B', 'C', 'D', 'E'],
  ];

  // Mock combo system
  const createMockCombo = (): ComboSystemReturn => ({
    comboLevel: 0,
    comboLevelRef: { current: 0 },
    maxCombo: 0,
    availableShields: 0,
    validWordCount: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    incrementCombo: jest.fn().mockReturnValue(1),
    resetCombo: jest.fn(),
    forceResetCombo: jest.fn(),
    incrementValidWordCount: jest.fn(),
    resetAll: jest.fn(),
  });

  // Mock spam detection
  const createMockSpamDetection = (): UseSpamDetectionReturn => ({
    checkSubmission: jest.fn().mockReturnValue({ allowed: true }),
    resetSpamDetection: jest.fn(),
  });

  // Default options factory
  function createDefaultOptions(overrides: Partial<Parameters<typeof useWordSubmission>[0]> = {}) {
    return {
      language: 'en' as Language,
      minWordLength: 3,
      grid: mockGrid,
      gameStartTime: Date.now() - 10000,
      getScoreMultiplier: () => 1,
      fireRoundActive: false,
      combo: createMockCombo(),
      spamDetection: createMockSpamDetection(),
      t: (key: string) => key,
      playWordAcceptedSound: jest.fn(),
      playComboSound: jest.fn(),
      announceWordResult: jest.fn(),
      announceCombo: jest.fn(),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock with default implementation
    // This prevents "Cannot read properties of undefined (reading 'catch')" errors
    // when invalidWordTracker calls fetch() for tracking purposes
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
  });

  describe('initial state', () => {
    it('should initialize with empty found words', () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions())
      );

      expect(result.current.foundWords).toEqual([]);
      expect(result.current.score).toBe(0);
      expect(result.current.currentFeedback).toBeNull();
    });
  });

  describe('spam detection', () => {
    it('should block submission when spam detected', () => {
      const mockSpamDetection = createMockSpamDetection();
      mockSpamDetection.checkSubmission = jest.fn().mockReturnValue({
        allowed: false,
        isCooldown: true,
        remainingCooldown: 3,
      });

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ spamDetection: mockSpamDetection }))
      );

      act(() => {
        result.current.handleWordSubmit('test');
      });

      expect(result.current.foundWords).toEqual([]);
      expect(result.current.currentFeedback?.type).toBe('rejected');
    });
  });

  describe('local validation', () => {
    it('should reject word when local validation fails', () => {
      mockValidateWordLocally.mockReturnValue({
        isValid: false,
        errorKey: 'playerView.wordTooShort',
        errorParams: { min: 3 },
      });

      const mockCombo = createMockCombo();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ combo: mockCombo }))
      );

      act(() => {
        result.current.handleWordSubmit('ab');
      });

      expect(result.current.currentFeedback?.type).toBe('rejected');
      expect(mockCombo.resetCombo).toHaveBeenCalled();
    });

    it('should reject word not on board', () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(false);

      const mockCombo = createMockCombo();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ combo: mockCombo }))
      );

      act(() => {
        result.current.handleWordSubmit('xyz');
      });

      expect(result.current.currentFeedback?.type).toBe('rejected');
      expect(result.current.currentFeedback?.message).toBe('playerView.wordNotOnBoard');
      expect(mockCombo.resetCombo).toHaveBeenCalled();
    });
  });

  describe('duplicate detection', () => {
    it('should reject duplicate words', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: true }),
      });

      const mockCombo = createMockCombo();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ combo: mockCombo }))
      );

      // Submit first time
      act(() => {
        result.current.handleWordSubmit('test');
      });

      await waitFor(() => {
        expect(result.current.foundWords.length).toBe(1);
      });

      // Reset combo mock to check second submission
      (mockCombo.resetCombo as jest.Mock).mockClear();

      // Submit same word again
      act(() => {
        result.current.handleWordSubmit('test');
      });

      expect(result.current.currentFeedback?.type).toBe('rejected');
      expect(result.current.currentFeedback?.message).toBe('playerView.wordAlreadyFound');
      expect(mockCombo.resetCombo).toHaveBeenCalled();
    });
  });

  describe('immediate optimistic feedback', () => {
    it('should show checking feedback immediately before API responds', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      // Create a delayed promise to simulate network latency
      let resolveApi: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolveApi = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(
        apiPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ isValid: true }),
        }))
      );

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions())
      );

      act(() => {
        result.current.handleWordSubmit('test');
      });

      // Immediately after submit, feedback should be 'checking'
      expect(result.current.currentFeedback?.type).toBe('checking');
      expect(result.current.currentFeedback?.word).toBe('TEST');

      // Now resolve the API
      await act(async () => {
        resolveApi!(undefined);
        await apiPromise;
      });

      // After API responds, feedback should be 'accepted'
      await waitFor(() => {
        expect(result.current.currentFeedback?.type).toBe('accepted');
      });
    });

    it('should transition from checking to pending when word not in dictionary', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      let resolveApi: (value: unknown) => void;
      const apiPromise = new Promise((resolve) => {
        resolveApi = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(
        apiPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({ isValid: false }),
        }))
      );

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions())
      );

      act(() => {
        result.current.handleWordSubmit('xyz');
      });

      // Immediately shows checking
      expect(result.current.currentFeedback?.type).toBe('checking');

      // Resolve API with invalid result
      await act(async () => {
        resolveApi!(undefined);
        await apiPromise;
      });

      // Should transition to pending
      await waitFor(() => {
        expect(result.current.currentFeedback?.type).toBe('pending');
      });
    });
  });

  describe('instant validation with dictionary cache', () => {
    it('should validate instantly when word is in client-side cache', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      // Enable dictionary cache and make it return true for 'hello'
      mockDictionaryCacheState.isLoaded = true;
      mockCheckWord.mockImplementation((word: string) => word === 'hello');

      const playWordAcceptedSound = jest.fn();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ playWordAcceptedSound }))
      );

      act(() => {
        result.current.handleWordSubmit('hello');
      });

      // Should be accepted IMMEDIATELY without API call
      expect(result.current.currentFeedback?.type).toBe('accepted');
      expect(result.current.currentFeedback?.word).toBe('HELLO');
      expect(playWordAcceptedSound).toHaveBeenCalled();

      // API should NOT have been called
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/dictionary/check',
        expect.anything()
      );

      // Reset mock state for other tests
      mockDictionaryCacheState.isLoaded = false;
      mockCheckWord.mockReturnValue(false);
    });

    it('should fall back to API when word not in cache', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      // Cache loaded but word not in it
      mockDictionaryCacheState.isLoaded = true;
      mockCheckWord.mockReturnValue(false);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: true }),
      });

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions())
      );

      act(() => {
        result.current.handleWordSubmit('test');
      });

      // Should show checking first (API in flight)
      expect(result.current.currentFeedback?.type).toBe('checking');

      // Wait for API
      await waitFor(() => {
        expect(result.current.currentFeedback?.type).toBe('accepted');
      });

      // API should have been called
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dictionary/check',
        expect.anything()
      );

      // Reset mock state
      mockDictionaryCacheState.isLoaded = false;
    });

    it('should validate instantly when word was prevalidated while typing', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      // Prevalidation cache returns true for the word
      mockGetCached.mockImplementation((word: string) =>
        word === 'hello' ? true : undefined
      );

      const playWordAcceptedSound = jest.fn();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ playWordAcceptedSound }))
      );

      act(() => {
        result.current.handleWordSubmit('hello');
      });

      // Should be accepted IMMEDIATELY without API call
      expect(result.current.currentFeedback?.type).toBe('accepted');
      expect(playWordAcceptedSound).toHaveBeenCalled();

      // API should NOT have been called
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/dictionary/check',
        expect.anything()
      );

      // Reset mock
      mockGetCached.mockReturnValue(undefined);
    });

    it('should mark pending instantly when prevalidation returned invalid', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      // Prevalidation cache returns false for the word
      mockGetCached.mockImplementation((word: string) =>
        word === 'xyz' ? false : undefined
      );

      const mockCombo = createMockCombo();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ combo: mockCombo }))
      );

      act(() => {
        result.current.handleWordSubmit('xyz');
      });

      // Should be pending IMMEDIATELY without API call
      expect(result.current.currentFeedback?.type).toBe('pending');
      expect(mockCombo.resetCombo).toHaveBeenCalled();

      // API should NOT have been called
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/dictionary/check',
        expect.anything()
      );

      // Reset mock
      mockGetCached.mockReturnValue(undefined);
    });

    it('should expose prefetchValidation function', () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions())
      );

      expect(result.current.prefetchValidation).toBeDefined();
      expect(typeof result.current.prefetchValidation).toBe('function');

      // Call prefetch
      act(() => {
        result.current.prefetchValidation('test');
      });

      expect(mockPrefetch).toHaveBeenCalledWith('test');
    });
  });

  describe('successful word submission', () => {
    it('should add valid word and update score', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: true }),
      });

      const mockCombo = createMockCombo();
      const playWordAcceptedSound = jest.fn();
      const onWordFound = jest.fn();

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({
          combo: mockCombo,
          playWordAcceptedSound,
          onWordFound,
        }))
      );

      act(() => {
        result.current.handleWordSubmit('test');
      });

      // Wait for API call to resolve
      await waitFor(() => {
        expect(result.current.foundWords.some(w => w.isValid === true)).toBe(true);
      });

      expect(result.current.score).toBeGreaterThan(0);
      expect(playWordAcceptedSound).toHaveBeenCalled();
      expect(onWordFound).toHaveBeenCalled();
      expect(mockCombo.incrementCombo).toHaveBeenCalledWith(true);
    });

    it('should apply fire round multiplier', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: true }),
      });

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({
          fireRoundActive: true,
          getScoreMultiplier: () => 2,
        }))
      );

      act(() => {
        result.current.handleWordSubmit('test');
      });

      await waitFor(() => {
        expect(result.current.foundWords.some(w => w.isValid === true)).toBe(true);
      });

      // Score should be doubled with 2x multiplier
      // Base score for 4-letter word is 3 (length - 1)
      // With 2x multiplier = 6
      expect(result.current.score).toBe(6);
    });
  });

  describe('pending word handling', () => {
    it('should mark word as pending when API returns invalid', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: false }),
      });

      const mockCombo = createMockCombo();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ combo: mockCombo }))
      );

      act(() => {
        result.current.handleWordSubmit('xyz');
      });

      await waitFor(() => {
        expect(result.current.currentFeedback?.type).toBe('pending');
      });

      expect(mockCombo.resetCombo).toHaveBeenCalled();
    });

    it('should mark word as pending when API call fails', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockCombo = createMockCombo();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ combo: mockCombo }))
      );

      act(() => {
        result.current.handleWordSubmit('test');
      });

      await waitFor(() => {
        expect(result.current.currentFeedback?.type).toBe('pending');
      });

      expect(mockCombo.resetCombo).toHaveBeenCalled();
    });
  });

  describe('resetWordSubmission', () => {
    it('should reset all state', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: true }),
      });

      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions())
      );

      // Add a word first
      act(() => {
        result.current.handleWordSubmit('test');
      });

      await waitFor(() => {
        expect(result.current.foundWords.length).toBe(1);
      });

      // Reset
      act(() => {
        result.current.resetWordSubmission();
      });

      expect(result.current.foundWords).toEqual([]);
      expect(result.current.score).toBe(0);
      expect(result.current.currentFeedback).toBeNull();
    });
  });

  describe('training callbacks', () => {
    it('should call onTrainingTrackValidWord for valid words', async () => {
      mockValidateWordLocally.mockReturnValue({ isValid: true });
      mockIsWordOnBoard.mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ isValid: true }),
      });

      const onTrainingTrackValidWord = jest.fn();
      const { result } = renderHook(() =>
        useWordSubmission(createDefaultOptions({ onTrainingTrackValidWord }))
      );

      act(() => {
        result.current.handleWordSubmit('hello');
      });

      await waitFor(() => {
        expect(onTrainingTrackValidWord).toHaveBeenCalledWith(5);
      });
    });
  });
});
