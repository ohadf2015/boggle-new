import {
  HapticPattern,
  HapticIntensity,
  CustomHapticPattern,
  IHapticsImplementation,
} from './types';

/**
 * Web haptics implementation using Vibration API.
 * Provides fallback for browsers without native haptics.
 */
export class WebHaptics implements IHapticsImplementation {
  private readonly patternMap: Record<HapticPattern, number | number[]> = {
    [HapticPattern.TAP]: 10,
    [HapticPattern.SUCCESS]: [10, 50, 10],
    [HapticPattern.ERROR]: [10, 50, 10, 50, 20],
    [HapticPattern.WARNING]: [20, 100, 20],
    [HapticPattern.SELECTION]: 5,
  };

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isSupported()) return;

    const vibrationPattern = this.patternMap[pattern];
    navigator.vibrate(vibrationPattern);
  }

  async triggerCustom(pattern: CustomHapticPattern): Promise<void> {
    if (!this.isSupported()) return;

    // Map intensity to vibration strength (duration scales intensity)
    const intensityMultiplier = {
      [HapticIntensity.LIGHT]: 0.5,
      [HapticIntensity.MEDIUM]: 1.0,
      [HapticIntensity.HEAVY]: 1.5,
    };

    const duration = pattern.duration * intensityMultiplier[pattern.intensity];
    navigator.vibrate(duration);
  }
}
