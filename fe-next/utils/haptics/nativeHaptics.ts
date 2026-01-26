import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '../platform';
import {
  HapticPattern,
  HapticIntensity,
  CustomHapticPattern,
  IHapticsImplementation,
} from './types';

/**
 * Native haptics implementation using Capacitor Haptics plugin.
 * Provides rich haptic feedback on iOS and Android.
 */
export class NativeHaptics implements IHapticsImplementation {
  private readonly patternMap: Record<HapticPattern, () => Promise<void>> = {
    [HapticPattern.TAP]: () => Haptics.impact({ style: ImpactStyle.Light }),
    [HapticPattern.SUCCESS]: () => Haptics.notification({ type: NotificationType.Success }),
    [HapticPattern.ERROR]: () => Haptics.notification({ type: NotificationType.Error }),
    [HapticPattern.WARNING]: () => Haptics.notification({ type: NotificationType.Warning }),
    [HapticPattern.SELECTION]: () => Haptics.selectionStart(),
  };

  private readonly intensityMap: Record<HapticIntensity, ImpactStyle> = {
    [HapticIntensity.LIGHT]: ImpactStyle.Light,
    [HapticIntensity.MEDIUM]: ImpactStyle.Medium,
    [HapticIntensity.HEAVY]: ImpactStyle.Heavy,
  };

  isSupported(): boolean {
    return isNative();
  }

  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isSupported()) return;

    try {
      await this.patternMap[pattern]();
    } catch (error) {
      // Silently fail if haptics unavailable
      console.warn('[NativeHaptics] Failed to trigger haptic:', error);
    }
  }

  async triggerCustom(pattern: CustomHapticPattern): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const style = this.intensityMap[pattern.intensity];
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('[NativeHaptics] Failed to trigger custom haptic:', error);
    }
  }
}
