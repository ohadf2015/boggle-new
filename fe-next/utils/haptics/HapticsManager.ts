import { isNative } from '../platform';
import { WebHaptics } from './webHaptics';
import {
  HapticPattern,
  CustomHapticPattern,
  IHapticsImplementation,
} from './types';

/**
 * Unified haptics manager (Facade pattern).
 * Automatically selects best implementation for current platform.
 * NativeHaptics is lazily loaded to avoid pulling @capacitor/haptics into the web bundle.
 */
export class HapticsManager {
  private implementation: IHapticsImplementation | null = null;
  private initPromise: Promise<IHapticsImplementation> | null = null;
  private enabled = true;

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getImpl(): Promise<IHapticsImplementation> {
    if (this.implementation) return Promise.resolve(this.implementation);
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (isNative()) {
        const { NativeHaptics } = await import('./nativeHaptics');
        this.implementation = new NativeHaptics();
      } else {
        this.implementation = new WebHaptics();
      }
      return this.implementation;
    })();

    return this.initPromise;
  }

  isSupported(): boolean {
    // Synchronous check — if not initialized yet, return false
    return this.implementation?.isSupported() ?? false;
  }

  async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.enabled) return;
    const impl = await this.getImpl();
    if (!impl.isSupported()) return;
    await impl.trigger(pattern);
  }

  async triggerCustom(pattern: CustomHapticPattern): Promise<void> {
    if (!this.enabled) return;
    const impl = await this.getImpl();
    if (!impl.isSupported()) return;
    await impl.triggerCustom(pattern);
  }

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

  async legendary(): Promise<void> {
    await this.trigger(HapticPattern.LEGENDARY);
  }
}

// Singleton instance
export const haptics = new HapticsManager();
