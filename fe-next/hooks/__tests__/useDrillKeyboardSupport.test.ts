/**
 * useDrillKeyboardSupport Hook Tests
 *
 * Tests for the keyboard support convenience hook for brain drills
 */

import { renderHook, act } from '@testing-library/react';
import { useDrillKeyboardSupport } from '../useDrillKeyboardSupport';
import type { LetterGrid } from '@/types';

// Mock useKeyboardWordInput
jest.mock('../useKeyboardWordInput', () => ({
  useKeyboardWordInput: jest.fn(() => ({
    typedWord: '',
    isTypingMode: false,
    isValidOnGrid: false,
    highlightedCells: [],
    clearTypedWord: jest.fn(),
    submitTypedWord: jest.fn(),
  })),
}));

import { useKeyboardWordInput } from '../useKeyboardWordInput';

const mockUseKeyboardWordInput = useKeyboardWordInput as jest.Mock;

describe('useDrillKeyboardSupport', () => {
  const QUICK_TIP_STORAGE_KEY = 'lexiclash_drill_keyboard_tip_dismissed';
  const ENTER_HINT_STORAGE_KEY = 'lexiclash_drill_enter_hint_count';

  // Sample grid for testing
  const mockGrid: LetterGrid = [
    ['C', 'A', 'T', 'S'],
    ['D', 'O', 'G', 'S'],
    ['R', 'A', 'T', 'S'],
    ['B', 'I', 'R', 'D'],
  ];

  const defaultOptions = {
    grid: mockGrid,
    language: 'en' as const,
    enabled: true,
    onWordSubmit: jest.fn(),
    minWordLength: 2,
  };

  // Store original navigator
  const originalNavigator = window.navigator;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Mock desktop userAgent
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      writable: true,
    });

    // Reset mock to default state
    mockUseKeyboardWordInput.mockReturnValue({
      typedWord: '',
      isTypingMode: false,
      isValidOnGrid: false,
      highlightedCells: [],
      clearTypedWord: jest.fn(),
      submitTypedWord: jest.fn(),
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    jest.useRealTimers();
  });

  describe('desktop detection', () => {
    it('detects desktop devices correctly', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.isDesktop).toBe(true);
    });

    it('detects mobile devices (iPhone)', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' },
        writable: true,
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.isDesktop).toBe(false);
    });

    it('detects mobile devices (Android)', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G960U)' },
        writable: true,
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.isDesktop).toBe(false);
    });

    it('detects mobile devices (iPad)', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0)' },
        writable: true,
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.isDesktop).toBe(false);
    });
  });

  describe('useKeyboardWordInput integration', () => {
    it('passes correct options to useKeyboardWordInput', () => {
      renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(mockUseKeyboardWordInput).toHaveBeenCalledWith(
        expect.objectContaining({
          grid: mockGrid,
          language: 'en',
          minWordLength: 2,
        })
      );
    });

    it('disables keyboard input on mobile', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' },
        writable: true,
      });

      renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(mockUseKeyboardWordInput).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false, // Should be false on mobile
        })
      );
    });

    it('respects enabled option on desktop', () => {
      renderHook(() => useDrillKeyboardSupport({ ...defaultOptions, enabled: false }));

      expect(mockUseKeyboardWordInput).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('returns keyboard input values', () => {
      const mockClearTypedWord = jest.fn();
      const mockSubmitTypedWord = jest.fn();

      mockUseKeyboardWordInput.mockReturnValue({
        typedWord: 'CAT',
        isTypingMode: true,
        isValidOnGrid: true,
        highlightedCells: [{ row: 0, col: 0 }],
        clearTypedWord: mockClearTypedWord,
        submitTypedWord: mockSubmitTypedWord,
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.typedWord).toBe('CAT');
      expect(result.current.isTypingMode).toBe(true);
      expect(result.current.isValidOnGrid).toBe(true);
      expect(result.current.highlightedCells).toHaveLength(1);
      expect(result.current.clearTypedWord).toBe(mockClearTypedWord);
      expect(result.current.submitTypedWord).toBe(mockSubmitTypedWord);
    });
  });

  describe('quick tip state', () => {
    it('shows quick tip on first use after delay', () => {
      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      // Initially false
      expect(result.current.showQuickTip).toBe(false);

      // After 1 second delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.showQuickTip).toBe(true);
    });

    it('does not show quick tip when already dismissed', () => {
      localStorage.setItem(QUICK_TIP_STORAGE_KEY, 'true');

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.showQuickTip).toBe(false);
    });

    it('dismisses quick tip and persists to localStorage', () => {
      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.showQuickTip).toBe(true);

      act(() => {
        result.current.dismissQuickTip();
      });

      expect(result.current.showQuickTip).toBe(false);
      expect(localStorage.getItem(QUICK_TIP_STORAGE_KEY)).toBe('true');
    });

    it('does not show quick tip on mobile', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)' },
        writable: true,
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.showQuickTip).toBe(false);
    });

    it('does not show quick tip when not enabled', () => {
      const { result } = renderHook(() =>
        useDrillKeyboardSupport({ ...defaultOptions, enabled: false })
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.showQuickTip).toBe(false);
    });
  });

  describe('enter hint state', () => {
    it('does not show enter hint when not typing', () => {
      mockUseKeyboardWordInput.mockReturnValue({
        typedWord: '',
        isTypingMode: false,
        isValidOnGrid: false,
        highlightedCells: [],
        clearTypedWord: jest.fn(),
        submitTypedWord: jest.fn(),
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.showEnterHint).toBe(false);
    });

    it('does not show enter hint when max count reached', () => {
      localStorage.setItem(ENTER_HINT_STORAGE_KEY, '5');

      mockUseKeyboardWordInput.mockReturnValue({
        typedWord: 'CAT',
        isTypingMode: true,
        isValidOnGrid: true,
        highlightedCells: [],
        clearTypedWord: jest.fn(),
        submitTypedWord: jest.fn(),
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.showEnterHint).toBe(false);
    });

    it('does not show enter hint when not typing', () => {
      mockUseKeyboardWordInput.mockReturnValue({
        typedWord: '',
        isTypingMode: false,
        isValidOnGrid: false,
        highlightedCells: [],
        clearTypedWord: jest.fn(),
        submitTypedWord: jest.fn(),
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.showEnterHint).toBe(false);
    });

    it('does not show enter hint when word is too short', () => {
      mockUseKeyboardWordInput.mockReturnValue({
        typedWord: 'C',
        isTypingMode: true,
        isValidOnGrid: true,
        highlightedCells: [],
        clearTypedWord: jest.fn(),
        submitTypedWord: jest.fn(),
      });

      const { result } = renderHook(() =>
        useDrillKeyboardSupport({ ...defaultOptions, minWordLength: 3 })
      );

      expect(result.current.showEnterHint).toBe(false);
    });

    it('does not show enter hint when word is not valid on grid', () => {
      mockUseKeyboardWordInput.mockReturnValue({
        typedWord: 'CAT',
        isTypingMode: true,
        isValidOnGrid: false,
        highlightedCells: [],
        clearTypedWord: jest.fn(),
        submitTypedWord: jest.fn(),
      });

      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(result.current.showEnterHint).toBe(false);
    });

    it('dismisses enter hint permanently', () => {
      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      act(() => {
        result.current.dismissEnterHint();
      });

      expect(result.current.showEnterHint).toBe(false);
      expect(localStorage.getItem(ENTER_HINT_STORAGE_KEY)).toBe('5');
    });

    it('increments enter hint count', () => {
      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      act(() => {
        result.current.incrementEnterHintCount();
      });

      expect(localStorage.getItem(ENTER_HINT_STORAGE_KEY)).toBe('1');
    });
  });

  describe('return value interface', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      // From useKeyboardWordInput
      expect(result.current).toHaveProperty('typedWord');
      expect(result.current).toHaveProperty('isValidOnGrid');
      expect(result.current).toHaveProperty('highlightedCells');
      expect(result.current).toHaveProperty('clearTypedWord');
      expect(result.current).toHaveProperty('submitTypedWord');
      expect(result.current).toHaveProperty('isTypingMode');

      // Desktop detection
      expect(result.current).toHaveProperty('isDesktop');

      // Quick tip state
      expect(result.current).toHaveProperty('showQuickTip');
      expect(result.current).toHaveProperty('dismissQuickTip');

      // Enter hint state
      expect(result.current).toHaveProperty('showEnterHint');
      expect(result.current).toHaveProperty('incrementEnterHintCount');
      expect(result.current).toHaveProperty('dismissEnterHint');
    });

    it('returns correct types for all properties', () => {
      const { result } = renderHook(() => useDrillKeyboardSupport(defaultOptions));

      expect(typeof result.current.typedWord).toBe('string');
      expect(typeof result.current.isValidOnGrid).toBe('boolean');
      expect(Array.isArray(result.current.highlightedCells)).toBe(true);
      expect(typeof result.current.clearTypedWord).toBe('function');
      expect(typeof result.current.submitTypedWord).toBe('function');
      expect(typeof result.current.isTypingMode).toBe('boolean');
      expect(typeof result.current.isDesktop).toBe('boolean');
      expect(typeof result.current.showQuickTip).toBe('boolean');
      expect(typeof result.current.dismissQuickTip).toBe('function');
      expect(typeof result.current.showEnterHint).toBe('boolean');
      expect(typeof result.current.incrementEnterHintCount).toBe('function');
      expect(typeof result.current.dismissEnterHint).toBe('function');
    });
  });

  describe('callback stability', () => {
    it('has stable callback references', () => {
      const { result, rerender } = renderHook(() =>
        useDrillKeyboardSupport(defaultOptions)
      );

      const firstDismissQuickTip = result.current.dismissQuickTip;
      const firstDismissEnterHint = result.current.dismissEnterHint;
      const firstIncrementEnterHintCount = result.current.incrementEnterHintCount;

      rerender();

      expect(result.current.dismissQuickTip).toBe(firstDismissQuickTip);
      expect(result.current.dismissEnterHint).toBe(firstDismissEnterHint);
      expect(result.current.incrementEnterHintCount).toBe(firstIncrementEnterHintCount);
    });
  });
});
