/**
 * Native Haptics Hook
 * React hook wrapper for native haptic feedback utilities
 */

import { useCallback } from 'react';
import {
  vibrateTap as nativeVibrateTap,
  vibrateSuccess as nativeVibrateSuccess,
  vibrateError as nativeVibrateError,
} from '../utils/nativeHaptics';

interface UseNativeHapticsReturn {
  /**
   * Trigger light tap haptic (button press, selection)
   */
  vibrateTap: () => Promise<void>;

  /**
   * Trigger success haptic pattern
   */
  vibrateSuccess: () => Promise<void>;

  /**
   * Trigger error haptic pattern
   */
  vibrateError: () => Promise<void>;
}

/**
 * Hook to access native haptic feedback with web fallback
 * Provides stable callback references
 *
 * @returns Haptic feedback methods
 *
 * @example
 * const { vibrateTap, vibrateSuccess, vibrateError } = useNativeHaptics();
 *
 * // On button press
 * await vibrateTap();
 *
 * // On success
 * await vibrateSuccess();
 *
 * // On error
 * await vibrateError();
 */
export function useNativeHaptics(): UseNativeHapticsReturn {
  const vibrateTap = useCallback(async () => {
    try {
      await nativeVibrateTap();
    } catch {
      // Silently fail - haptics are non-critical
    }
  }, []);

  const vibrateSuccess = useCallback(async () => {
    try {
      await nativeVibrateSuccess();
    } catch {
      // Silently fail - haptics are non-critical
    }
  }, []);

  const vibrateError = useCallback(async () => {
    try {
      await nativeVibrateError();
    } catch {
      // Silently fail - haptics are non-critical
    }
  }, []);

  return {
    vibrateTap,
    vibrateSuccess,
    vibrateError,
  };
}
