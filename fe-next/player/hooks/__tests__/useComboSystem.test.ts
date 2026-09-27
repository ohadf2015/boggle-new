import { vi, type Mock, } from 'vitest';
/**
 * Tests for useComboSystem hook
 *
 * Tests the combo chain and shield management functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useComboSystem } from '../useComboSystem';

// Mock timers
vi.useFakeTimers();

describe('useComboSystem', () => {
  const defaultOptions = {
    playComboSound: vi.fn(),
    onShieldUsed: vi.fn(),
    getValidWordCount: vi.fn(() => 0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      expect(result.current.state.level).toBe(0);
      expect(result.current.state.lastWordTime).toBeNull();
      expect(result.current.state.shieldsUsed).toBe(0);
    });
  });

  describe('incrementCombo', () => {
    it('should start combo at 1 for first word', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      act(() => {
        result.current.actions.incrementCombo();
      });

      // First word starts a new chain at level 1
      expect(result.current.state.level).toBe(1);
      expect(result.current.state.lastWordTime).not.toBeNull();
    });

    it('should increment combo for subsequent words within window', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      // First word
      act(() => {
        result.current.actions.incrementCombo();
      });

      // Second word quickly after
      act(() => {
        vi.advanceTimersByTime(1000); // 1 second later
        result.current.actions.incrementCombo();
      });

      expect(result.current.state.level).toBe(2);
    });

    it('should reset combo after window expires', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      // First word
      act(() => {
        result.current.actions.incrementCombo();
      });

      // Second word within window
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      expect(result.current.state.level).toBe(2);

      // Wait for combo to expire (base 6000 + level*1000 = 8000ms for level 2)
      act(() => {
        vi.advanceTimersByTime(9000); // Past the combo window
      });

      // Combo should decay to 0
      expect(result.current.state.level).toBe(0);
    });

    it('should play combo sound when combo increases', () => {
      const playComboSound = vi.fn();
      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, playComboSound })
      );

      // First word
      act(() => {
        result.current.actions.incrementCombo();
      });

      expect(playComboSound).toHaveBeenCalledWith(1);

      // Second word within window
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      expect(playComboSound).toHaveBeenCalledWith(2);
    });
  });

  describe('resetCombo', () => {
    it('should reset combo to 0', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      // Build up combo
      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      expect(result.current.state.level).toBeGreaterThan(0);

      // Reset combo
      act(() => {
        result.current.actions.resetCombo({ forceReset: true });
      });

      expect(result.current.state.level).toBe(0);
    });

    it('should use shield if available instead of resetting', () => {
      const onShieldUsed = vi.fn();
      const getValidWordCount = vi.fn(() => 15); // 1 shield available (15/10 = 1)

      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, onShieldUsed, getValidWordCount })
      );

      // Build up combo
      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      const comboLevelBefore = result.current.state.level;

      // Try to reset (should use shield)
      act(() => {
        const wasReset = result.current.actions.resetCombo();
        expect(wasReset).toBe(false); // Shield was used
      });

      expect(result.current.state.level).toBe(comboLevelBefore); // Combo preserved
      expect(onShieldUsed).toHaveBeenCalled();
      expect(result.current.state.shieldsUsed).toBe(1);
    });

    it('should force reset even with shields available', () => {
      const getValidWordCount = vi.fn(() => 15);

      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, getValidWordCount })
      );

      // Build up combo
      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      // Force reset
      act(() => {
        const wasReset = result.current.actions.resetCombo({ forceReset: true });
        expect(wasReset).toBe(true);
      });

      expect(result.current.state.level).toBe(0);
    });
  });

  describe('getAvailableShields', () => {
    it('should calculate shields based on valid word count', () => {
      const getValidWordCount = vi.fn(() => 25); // 2 shields (25/10 = 2)

      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, getValidWordCount })
      );

      expect(result.current.actions.getAvailableShields()).toBe(2);
    });

    it('should account for shields already used', () => {
      const getValidWordCount = vi.fn(() => 25);
      const onShieldUsed = vi.fn();

      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, getValidWordCount, onShieldUsed })
      );

      // Build combo and use a shield
      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });
      act(() => {
        result.current.actions.resetCombo(); // Uses 1 shield
      });

      // Should have 1 shield left (2 - 1 = 1)
      expect(result.current.actions.getAvailableShields()).toBe(1);
    });

    it('should return 0 when no valid words', () => {
      const getValidWordCount = vi.fn(() => 5); // Less than 10

      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, getValidWordCount })
      );

      expect(result.current.actions.getAvailableShields()).toBe(0);
    });
  });

  describe('resetForNewGame', () => {
    it('should reset all state for new game', () => {
      const getValidWordCount = vi.fn(() => 30);

      const { result } = renderHook(() =>
        useComboSystem({ ...defaultOptions, getValidWordCount })
      );

      // Build up state
      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });
      act(() => {
        result.current.actions.resetCombo(); // Use a shield
      });

      // Reset for new game
      act(() => {
        result.current.actions.resetForNewGame();
      });

      expect(result.current.state.level).toBe(0);
      expect(result.current.state.lastWordTime).toBeNull();
      expect(result.current.state.shieldsUsed).toBe(0);
    });
  });

  describe('getComboWindow', () => {
    it('should return base window for level 0', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      // Base window is 6000ms
      expect(result.current.actions.getComboWindow()).toBe(6000);
    });

    it('should increase window with combo level', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      // Build up combo
      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      // Window should be longer at higher combo levels
      const window = result.current.actions.getComboWindow();
      expect(window).toBeGreaterThan(6000);
    });
  });

  describe('refs', () => {
    it('should provide refs for external access', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      expect(result.current.refs.levelRef).toBeDefined();
      expect(result.current.refs.lastWordTimeRef).toBeDefined();
      expect(result.current.refs.timeoutRef).toBeDefined();
      expect(result.current.refs.shieldsUsedRef).toBeDefined();
    });

    it('should keep refs in sync with state', () => {
      const { result } = renderHook(() => useComboSystem(defaultOptions));

      act(() => {
        result.current.actions.incrementCombo();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.actions.incrementCombo();
      });

      expect(result.current.refs.levelRef.current).toBe(result.current.state.level);
    });
  });
});
