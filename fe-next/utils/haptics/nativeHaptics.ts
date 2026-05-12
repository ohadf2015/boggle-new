import { isNative } from '../platform';
import {
  HapticPattern,
  HapticIntensity,
  CustomHapticPattern,
  IHapticsImplementation,
} from './types';

 

/**
 * Native haptics implementation using Capacitor Haptics plugin.
 * Uses globalThis.Capacitor.Plugins to avoid any @capacitor/* imports that break Turbopack.
 */
export class NativeHaptics implements IHapticsImplementation {
  private getHaptics(): any | null {
    return (globalThis as any).Capacitor?.Plugins?.Haptics ?? null;
  }

  isSupported(): boolean {
    return isNative() && !!this.getHaptics();
  }

  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isSupported()) return;
    const Haptics = this.getHaptics();
    if (!Haptics) return;

    try {
      const patternMap: Record<HapticPattern, () => Promise<void>> = {
        [HapticPattern.TAP]: () => Haptics.impact({ style: 'LIGHT' }),
        [HapticPattern.SUCCESS]: () => Haptics.notification({ type: 'SUCCESS' }),
        [HapticPattern.ERROR]: () => Haptics.notification({ type: 'ERROR' }),
        [HapticPattern.WARNING]: () => Haptics.notification({ type: 'WARNING' }),
        [HapticPattern.SELECTION]: () => Haptics.selectionStart(),
        [HapticPattern.LEGENDARY]: () => Haptics.notification({ type: 'SUCCESS' }),
      };
      await patternMap[pattern]();
    } catch (error) {
      console.warn('[NativeHaptics] Failed to trigger haptic:', error);
    }
  }

  async triggerCustom(pattern: CustomHapticPattern): Promise<void> {
    if (!this.isSupported()) return;
    const Haptics = this.getHaptics();
    if (!Haptics) return;

    try {
      const intensityMap: Record<HapticIntensity, string> = {
        [HapticIntensity.LIGHT]: 'LIGHT',
        [HapticIntensity.MEDIUM]: 'MEDIUM',
        [HapticIntensity.HEAVY]: 'HEAVY',
      };
      await Haptics.impact({ style: intensityMap[pattern.intensity] });
    } catch (error) {
      console.warn('[NativeHaptics] Failed to trigger custom haptic:', error);
    }
  }
}
