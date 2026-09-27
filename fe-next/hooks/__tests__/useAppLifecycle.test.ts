/**
 * Tests for useAppLifecycle Hook
 * Comprehensive test coverage for app foreground/background lifecycle events
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppLifecycle } from '../useAppLifecycle';
import * as platformUtils from '../../utils/platform';

// Define PluginListenerHandle type locally
interface PluginListenerHandle {
  remove: () => void;
}

// Mock platform detection
vi.mock('../../utils/platform');

// Mock addListener for the App plugin
const mockAddListener = vi.fn();

describe('useAppLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up globalThis.Capacitor with App plugin
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        App: {
          addListener: mockAddListener,
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  describe('Native Environment', () => {
    beforeEach(() => {
      (platformUtils.isNative as any).mockReturnValue(true);
    });

    it('should register appStateChange listener on mount', async () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();

      mockAddListener.mockResolvedValue({
        remove: vi.fn(),
      } as PluginListenerHandle);

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAddListener).toHaveBeenCalledWith(
        'appStateChange',
        expect.any(Function)
      );
    });

    it('should call onForeground when app becomes active', async () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      mockAddListener.mockImplementation(async (event: string, callback: any) => {
        capturedCallback = callback;
        return { remove: vi.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate app becoming active
      capturedCallback({ isActive: true });

      expect(onForeground).toHaveBeenCalledTimes(1);
      expect(onBackground).not.toHaveBeenCalled();
    });

    it('should call onBackground when app becomes inactive', async () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      mockAddListener.mockImplementation(async (event: string, callback: any) => {
        capturedCallback = callback;
        return { remove: vi.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate app becoming inactive
      capturedCallback({ isActive: false });

      expect(onBackground).toHaveBeenCalledTimes(1);
      expect(onForeground).not.toHaveBeenCalled();
    });

    it('should handle multiple state changes', async () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      mockAddListener.mockImplementation(async (event: string, callback: any) => {
        capturedCallback = callback;
        return { remove: vi.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      capturedCallback({ isActive: false });
      capturedCallback({ isActive: true });
      capturedCallback({ isActive: false });
      capturedCallback({ isActive: true });

      expect(onBackground).toHaveBeenCalledTimes(2);
      expect(onForeground).toHaveBeenCalledTimes(2);
    });

    it('should clean up listener on unmount', async () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();
      const removeMock = vi.fn();

      mockAddListener.mockResolvedValue({
        remove: removeMock,
      } as PluginListenerHandle);

      const { unmount } = renderHook(() =>
        useAppLifecycle({ onForeground, onBackground })
      );

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      unmount();

      expect(removeMock).toHaveBeenCalledTimes(1);
    });

    it('should not crash if callbacks throw errors', async () => {
      const onForeground = vi.fn().mockImplementation(() => {
        throw new Error('Foreground error');
      });
      const onBackground = vi.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      mockAddListener.mockImplementation(async (event: string, callback: any) => {
        capturedCallback = callback;
        return { remove: vi.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(() => {
        capturedCallback({ isActive: true });
      }).not.toThrow();
    });

    it('should handle optional callbacks', async () => {
      const onForeground = vi.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      mockAddListener.mockImplementation(async (event: string, callback: any) => {
        capturedCallback = callback;
        return { remove: vi.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(() => {
        capturedCallback({ isActive: false });
      }).not.toThrow();
    });
  });

  describe('Web Environment', () => {
    beforeEach(() => {
      (platformUtils.isNative as any).mockReturnValue(false);
    });

    it('should not register listeners on web', () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('should not throw on unmount on web', () => {
      const onForeground = vi.fn();
      const onBackground = vi.fn();

      const { unmount } = renderHook(() =>
        useAppLifecycle({ onForeground, onBackground })
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Callback Stability', () => {
    beforeEach(() => {
      (platformUtils.isNative as any).mockReturnValue(true);
    });

    it('should use latest callback reference', async () => {
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      mockAddListener.mockImplementation(async (event: string, callback: any) => {
        capturedCallback = callback;
        return { remove: vi.fn() } as PluginListenerHandle;
      });

      const firstCallback = vi.fn();
      const { rerender } = renderHook(
        ({ onForeground }) => useAppLifecycle({ onForeground }),
        {
          initialProps: { onForeground: firstCallback },
        }
      );

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      const secondCallback = vi.fn();
      rerender({ onForeground: secondCallback });

      capturedCallback({ isActive: true });

      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (platformUtils.isNative as any).mockReturnValue(true);
    });

    it('should handle App.addListener throwing error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      const onForeground = vi.fn();

      mockAddListener.mockRejectedValue(
        new Error('Listener registration failed')
      );

      expect(() => {
        renderHook(() => useAppLifecycle({ onForeground }));
      }).not.toThrow();

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 0));

      consoleErrorSpy.mockRestore();
    });

    it('should handle cleanup error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      const onForeground = vi.fn();

      mockAddListener.mockResolvedValue({
        remove: vi.fn().mockImplementation(() => {
          throw new Error('Cleanup failed');
        }),
      } as PluginListenerHandle);

      const { unmount } = renderHook(() => useAppLifecycle({ onForeground }));

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(() => unmount()).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
