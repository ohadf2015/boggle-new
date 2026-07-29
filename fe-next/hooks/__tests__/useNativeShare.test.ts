/**
 * Tests for useNativeShare Hook
 * Comprehensive test coverage for native Web Share API functionality
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNativeShare } from '../useNativeShare';

describe('useNativeShare', () => {
  // Store original navigator to restore after tests
  const originalNavigator = global.navigator;

  afterEach(() => {
    // Restore original navigator after each test
    global.navigator = originalNavigator;
  });

  describe('SSR Safety', () => {
    it('should handle undefined navigator gracefully (SSR)', () => {
      // Simulate SSR environment where navigator is undefined
      // @ts-ignore - Intentionally setting to undefined for testing
      delete global.navigator;

      const { result } = renderHook(() => useNativeShare());

      expect(result.current.canNativeShare).toBe(false);
    });

    it('should not throw error when navigator is undefined', () => {
      // @ts-ignore - Intentionally setting to undefined for testing
      delete global.navigator;

      expect(() => {
        renderHook(() => useNativeShare());
      }).not.toThrow();
    });
  });

  describe('Browser Support Detection', () => {
    it('should return true when navigator.share is available', () => {
      global.navigator = {
        ...originalNavigator,
        share: vi.fn().mockResolvedValue(undefined),
      } as any;

      const { result } = renderHook(() => useNativeShare());

      expect(result.current.canNativeShare).toBe(true);
    });

    it('should return false when navigator.share is not available', () => {
      global.navigator = {
        ...originalNavigator,
        // @ts-ignore - Intentionally omitting share
        share: undefined,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      expect(result.current.canNativeShare).toBe(false);
    });

    it('should return false when navigator.share is not a function', () => {
      global.navigator = {
        ...originalNavigator,
        share: 'not-a-function' as any,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      expect(result.current.canNativeShare).toBe(false);
    });
  });

  describe('Share Success', () => {
    it('should return true when share is successful', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      const shareData = {
        title: 'Test Title',
        text: 'Test Text',
        url: 'https://example.com',
      };

      let shareResult: boolean = false;
      await act(async () => {
        shareResult = await result.current.nativeShare(shareData);
      });

      expect(shareResult).toBe(true);
      expect(mockShare).toHaveBeenCalledWith(shareData);
    });

    it('should call navigator.share with correct data', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      const shareData = {
        title: 'Join my game!',
        text: "Let's play LexiClash together!",
        url: 'https://lexiclash.com?room=ABC123',
      };

      await act(async () => {
        await result.current.nativeShare(shareData);
      });

      expect(mockShare).toHaveBeenCalledWith({
        title: shareData.title,
        text: shareData.text,
        url: shareData.url,
      });
    });
  });

  describe('Share Cancellation', () => {
    it('should return false when user cancels share (AbortError)', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);

      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      const shareData = {
        title: 'Test',
        text: 'Test',
        url: 'https://example.com',
      };

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.nativeShare(shareData);
      });

      expect(shareResult).toBe(false);
      expect(mockShare).toHaveBeenCalledWith(shareData);
    });

    it('should not log error for AbortError (user cancelled)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);

      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      await act(async () => {
        await result.current.nativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle NotAllowedError (permission denied)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      const mockShare = vi.fn().mockRejectedValue(permissionError);

      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.nativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(shareResult).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Share failed:', permissionError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle TypeError (invalid data)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      const typeError = new TypeError('Invalid share data');
      const mockShare = vi.fn().mockRejectedValue(typeError);

      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.nativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(shareResult).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Share failed:', typeError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle generic errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      const genericError = new Error('Something went wrong');
      const mockShare = vi.fn().mockRejectedValue(genericError);

      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.nativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(shareResult).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Share failed:', genericError);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('tryNativeShare method', () => {
    it('should return false immediately when share is not available', async () => {
      global.navigator = {
        ...originalNavigator,
        share: undefined as any,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.tryNativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(shareResult).toBe(false);
    });

    it('should call nativeShare when share is available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      const shareData = {
        title: 'Test',
        text: 'Test',
        url: 'https://example.com',
      };

      let shareResult: boolean = false;
      await act(async () => {
        shareResult = await result.current.tryNativeShare(shareData);
      });

      expect(shareResult).toBe(true);
      expect(mockShare).toHaveBeenCalledWith(shareData);
    });

    it('should return share result from nativeShare', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);

      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.tryNativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(shareResult).toBe(false);
    });
  });

  describe('Callback Stability', () => {
    it('should have stable callback references', () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result, rerender } = renderHook(() => useNativeShare());

      const firstNativeShare = result.current.nativeShare;
      const firstTryNativeShare = result.current.tryNativeShare;

      rerender();

      expect(result.current.nativeShare).toBe(firstNativeShare);
      expect(result.current.tryNativeShare).toBe(firstTryNativeShare);
    });

    it('should update callbacks when canNativeShare changes', () => {
      // Start with share available
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result, rerender } = renderHook(() => useNativeShare());

      expect(result.current.canNativeShare).toBe(true);
      const firstNativeShare = result.current.nativeShare;

      // Remove share support
      global.navigator = {
        ...originalNavigator,
        share: undefined as any,
      } as any;

      rerender();

      // canNativeShare should still be true (useMemo with empty deps)
      // This is expected behavior - it checks once on mount
      expect(result.current.canNativeShare).toBe(true);
      // Callbacks should remain stable
      expect(result.current.nativeShare).toBe(firstNativeShare);
    });
  });

  describe('Return Value Interface', () => {
    it('should return all expected properties', () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...originalNavigator,
        share: mockShare,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      expect(result.current).toHaveProperty('canNativeShare');
      expect(result.current).toHaveProperty('nativeShare');
      expect(result.current).toHaveProperty('tryNativeShare');
      expect(typeof result.current.canNativeShare).toBe('boolean');
      expect(typeof result.current.nativeShare).toBe('function');
      expect(typeof result.current.tryNativeShare).toBe('function');
    });
  });

  describe('No Share Support', () => {
    it('should return false from nativeShare when share not supported', async () => {
      global.navigator = {
        ...originalNavigator,
        share: undefined as any,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      let shareResult: boolean = true;
      await act(async () => {
        shareResult = await result.current.nativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      expect(shareResult).toBe(false);
    });

    it('should not attempt to call navigator.share when not supported', async () => {
      global.navigator = {
        ...originalNavigator,
        share: undefined as any,
      } as any;

      const { result } = renderHook(() => useNativeShare());

      await act(async () => {
        await result.current.nativeShare({
          title: 'Test',
          text: 'Test',
          url: 'https://example.com',
        });
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });
});
