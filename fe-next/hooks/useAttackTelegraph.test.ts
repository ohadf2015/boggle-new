/**
 * useAttackTelegraph Tests
 *
 * Tests for the attack telegraph hook that manages
 * the 2-second countdown before boss attacks.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAttackTelegraph } from './useAttackTelegraph';

// Use fake timers for controlled testing
vi.useFakeTimers();

describe('useAttackTelegraph', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should start inactive', () => {
      const { result } = renderHook(() => useAttackTelegraph());
      expect(result.current.isActive).toBe(false);
    });

    it('should have 0 progress initially', () => {
      const { result } = renderHook(() => useAttackTelegraph());
      expect(result.current.progress).toBe(0);
    });

    it('should have empty target tiles', () => {
      const { result } = renderHook(() => useAttackTelegraph());
      expect(result.current.state.targetTiles).toEqual([]);
    });

    it('should have null ability ID initially', () => {
      const { result } = renderHook(() => useAttackTelegraph());
      expect(result.current.state.abilityId).toBeNull();
    });

    it('should have 0 time remaining initially', () => {
      const { result } = renderHook(() => useAttackTelegraph());
      expect(result.current.state.timeRemaining).toBe(0);
    });
  });

  describe('Starting Telegraph', () => {
    it('should activate when startTelegraph is called', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0, 1, 2]);
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should set ability ID', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('scramble', [3, 4]);
      });

      expect(result.current.state.abilityId).toBe('scramble');
    });

    it('should set target tiles', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [5, 6, 7, 8]);
      });

      expect(result.current.state.targetTiles).toEqual([5, 6, 7, 8]);
    });

    it('should set initial time remaining to duration', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      expect(result.current.state.timeRemaining).toBe(2000);
    });

    it('should set progress to 0 at start', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      expect(result.current.progress).toBe(0);
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress over time', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      // Advance 1 second (50% of 2s duration)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.progress).toBeGreaterThan(0.4);
      expect(result.current.progress).toBeLessThan(0.6);
    });

    it('should reach 100% progress after 2 seconds', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(result.current.progress).toBe(1);
    });

    it('should track time remaining', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      expect(result.current.state.timeRemaining).toBe(2000);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.state.timeRemaining).toBeLessThanOrEqual(1550);
      expect(result.current.state.timeRemaining).toBeGreaterThanOrEqual(1450);
    });

    it('should decrease time remaining to 0', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(result.current.state.timeRemaining).toBe(0);
    });
  });

  describe('Completion', () => {
    it('should deactivate after completion', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should call onComplete callback', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useAttackTelegraph({ onComplete }));

      act(() => {
        result.current.startTelegraph('special-attack', [1, 2, 3]);
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('special-attack', [1, 2, 3]);
    });

    it('should clear target tiles after completion', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0, 1]);
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(result.current.state.targetTiles).toEqual([]);
    });

    it('should clear ability ID after completion', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(result.current.state.abilityId).toBeNull();
    });
  });

  describe('Cancel', () => {
    it('should cancel active telegraph', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(500);
        result.current.cancelTelegraph();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('should not call onComplete when cancelled', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useAttackTelegraph({ onComplete }));

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(500);
        result.current.cancelTelegraph();
        vi.advanceTimersByTime(2000);
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should reset all state when cancelled', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [1, 2, 3]);
      });

      act(() => {
        vi.advanceTimersByTime(500);
        result.current.cancelTelegraph();
      });

      expect(result.current.state.targetTiles).toEqual([]);
      expect(result.current.state.abilityId).toBeNull();
      expect(result.current.state.timeRemaining).toBe(0);
    });
  });

  describe('Custom Duration', () => {
    it('should respect custom duration', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useAttackTelegraph({ duration: 1000, onComplete })
      );

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      // Should not complete at 900ms
      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(onComplete).not.toHaveBeenCalled();

      // Should complete at 1100ms
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(onComplete).toHaveBeenCalled();
    });

    it('should have correct initial time remaining with custom duration', () => {
      const { result } = renderHook(() =>
        useAttackTelegraph({ duration: 3000 })
      );

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      expect(result.current.state.timeRemaining).toBe(3000);
    });
  });

  describe('Restart Behavior', () => {
    it('should cancel previous telegraph when starting new one', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() => useAttackTelegraph({ onComplete }));

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.startTelegraph('attack-2', [1, 2]);
      });

      expect(result.current.state.abilityId).toBe('attack-2');
      expect(result.current.state.targetTiles).toEqual([1, 2]);

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      // Only the second attack should complete
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('attack-2', [1, 2]);
    });

    it('should reset progress when starting new telegraph', () => {
      const { result } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(result.current.progress).toBeGreaterThan(0.5);

      act(() => {
        result.current.startTelegraph('attack-2', [1]);
      });

      expect(result.current.progress).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup interval on unmount', () => {
      const { result, unmount } = renderHook(() => useAttackTelegraph());

      act(() => {
        result.current.startTelegraph('attack-1', [0]);
      });

      // Unmount during active telegraph
      unmount();

      // Should not throw or cause issues
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    });
  });
});
