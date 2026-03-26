/**
 * Tests for useAutoShowWithInteraction hook
 *
 * This hook controls auto-showing a modal/popup after:
 * 1. A minimum delay has passed (e.g., 5 seconds)
 * 2. The user has interacted with the page (click, scroll, keypress)
 *
 * Both conditions must be met before triggering.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoShowWithInteraction } from '../useAutoShowWithInteraction';

describe('useAutoShowWithInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not trigger before delay passes', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Simulate user interaction immediately
    act(() => {
      window.dispatchEvent(new MouseEvent('click'));
    });

    // Not enough time has passed
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('should not trigger if delay passes but no interaction', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // No interaction happened
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('should trigger when delay passes AND user clicks', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Now user interacts
    act(() => {
      window.dispatchEvent(new MouseEvent('click'));
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('should trigger when user interacts first, then delay passes', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // User interacts early
    act(() => {
      vi.advanceTimersByTime(2000);
      window.dispatchEvent(new MouseEvent('click'));
    });

    // onTrigger not called yet - delay hasn't passed
    expect(onTrigger).not.toHaveBeenCalled();

    // Now delay passes
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('should trigger on scroll interaction', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // User scrolls
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('should trigger on keypress interaction', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // User presses key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('should trigger on touchstart interaction', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // User touches screen
    act(() => {
      window.dispatchEvent(new TouchEvent('touchstart'));
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('should only trigger once', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Multiple interactions
    act(() => {
      window.dispatchEvent(new MouseEvent('click'));
      window.dispatchEvent(new MouseEvent('click'));
      window.dispatchEvent(new Event('scroll'));
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('should not trigger when disabled', () => {
    const onTrigger = vi.fn();
    renderHook(() => useAutoShowWithInteraction({
      enabled: false,
      delayMs: 5000,
      onTrigger,
    }));

    // Wait for delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // User interacts
    act(() => {
      window.dispatchEvent(new MouseEvent('click'));
    });

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const onTrigger = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useAutoShowWithInteraction({
      enabled: true,
      delayMs: 5000,
      onTrigger,
    }));

    unmount();

    // Should have removed listeners for click, scroll, keydown, touchstart
    expect(removeEventListenerSpy).toHaveBeenCalled();
    removeEventListenerSpy.mockRestore();
  });

  it('should reset when enabled changes from false to true', () => {
    const onTrigger = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useAutoShowWithInteraction({
        enabled,
        delayMs: 5000,
        onTrigger,
      }),
      { initialProps: { enabled: false } }
    );

    // First disabled, wait and interact - nothing happens
    act(() => {
      vi.advanceTimersByTime(5000);
      window.dispatchEvent(new MouseEvent('click'));
    });
    expect(onTrigger).not.toHaveBeenCalled();

    // Now enable
    rerender({ enabled: true });

    // Wait for delay and interact
    act(() => {
      vi.advanceTimersByTime(5000);
      window.dispatchEvent(new MouseEvent('click'));
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});
