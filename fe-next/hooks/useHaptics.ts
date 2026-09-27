'use client';

import { useCallback } from 'react';
import { haptics } from '@/utils/haptics/HapticsManager';
import { HapticPattern, CustomHapticPattern, HapticIntensity } from '@/utils/haptics/types';

/**
 * React hook for haptic feedback.
 * Provides memoized haptic functions for use in components.
 *
 * @example
 * const { tap, success, error } = useHaptics();
 *
 * <button onClick={tap}>Click me</button>
 */
export function useHaptics() {
  const trigger = useCallback(async (pattern: HapticPattern) => {
    await haptics.trigger(pattern);
  }, []);

  const triggerCustom = useCallback(async (pattern: CustomHapticPattern) => {
    await haptics.triggerCustom(pattern);
  }, []);

  const tap = useCallback(async () => {
    await haptics.tap();
  }, []);

  const success = useCallback(async () => {
    await haptics.success();
  }, []);

  const error = useCallback(async () => {
    await haptics.error();
  }, []);

  const warning = useCallback(async () => {
    await haptics.warning();
  }, []);

  const selection = useCallback(async () => {
    await haptics.selection();
  }, []);

  const bossHit = useCallback(async () => {
    await haptics.triggerCustom({ duration: 40, intensity: HapticIntensity.HEAVY });
  }, []);

  const levelComplete = useCallback(async () => {
    await haptics.triggerCustom({ duration: 80, intensity: HapticIntensity.MEDIUM });
  }, []);

  const isSupported = useCallback(() => {
    return haptics.isSupported();
  }, []);

  return {
    trigger,
    triggerCustom,
    tap,
    success,
    error,
    warning,
    selection,
    bossHit,
    levelComplete,
    isSupported,
  };
}
