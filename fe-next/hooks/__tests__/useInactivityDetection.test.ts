/**
 * Tests for useInactivityDetection hook
 *
 * This hook detects user inactivity for Lexi stuck detection (DEBT-04).
 * After a configurable timeout (default 30s), it triggers a callback.
 * Activity is detected via DOM events (mousemove, keydown, touchstart, click).
 * A manual reset function is provided for game actions (word submissions).
 *
 * TDD RED phase: Tests written first, before implementation.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Will be created in GREEN phase
import { useInactivityDetection } from '../useInactivityDetection';

describe('useInactivityDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================
  // Basic Timeout Behavior
  // ============================================================

  describe('basic timeout behavior', () => {
    it('should call onInactive after timeout expires with no activity', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      // Not called initially
      expect(onInactive).not.toHaveBeenCalled();

      // Advance to just before timeout
      act(() => {
        vi.advanceTimersByTime(29999);
      });
      expect(onInactive).not.toHaveBeenCalled();

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should use default 30s timeout when not specified', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          onInactive,
        })
      );

      // Advance to just before default 30s timeout
      act(() => {
        vi.advanceTimersByTime(29999);
      });
      expect(onInactive).not.toHaveBeenCalled();

      // Advance past 30s
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should support custom timeout values', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000, // 10 seconds
          onInactive,
        })
      );

      act(() => {
        vi.advanceTimersByTime(9999);
      });
      expect(onInactive).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should only call onInactive once until reset', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
        })
      );

      // First timeout
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(onInactive).toHaveBeenCalledTimes(1);

      // Wait longer - should not call again
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      expect(onInactive).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Activity Reset via DOM Events
  // ============================================================

  describe('activity reset via DOM events', () => {
    it('should reset timer on mousemove', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      // Advance 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Mouse move resets timer
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
      });

      // Advance another 25 seconds (would be 50s total without reset)
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Should not have fired - timer was reset at 25s
      expect(onInactive).not.toHaveBeenCalled();

      // Advance remaining 5 seconds to complete 30s from reset
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on keydown', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      // Advance 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Keydown resets timer
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });

      // Advance another 29 seconds
      act(() => {
        vi.advanceTimersByTime(29000);
      });

      expect(onInactive).not.toHaveBeenCalled();

      // 1 more second to complete timeout from reset
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on touchstart', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      // Advance 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Touch resets timer
      act(() => {
        window.dispatchEvent(new TouchEvent('touchstart'));
      });

      // Would have fired without reset
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('should reset timer on click', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      // Advance 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Click resets timer
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      // Would have fired without reset
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('should use default events when not specified', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          // No events specified - should use defaults
        })
      );

      // All default events should work
      const defaultEvents = ['mousemove', 'keydown', 'touchstart', 'click'];

      for (const eventType of defaultEvents) {
        act(() => {
          vi.advanceTimersByTime(9000);
        });

        act(() => {
          if (eventType === 'keydown') {
            window.dispatchEvent(new KeyboardEvent(eventType));
          } else if (eventType === 'touchstart') {
            window.dispatchEvent(new TouchEvent(eventType));
          } else {
            window.dispatchEvent(new MouseEvent(eventType));
          }
        });
      }

      // Should not have fired - kept resetting
      expect(onInactive).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Custom Events
  // ============================================================

  describe('custom events', () => {
    it('should listen to custom events array', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          events: ['scroll'], // Only listen to scroll
        })
      );

      // Advance 9 seconds
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      // Scroll resets
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      // Another 9 seconds
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      expect(onInactive).not.toHaveBeenCalled();

      // Mouse move should NOT reset (not in custom events)
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should ignore events not in custom array', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          events: ['scroll'],
        })
      );

      // Advance 9 seconds
      act(() => {
        vi.advanceTimersByTime(9000);
      });

      // Click should NOT reset (not in custom events)
      act(() => {
        window.dispatchEvent(new MouseEvent('click'));
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Manual Reset Function
  // ============================================================

  describe('manual reset function', () => {
    it('should provide reset function that resets timer', () => {
      const onInactive = vi.fn();

      const { result } = renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      // Advance 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Manual reset
      act(() => {
        result.current.reset();
      });

      // Advance another 25 seconds
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Should not have fired - timer was reset
      expect(onInactive).not.toHaveBeenCalled();

      // Complete timeout from reset
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should reset timer after onInactive was called', () => {
      const onInactive = vi.fn();

      const { result } = renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
        })
      );

      // First timeout fires
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(onInactive).toHaveBeenCalledTimes(1);

      // Manual reset restarts timer
      act(() => {
        result.current.reset();
      });

      // Wait another timeout period
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should fire again
      expect(onInactive).toHaveBeenCalledTimes(2);
    });

    it('should return stable reset function reference', () => {
      const onInactive = vi.fn();

      const { result, rerender } = renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      const firstReset = result.current.reset;

      rerender();

      expect(result.current.reset).toBe(firstReset);
    });
  });

  // ============================================================
  // Last Activity Timestamp
  // ============================================================

  describe('lastActivity timestamp', () => {
    it('should return lastActivity timestamp', () => {
      const onInactive = vi.fn();
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      expect(result.current.lastActivity).toBeGreaterThanOrEqual(now);
    });

    it('should update lastActivity on DOM events', () => {
      const onInactive = vi.fn();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result } = renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      const initialActivity = result.current.lastActivity;

      // Advance time
      vi.setSystemTime(startTime + 5000);

      // Trigger activity
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
      });

      expect(result.current.lastActivity).toBeGreaterThan(initialActivity);
    });

    it('should update lastActivity on manual reset', () => {
      const onInactive = vi.fn();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result } = renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      const initialActivity = result.current.lastActivity;

      // Advance time
      vi.setSystemTime(startTime + 5000);

      // Manual reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.lastActivity).toBeGreaterThan(initialActivity);
    });
  });

  // ============================================================
  // Enabled/Disabled Toggle
  // ============================================================

  describe('enabled/disabled toggle', () => {
    it('should not run timer when enabled=false', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          enabled: false,
        })
      );

      // Advance well past timeout
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('should default to enabled=true', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          // enabled not specified - should default to true
        })
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should clear timer when enabled changes true -> false', () => {
      const onInactive = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useInactivityDetection({
            timeout: 10000,
            onInactive,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      // Advance 8 seconds
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      // Disable
      rerender({ enabled: false });

      // Advance past original timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('should start timer when enabled changes false -> true', () => {
      const onInactive = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useInactivityDetection({
            timeout: 10000,
            onInactive,
            enabled,
          }),
        { initialProps: { enabled: false } }
      );

      // Wait while disabled
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(onInactive).not.toHaveBeenCalled();

      // Enable
      rerender({ enabled: true });

      // Wait for timeout from enable point
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should not listen to events when disabled', () => {
      const onInactive = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          enabled: false,
        })
      );

      // Should not have added any activity listeners
      const activityEvents = ['mousemove', 'keydown', 'touchstart', 'click'];
      const addedActivityListeners = addEventListenerSpy.mock.calls.filter(
        (call) => activityEvents.includes(call[0] as string)
      );

      expect(addedActivityListeners).toHaveLength(0);

      addEventListenerSpy.mockRestore();
    });
  });

  // ============================================================
  // Cleanup
  // ============================================================

  describe('cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const onInactive = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useInactivityDetection({
          timeout: 30000,
          onInactive,
        })
      );

      unmount();

      // Should have removed listeners for default events
      const removedEvents = removeEventListenerSpy.mock.calls.map(
        (call) => call[0]
      );
      expect(removedEvents).toContain('mousemove');
      expect(removedEvents).toContain('keydown');
      expect(removedEvents).toContain('touchstart');
      expect(removedEvents).toContain('click');

      removeEventListenerSpy.mockRestore();
    });

    it('should clear timer on unmount', () => {
      const onInactive = vi.fn();

      const { unmount } = renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
        })
      );

      // Advance 8 seconds
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      // Unmount
      unmount();

      // Advance past original timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not have fired - timer was cleaned up
      expect(onInactive).not.toHaveBeenCalled();
    });

    it('should cleanup custom event listeners on unmount', () => {
      const onInactive = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          events: ['scroll', 'focus'],
        })
      );

      unmount();

      const removedEvents = removeEventListenerSpy.mock.calls.map(
        (call) => call[0]
      );
      expect(removedEvents).toContain('scroll');
      expect(removedEvents).toContain('focus');

      removeEventListenerSpy.mockRestore();
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('edge cases', () => {
    it('should handle rapid activity events', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
        })
      );

      // Rapid events
      for (let i = 0; i < 100; i++) {
        act(() => {
          vi.advanceTimersByTime(50);
          window.dispatchEvent(new MouseEvent('mousemove'));
        });
      }

      // Should not have fired despite 5 seconds passing
      expect(onInactive).not.toHaveBeenCalled();

      // Now stop activity and wait
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout of 0', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 0,
          onInactive,
        })
      );

      // Should fire immediately (or very quickly)
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('should handle onInactive callback changes', () => {
      const onInactive1 = vi.fn();
      const onInactive2 = vi.fn();

      const { rerender } = renderHook(
        ({ onInactive }) =>
          useInactivityDetection({
            timeout: 10000,
            onInactive,
          }),
        { initialProps: { onInactive: onInactive1 } }
      );

      // Advance 8 seconds
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      // Change callback
      rerender({ onInactive: onInactive2 });

      // Complete timeout
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should call the new callback
      expect(onInactive1).not.toHaveBeenCalled();
      expect(onInactive2).toHaveBeenCalledTimes(1);
    });

    it('should handle empty events array', () => {
      const onInactive = vi.fn();

      renderHook(() =>
        useInactivityDetection({
          timeout: 10000,
          onInactive,
          events: [], // No events to listen to
        })
      );

      // Activity should not reset timer since no events are listened to
      act(() => {
        vi.advanceTimersByTime(9000);
        window.dispatchEvent(new MouseEvent('mousemove'));
        vi.advanceTimersByTime(1000);
      });

      expect(onInactive).toHaveBeenCalledTimes(1);
    });
  });
});
