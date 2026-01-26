/**
 * Native Haptics Utility
 * Provides native haptic feedback with graceful web fallback
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './platform';
import { triggerHaptic } from './hapticFeedback';

/**
 * Trigger light tap haptic (button press, selection)
 * Uses native Capacitor Haptics on mobile, falls back to web vibration API
 */
export async function vibrateTap(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    } catch (error) {
      // Native haptics failed, fall back to web
    }
  }

  // Web fallback
  triggerHaptic('light');
}

/**
 * Trigger success haptic pattern
 * Uses native Capacitor Haptics on mobile, falls back to web vibration API
 */
export async function vibrateSuccess(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
      return;
    } catch (error) {
      // Native haptics failed, fall back to web
    }
  }

  // Web fallback
  triggerHaptic('success');
}

/**
 * Trigger error haptic pattern
 * Uses native Capacitor Haptics on mobile, falls back to web vibration API
 */
export async function vibrateError(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.notification({ type: NotificationType.Error });
      return;
    } catch (error) {
      // Native haptics failed, fall back to web
    }
  }

  // Web fallback
  triggerHaptic('error');
}
