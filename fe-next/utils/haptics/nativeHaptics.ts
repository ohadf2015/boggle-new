import { isNative } from '../platform';
import {
  HapticPattern,
  HapticIntensity,
  CustomHapticPattern,
  IHapticsImplementation,
} from './types';

/**
 * Native haptics implementation using Capacitor Haptics plugin.
 * Capacitor is dynamically imported to avoid Turbopack SWC helper errors on web.
 */
export class NativeHaptics implements IHapticsImplementation {
  isSupported(): boolean {
    return isNative();
  }

  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      const patternMap: Record<HapticPattern, () => Promise<void>> = {
        [HapticPattern.TAP]: () => Haptics.impact({ style: ImpactStyle.Light }),
        [HapticPattern.SUCCESS]: () => Haptics.notification({ type: NotificationType.Success }),
        [HapticPattern.ERROR]: () => Haptics.notification({ type: NotificationType.Error }),
        [HapticPattern.WARNING]: () => Haptics.notification({ type: NotificationType.Warning }),
        [HapticPattern.SELECTION]: () => Haptics.selectionStart(),
      };
      await patternMap[pattern]();
    } catch (error) {
      console.warn('[NativeHaptics] Failed to trigger haptic:', error);
    }
  }

  async triggerCustom(pattern: CustomHapticPattern): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const intensityMap: Record<HapticIntensity, typeof ImpactStyle[keyof typeof ImpactStyle]> = {
        [HapticIntensity.LIGHT]: ImpactStyle.Light,
        [HapticIntensity.MEDIUM]: ImpactStyle.Medium,
        [HapticIntensity.HEAVY]: ImpactStyle.Heavy,
      };
      const style = intensityMap[pattern.intensity];
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('[NativeHaptics] Failed to trigger custom haptic:', error);
    }
  }
}
