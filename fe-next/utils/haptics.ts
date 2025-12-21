/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for mobile devices using the Vibration API
 */

import logger from '@/utils/logger';

// Check if vibration is supported
const isVibrationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
};

// User preference for haptics (stored in localStorage)
const HAPTICS_ENABLED_KEY = 'lexiclash_haptics_enabled';

/**
 * Check if haptics are enabled in user settings
 */
export const isHapticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!isVibrationSupported()) return false;

  const stored = localStorage.getItem(HAPTICS_ENABLED_KEY);
  // Default to enabled if not set
  return stored === null ? true : stored === 'true';
};

/**
 * Enable or disable haptic feedback
 */
export const setHapticsEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
};

/**
 * Trigger a vibration pattern
 * @param pattern - Single number (duration in ms) or array of durations
 */
const vibrate = (pattern: number | number[]): boolean => {
  if (!isHapticsEnabled()) return false;

  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    logger.debug('[Haptics] Vibration failed:', error);
    return false;
  }
};

/**
 * Light tap - for successful word submission
 * Short, subtle vibration
 */
export const hapticWordAccepted = (): boolean => {
  return vibrate(15);
};

/**
 * Medium tap - for combo milestone or achievement
 * Slightly longer vibration
 */
export const hapticComboMilestone = (): boolean => {
  return vibrate(25);
};

/**
 * Double tap - for high-value word (5+ letters)
 * Two quick vibrations
 */
export const hapticHighValueWord = (): boolean => {
  return vibrate([15, 50, 15]);
};

/**
 * Error pattern - for invalid word
 * Short double pulse
 */
export const hapticError = (): boolean => {
  return vibrate([10, 30, 10]);
};

/**
 * Success pattern - for game win
 * Celebratory pattern
 */
export const hapticGameWin = (): boolean => {
  return vibrate([30, 50, 30, 50, 50]);
};

/**
 * Achievement unlock - satisfying pattern
 */
export const hapticAchievement = (): boolean => {
  return vibrate([20, 30, 40]);
};

/**
 * Timer warning - urgent pattern at low time
 */
export const hapticTimerWarning = (): boolean => {
  return vibrate(10);
};

/**
 * Score-based haptic feedback
 * Intensity scales with word value
 */
export const hapticForWordScore = (wordLength: number): boolean => {
  if (wordLength >= 7) {
    // Long word - triple pulse
    return vibrate([20, 30, 20, 30, 20]);
  } else if (wordLength >= 5) {
    // Medium-long word - double pulse
    return vibrate([15, 40, 15]);
  } else {
    // Normal word - single tap
    return vibrate(12);
  }
};

/**
 * Combo-based haptic feedback
 * Intensity increases with combo level
 */
export const hapticForComboLevel = (comboLevel: number): boolean => {
  if (comboLevel >= 10) {
    // Max combo - intense pattern
    return vibrate([25, 25, 25, 25, 25]);
  } else if (comboLevel >= 5) {
    // High combo - double tap
    return vibrate([20, 40, 20]);
  } else if (comboLevel >= 3) {
    // Building combo - single tap
    return vibrate(18);
  }
  // Low combo - subtle tap
  return vibrate(10);
};

const haptics = {
  isSupported: isVibrationSupported,
  isEnabled: isHapticsEnabled,
  setEnabled: setHapticsEnabled,
  wordAccepted: hapticWordAccepted,
  comboMilestone: hapticComboMilestone,
  highValueWord: hapticHighValueWord,
  error: hapticError,
  gameWin: hapticGameWin,
  achievement: hapticAchievement,
  timerWarning: hapticTimerWarning,
  forWordScore: hapticForWordScore,
  forComboLevel: hapticForComboLevel,
};

export default haptics;
