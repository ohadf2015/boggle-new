import { isNative } from '../platform';
import { WebHaptics } from './webHaptics';
import { NativeHaptics } from './nativeHaptics';
import {
  HapticPattern,
  CustomHapticPattern,
  IHapticsImplementation,
} from './types';

/**
 * Unified haptics manager (Facade pattern).
 * Automatically selects best implementation for current platform.
 */
export class HapticsManager {
  private implementation: IHapticsImplementation;

  constructor() {
    // Select implementation based on platform
    this.implementation = isNative() ? new NativeHaptics() : new WebHaptics();
  }

  /**
   * Check if haptics supported on current platform.
   */
  isSupported(): boolean {
    return this.implementation.isSupported();
  }

  /**
   * Trigger predefined haptic pattern.
   */
  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isSupported()) return;
    await this.implementation.trigger(pattern);
  }

  /**
   * Trigger custom haptic pattern.
   */
  async triggerCustom(pattern: CustomHapticPattern): Promise<void> {
    if (!this.isSupported()) return;
    await this.implementation.triggerCustom(pattern);
  }

  /**
   * Convenience methods for common patterns.
   */
  async tap(): Promise<void> {
    await this.trigger(HapticPattern.TAP);
  }

  async success(): Promise<void> {
    await this.trigger(HapticPattern.SUCCESS);
  }

  async error(): Promise<void> {
    await this.trigger(HapticPattern.ERROR);
  }

  async warning(): Promise<void> {
    await this.trigger(HapticPattern.WARNING);
  }

  async selection(): Promise<void> {
    await this.trigger(HapticPattern.SELECTION);
  }
}

// Singleton instance
export const haptics = new HapticsManager();
