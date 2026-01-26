/**
 * Tests for useAppLifecycle Hook
 * Comprehensive test coverage for app foreground/background lifecycle events
 */

import { renderHook } from '@testing-library/react';
import { useAppLifecycle } from '../useAppLifecycle';
import * as platformUtils from '../../utils/platform';
import { App, type PluginListenerHandle } from '@capacitor/app';

// Mock platform detection
jest.mock('../../utils/platform');

// Mock Capacitor App plugin
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn(),
  },
}));

describe('useAppLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Native Environment', () => {
    beforeEach(() => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(true);
    });

    it('should register appStateChange listener on mount', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      expect(App.addListener).toHaveBeenCalledWith(
        'appStateChange',
        expect.any(Function)
      );
    });

    it('should call onForeground when app becomes active', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      (App.addListener as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return { remove: jest.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Simulate app becoming active
      capturedCallback({ isActive: true });

      expect(onForeground).toHaveBeenCalledTimes(1);
      expect(onBackground).not.toHaveBeenCalled();
    });

    it('should call onBackground when app becomes inactive', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      (App.addListener as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return { remove: jest.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      // Simulate app becoming inactive
      capturedCallback({ isActive: false });

      expect(onBackground).toHaveBeenCalledTimes(1);
      expect(onForeground).not.toHaveBeenCalled();
    });

    it('should handle multiple state changes', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      (App.addListener as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return { remove: jest.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      capturedCallback({ isActive: false });
      capturedCallback({ isActive: true });
      capturedCallback({ isActive: false });
      capturedCallback({ isActive: true });

      expect(onBackground).toHaveBeenCalledTimes(2);
      expect(onForeground).toHaveBeenCalledTimes(2);
    });

    it('should clean up listener on unmount', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();
      const removeMock = jest.fn();

      (App.addListener as jest.Mock).mockReturnValue({
        remove: removeMock,
      } as PluginListenerHandle);

      const { unmount } = renderHook(() =>
        useAppLifecycle({ onForeground, onBackground })
      );

      unmount();

      expect(removeMock).toHaveBeenCalledTimes(1);
    });

    it('should not crash if callbacks throw errors', () => {
      const onForeground = jest.fn().mockImplementation(() => {
        throw new Error('Foreground error');
      });
      const onBackground = jest.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      (App.addListener as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return { remove: jest.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      expect(() => {
        capturedCallback({ isActive: true });
      }).not.toThrow();
    });

    it('should handle optional callbacks', () => {
      const onForeground = jest.fn();
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      (App.addListener as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return { remove: jest.fn() } as PluginListenerHandle;
      });

      renderHook(() => useAppLifecycle({ onForeground }));

      expect(() => {
        capturedCallback({ isActive: false });
      }).not.toThrow();
    });
  });

  describe('Web Environment', () => {
    beforeEach(() => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(false);
    });

    it('should not register listeners on web', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();

      renderHook(() => useAppLifecycle({ onForeground, onBackground }));

      expect(App.addListener).not.toHaveBeenCalled();
    });

    it('should not throw on unmount on web', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();

      const { unmount } = renderHook(() =>
        useAppLifecycle({ onForeground, onBackground })
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Callback Stability', () => {
    beforeEach(() => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(true);
    });

    it('should use latest callback reference', () => {
      let capturedCallback: (state: { isActive: boolean }) => void = () => {};

      (App.addListener as jest.Mock).mockImplementation((event, callback) => {
        capturedCallback = callback;
        return { remove: jest.fn() } as PluginListenerHandle;
      });

      const firstCallback = jest.fn();
      const { rerender } = renderHook(
        ({ onForeground }) => useAppLifecycle({ onForeground }),
        {
          initialProps: { onForeground: firstCallback },
        }
      );

      const secondCallback = jest.fn();
      rerender({ onForeground: secondCallback });

      capturedCallback({ isActive: true });

      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(true);
    });

    it('should handle App.addListener throwing error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const onForeground = jest.fn();

      (App.addListener as jest.Mock).mockImplementation(() => {
        throw new Error('Listener registration failed');
      });

      expect(() => {
        renderHook(() => useAppLifecycle({ onForeground }));
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle cleanup error gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const onForeground = jest.fn();

      (App.addListener as jest.Mock).mockReturnValue({
        remove: jest.fn().mockImplementation(() => {
          throw new Error('Cleanup failed');
        }),
      } as PluginListenerHandle);

      const { unmount } = renderHook(() => useAppLifecycle({ onForeground }));

      expect(() => unmount()).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
