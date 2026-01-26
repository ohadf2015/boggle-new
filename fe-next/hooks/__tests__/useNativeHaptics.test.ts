/**
 * Tests for useNativeHaptics Hook
 * Comprehensive test coverage for native haptics React hook wrapper
 */

import { renderHook, act } from '@testing-library/react';
import { useNativeHaptics } from '../useNativeHaptics';
import * as nativeHaptics from '../../utils/nativeHaptics';

// Mock native haptics utility
jest.mock('../../utils/nativeHaptics', () => ({
  vibrateTap: jest.fn().mockResolvedValue(undefined),
  vibrateSuccess: jest.fn().mockResolvedValue(undefined),
  vibrateError: jest.fn().mockResolvedValue(undefined),
}));

describe('useNativeHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('vibrateTap', () => {
    it('should call nativeHaptics.vibrateTap', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      await act(async () => {
        await result.current.vibrateTap();
      });

      expect(nativeHaptics.vibrateTap).toHaveBeenCalledTimes(1);
    });

    it('should return a promise', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      const resultPromise = result.current.vibrateTap();

      expect(resultPromise).toBeInstanceOf(Promise);
      await resultPromise;
    });

    it('should not throw if nativeHaptics.vibrateTap throws', async () => {
      (nativeHaptics.vibrateTap as jest.Mock).mockRejectedValueOnce(
        new Error('Haptics failed')
      );

      const { result } = renderHook(() => useNativeHaptics());

      await expect(
        act(async () => {
          await result.current.vibrateTap();
        })
      ).resolves.not.toThrow();
    });
  });

  describe('vibrateSuccess', () => {
    it('should call nativeHaptics.vibrateSuccess', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      await act(async () => {
        await result.current.vibrateSuccess();
      });

      expect(nativeHaptics.vibrateSuccess).toHaveBeenCalledTimes(1);
    });

    it('should return a promise', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      const resultPromise = result.current.vibrateSuccess();

      expect(resultPromise).toBeInstanceOf(Promise);
      await resultPromise;
    });

    it('should not throw if nativeHaptics.vibrateSuccess throws', async () => {
      (nativeHaptics.vibrateSuccess as jest.Mock).mockRejectedValueOnce(
        new Error('Haptics failed')
      );

      const { result } = renderHook(() => useNativeHaptics());

      await expect(
        act(async () => {
          await result.current.vibrateSuccess();
        })
      ).resolves.not.toThrow();
    });
  });

  describe('vibrateError', () => {
    it('should call nativeHaptics.vibrateError', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      await act(async () => {
        await result.current.vibrateError();
      });

      expect(nativeHaptics.vibrateError).toHaveBeenCalledTimes(1);
    });

    it('should return a promise', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      const resultPromise = result.current.vibrateError();

      expect(resultPromise).toBeInstanceOf(Promise);
      await resultPromise;
    });

    it('should not throw if nativeHaptics.vibrateError throws', async () => {
      (nativeHaptics.vibrateError as jest.Mock).mockRejectedValueOnce(
        new Error('Haptics failed')
      );

      const { result } = renderHook(() => useNativeHaptics());

      await expect(
        act(async () => {
          await result.current.vibrateError();
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Callback Stability', () => {
    it('should have stable callback references', () => {
      const { result, rerender } = renderHook(() => useNativeHaptics());

      const firstVibrateTap = result.current.vibrateTap;
      const firstVibrateSuccess = result.current.vibrateSuccess;
      const firstVibrateError = result.current.vibrateError;

      rerender();

      expect(result.current.vibrateTap).toBe(firstVibrateTap);
      expect(result.current.vibrateSuccess).toBe(firstVibrateSuccess);
      expect(result.current.vibrateError).toBe(firstVibrateError);
    });
  });

  describe('Return Value Interface', () => {
    it('should return all expected methods', () => {
      const { result } = renderHook(() => useNativeHaptics());

      expect(result.current).toHaveProperty('vibrateTap');
      expect(result.current).toHaveProperty('vibrateSuccess');
      expect(result.current).toHaveProperty('vibrateError');
      expect(typeof result.current.vibrateTap).toBe('function');
      expect(typeof result.current.vibrateSuccess).toBe('function');
      expect(typeof result.current.vibrateError).toBe('function');
    });
  });

  describe('Multiple Calls', () => {
    it('should handle multiple sequential calls', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      await act(async () => {
        await result.current.vibrateTap();
        await result.current.vibrateSuccess();
        await result.current.vibrateError();
      });

      expect(nativeHaptics.vibrateTap).toHaveBeenCalledTimes(1);
      expect(nativeHaptics.vibrateSuccess).toHaveBeenCalledTimes(1);
      expect(nativeHaptics.vibrateError).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid repeated calls', async () => {
      const { result } = renderHook(() => useNativeHaptics());

      await act(async () => {
        await Promise.all([
          result.current.vibrateTap(),
          result.current.vibrateTap(),
          result.current.vibrateTap(),
        ]);
      });

      expect(nativeHaptics.vibrateTap).toHaveBeenCalledTimes(3);
    });
  });
});
