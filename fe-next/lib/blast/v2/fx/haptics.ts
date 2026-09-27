import { useReducedMotion } from 'framer-motion';
import { haptics } from '@/utils/haptics/HapticsManager';
import { HapticPattern } from '@/utils/haptics/types';

// Fires native (Capacitor) haptics in parallel with the web Vibration API so
// the player gets a tactile pulse on iOS — `navigator.vibrate` is a no-op on
// iOS Safari/WKWebView and we were silently dropping every cue on iPhones.
function pulseNative(pattern: HapticPattern): void {
  // Fire-and-forget; haptics already guards isSupported() and `enabled` state.
  void haptics.trigger(pattern).catch(() => {
    /* swallow — native haptics are non-essential, never fail the gesture */
  });
}

export function useHaptics() {
  const prefersReducedMotion = useReducedMotion();
  const isEnabled =
    typeof window !== 'undefined' && localStorage.getItem('haptics-enabled') !== 'false';

  const vibrate = (pattern: number[], native: HapticPattern) => {
    if (prefersReducedMotion || !isEnabled) return;
    pulseNative(native);
    if (!navigator.vibrate) return;
    navigator.vibrate(pattern);
  };

  return {
    vibrateLight: () => vibrate([20, 10], HapticPattern.TAP),
    vibrateMedium: () => vibrate([40, 20, 40], HapticPattern.SELECTION),
    vibrateHeavy: () => vibrate([60, 30, 60, 30, 60], HapticPattern.WARNING),
    vibrateSuccessChord: () => vibrate([100, 50, 50, 50], HapticPattern.SUCCESS),
  };
}
