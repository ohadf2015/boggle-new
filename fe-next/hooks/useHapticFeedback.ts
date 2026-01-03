'use client';

import { useCallback } from 'react';
import { useHapticsEnabled } from '@/contexts/AccessibilityContext';
import {
  triggerHaptic,
  triggerCustomHaptic,
  isHapticSupported,
  type HapticPattern
} from '@/utils/hapticFeedback';

/**
 * Hook for triggering haptic feedback with accessibility support
 *
 * Respects the user's haptic feedback setting from AccessibilityContext.
 * When disabled, all haptic functions become no-ops.
 *
 * @example
 * const { haptic, customHaptic, isSupported } = useHapticFeedback();
 *
 * // On word submit
 * if (isValid) {
 *   haptic('success');
 * } else {
 *   haptic('error');
 * }
 *
 * // Custom pattern for combo
 * customHaptic([20, 30, 20, 30, 50]);
 */
export function useHapticFeedback() {
  const hapticsEnabled = useHapticsEnabled();

  /**
   * Trigger a predefined haptic pattern
   * Returns true if haptic was triggered, false if disabled or unsupported
   */
  const haptic = useCallback((pattern: HapticPattern): boolean => {
    if (!hapticsEnabled) return false;
    return triggerHaptic(pattern);
  }, [hapticsEnabled]);

  /**
   * Trigger a custom haptic vibration pattern
   * Returns true if haptic was triggered, false if disabled or unsupported
   */
  const customHaptic = useCallback((duration: number | number[]): boolean => {
    if (!hapticsEnabled) return false;
    return triggerCustomHaptic(duration);
  }, [hapticsEnabled]);

  /**
   * Check if haptic feedback is available (enabled + device support)
   */
  const isSupported = hapticsEnabled && isHapticSupported();

  return {
    /** Trigger predefined haptic pattern */
    haptic,
    /** Trigger custom vibration pattern */
    customHaptic,
    /** Whether haptics are available (enabled + supported) */
    isSupported,
    /** Whether user has haptics enabled (from settings) */
    hapticsEnabled,
  };
}

/**
 * Predefined haptic patterns for common game events
 *
 * Usage:
 * const { customHaptic } = useHapticFeedback();
 * customHaptic(GAME_HAPTICS.validWord);
 */
export const GAME_HAPTICS = {
  /** Light success tap for valid word */
  validWord: 10,
  /** Error double-tap for invalid word */
  invalidWord: [15, 50, 15] as number[],
  /** Triple-tap celebration for combo level up */
  comboLevelUp: [10, 30, 10, 30, 50] as number[],
  /** Light tap for letter selection */
  letterSelect: 8,
  /** Medium tap for word submission */
  wordSubmit: 15,
  /** Strong tap for achievement unlock */
  achievement: [20, 30, 20] as number[],
  /** Legendary celebration pattern */
  legendary: [30, 50, 30, 50, 30, 50, 100] as number[],
  /** Light selection tap */
  selection: 12,
  /** Button press feedback */
  buttonPress: 10,
} as const;

export default useHapticFeedback;
