import { useReducedMotion } from 'framer-motion';

export function useHaptics() {
  const prefersReducedMotion = useReducedMotion();
  const isEnabled =
    typeof window !== 'undefined' && localStorage.getItem('haptics-enabled') !== 'false';

  const vibrate = (pattern: number[]) => {
    if (prefersReducedMotion || !isEnabled) return;
    if (!navigator.vibrate) return;
    navigator.vibrate(pattern);
  };

  return {
    vibrateLight: () => vibrate([20, 10]),
    vibrateMedium: () => vibrate([40, 20, 40]),
    vibrateHeavy: () => vibrate([60, 30, 60, 30, 60]),
    vibrateSuccessChord: () => vibrate([100, 50, 50, 50]),
  };
}
