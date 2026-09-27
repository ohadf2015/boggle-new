/**
 * Haptic Feedback Utilities
 * Centralized haptic patterns for consistent mobile UX
 */

export type HapticPattern =
  | 'light' // Light tap (selection, button press)
  | 'medium' // Medium impact (navigation, toggle)
  | 'heavy' // Heavy impact (success, submission)
  | 'success' // Success pattern (double tap)
  | 'error' // Error pattern (short-long-short)
  | 'warning' // Warning pattern (single medium)
  | 'selection' // Item selection in list
  | 'swipe' // Swipe gesture confirmation;

interface HapticConfig {
  pattern: number | number[];
}

const HAPTIC_PATTERNS: Record<HapticPattern, HapticConfig> = {
  light: { pattern: 10 },
  medium: { pattern: 20 },
  heavy: { pattern: 40 },
  success: { pattern: [20, 30, 20] },
  error: { pattern: [30, 50, 100, 50, 30] },
  warning: { pattern: 30 },
  selection: { pattern: 15 },
  swipe: { pattern: 12 },
};

/**
 * Trigger haptic feedback with a predefined pattern
 *
 * @param pattern - The haptic pattern to trigger
 * @returns true if haptic was triggered, false if not supported
 *
 * @example
 * triggerHaptic('success'); // Double tap for success
 * triggerHaptic('light'); // Light tap for button press
 */
export function triggerHaptic(pattern: HapticPattern): boolean {
  // Client components still render once on the server — bail before touching window.
  if (typeof window === 'undefined' || !window.navigator?.vibrate) {
    return false;
  }

  const config = HAPTIC_PATTERNS[pattern];
  window.navigator.vibrate(config.pattern);
  return true;
}

/**
 * Trigger custom haptic feedback with specific duration(s)
 *
 * @param duration - Single duration or array of durations (vibrate-pause-vibrate)
 * @returns true if haptic was triggered, false if not supported
 *
 * @example
 * triggerCustomHaptic(50); // Single 50ms vibration
 * triggerCustomHaptic([100, 50, 100]); // Vibrate-pause-vibrate pattern
 */
export function triggerCustomHaptic(duration: number | number[]): boolean {
  if (typeof window === 'undefined' || !window.navigator?.vibrate) {
    return false;
  }

  window.navigator.vibrate(duration);
  return true;
}

/**
 * Check if haptic feedback is supported on the device
 */
export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.navigator?.vibrate);
}

/**
 * Stop any ongoing haptic feedback
 */
export function stopHaptic(): void {
  if (typeof window === 'undefined') return;
  if (window.navigator?.vibrate) {
    window.navigator.vibrate(0);
  }
}
