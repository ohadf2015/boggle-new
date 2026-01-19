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
    // Reset fetch mock
    global.fetch = jest.fn();
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
