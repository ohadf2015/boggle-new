/**
 * Tests for useOnlineStatus hook
 *
 * Tests network status monitoring via browser online/offline events.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  describe('initial state', () => {
    it('should return true when navigator.onLine is true', () => {
      // GIVEN
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // WHEN
      const { result } = renderHook(() => useOnlineStatus());

      // THEN
      expect(result.current).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      // GIVEN
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // WHEN
      const { result } = renderHook(() => useOnlineStatus());

      // THEN
      expect(result.current).toBe(false);
    });

    it('should return true when navigator is undefined (SSR)', () => {
      // GIVEN - temporarily remove navigator
      const originalNavigator = global.navigator;
      // @ts-expect-error - Intentionally undefined for SSR test
      delete global.navigator;

      // WHEN
      const { result } = renderHook(() => useOnlineStatus());

      // THEN
      expect(result.current).toBe(true);

      // Cleanup
      global.navigator = originalNavigator;
    });
  });

  describe('event listeners', () => {
    it('should update to true when online event fires', () => {
      // GIVEN
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(false);

      // WHEN
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // THEN
      expect(result.current).toBe(true);
    });

    it('should update to false when offline event fires', () => {
      // GIVEN
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);

      // WHEN
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // THEN
      expect(result.current).toBe(false);
    });

    it('should handle multiple state transitions', () => {
      // GIVEN
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      const { result } = renderHook(() => useOnlineStatus());

      // WHEN/THEN - multiple transitions
      expect(result.current).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(result.current).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      // GIVEN
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useOnlineStatus());

      // WHEN
      unmount();

      // THEN
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      // Cleanup
      removeEventListenerSpy.mockRestore();
    });

    it('should not respond to events after unmount', () => {
      // GIVEN
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      const { result, unmount } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);

      // WHEN
      unmount();
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // THEN - should still be true (not updated after unmount)
      expect(result.current).toBe(true);
    });
  });
});
