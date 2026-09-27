/**
 * @jest-environment jsdom
 */

import { HapticsManager } from '../HapticsManager';
import { HapticPattern, HapticIntensity } from '../types';
import * as platform from '../../platform';

// Mock platform utilities
vi.mock('../../platform', () => ({
  isNative: vi.fn(),
}));

// Hoist mock functions so they're available inside vi.mock factories
const {
  mockNativeTrigger,
  mockNativeTriggerCustom,
  mockNativeIsSupported,
  mockWebTrigger,
  mockWebTriggerCustom,
  mockWebIsSupported,
} = vi.hoisted(() => ({
  mockNativeTrigger: vi.fn(),
  mockNativeTriggerCustom: vi.fn(),
  mockNativeIsSupported: vi.fn().mockReturnValue(true),
  mockWebTrigger: vi.fn(),
  mockWebTriggerCustom: vi.fn(),
  mockWebIsSupported: vi.fn().mockReturnValue(true),
}));

vi.mock('../nativeHaptics', () => {
  const NativeHaptics = vi.fn().mockImplementation(function(this: any) {
    this.isSupported = mockNativeIsSupported;
    this.trigger = mockNativeTrigger;
    this.triggerCustom = mockNativeTriggerCustom;
  });
  return { NativeHaptics };
});

vi.mock('../webHaptics', () => {
  const WebHaptics = vi.fn().mockImplementation(function(this: any) {
    this.isSupported = mockWebIsSupported;
    this.trigger = mockWebTrigger;
    this.triggerCustom = mockWebTriggerCustom;
  });
  return { WebHaptics };
});

describe('HapticsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNativeIsSupported.mockReturnValue(true);
    mockWebIsSupported.mockReturnValue(true);
  });

  describe('Platform Detection', () => {
    it('should use NativeHaptics when isNative() returns true', async () => {
      (platform.isNative as any).mockReturnValue(true);

      const manager = new HapticsManager();
      // Trigger lazy initialization
      await manager.trigger(HapticPattern.TAP);

      const { NativeHaptics } = await import('../nativeHaptics');
      expect(NativeHaptics).toHaveBeenCalled();
    });

    it('should use WebHaptics when isNative() returns false', async () => {
      (platform.isNative as any).mockReturnValue(false);

      const manager = new HapticsManager();
      // Trigger lazy initialization
      await manager.trigger(HapticPattern.TAP);

      const { WebHaptics } = await import('../webHaptics');
      expect(WebHaptics).toHaveBeenCalled();
    });
  });

  describe('isSupported', () => {
    it('should return false before initialization', () => {
      (platform.isNative as any).mockReturnValue(false);

      const manager = new HapticsManager();
      // Before any async call, implementation is null
      expect(manager.isSupported()).toBe(false);
    });

    it('should delegate to implementation after initialization', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);

      const manager = new HapticsManager();
      // Trigger lazy init
      await manager.trigger(HapticPattern.TAP);

      const result = manager.isSupported();
      expect(result).toBe(true);
    });

    it('should return false when implementation not supported', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(false);

      const manager = new HapticsManager();
      // Trigger lazy init — but isSupported returns false, so trigger won't call trigger
      // We need to force init by calling trigger (which checks isSupported internally)
      await manager.tap();

      const result = manager.isSupported();
      expect(result).toBe(false);
    });
  });

  describe('trigger', () => {
    it('should delegate to implementation when supported', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);

      const manager = new HapticsManager();
      await manager.trigger(HapticPattern.TAP);

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.TAP);
    });

    it('should not trigger when unsupported', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(false);

      const manager = new HapticsManager();
      await manager.trigger(HapticPattern.TAP);

      expect(mockWebTrigger).not.toHaveBeenCalled();
    });
  });

  describe('triggerCustom', () => {
    it('should delegate to implementation when supported', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);

      const customPattern = { duration: 50, intensity: HapticIntensity.MEDIUM };
      const manager = new HapticsManager();
      await manager.triggerCustom(customPattern);

      expect(mockWebTriggerCustom).toHaveBeenCalledWith(customPattern);
    });

    it('should not trigger when unsupported', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(false);

      const customPattern = { duration: 50, intensity: HapticIntensity.MEDIUM };
      const manager = new HapticsManager();
      await manager.triggerCustom(customPattern);

      expect(mockWebTriggerCustom).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);
    });

    it('tap() should trigger TAP pattern', async () => {
      const manager = new HapticsManager();
      await manager.tap();

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.TAP);
    });

    it('success() should trigger SUCCESS pattern', async () => {
      const manager = new HapticsManager();
      await manager.success();

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.SUCCESS);
    });

    it('error() should trigger ERROR pattern', async () => {
      const manager = new HapticsManager();
      await manager.error();

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.ERROR);
    });

    it('warning() should trigger WARNING pattern', async () => {
      const manager = new HapticsManager();
      await manager.warning();

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.WARNING);
    });

    it('selection() should trigger SELECTION pattern', async () => {
      const manager = new HapticsManager();
      await manager.selection();

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.SELECTION);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', async () => {
      const { haptics } = await import('../HapticsManager');

      expect(haptics).toBeDefined();
      expect(haptics).toBeInstanceOf(HapticsManager);
    });
  });

  describe('setEnabled / isEnabled', () => {
    it('should default to enabled', () => {
      const manager = new HapticsManager();
      expect(manager.isEnabled()).toBe(true);
    });

    it('isEnabled() reflects toggled state', () => {
      const manager = new HapticsManager();
      manager.setEnabled(false);
      expect(manager.isEnabled()).toBe(false);
      manager.setEnabled(true);
      expect(manager.isEnabled()).toBe(true);
    });

    it('setEnabled(false) prevents trigger()', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);

      const manager = new HapticsManager();
      manager.setEnabled(false);
      await manager.trigger(HapticPattern.TAP);

      expect(mockWebTrigger).not.toHaveBeenCalled();
    });

    it('setEnabled(false) prevents triggerCustom()', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);

      const manager = new HapticsManager();
      manager.setEnabled(false);
      await manager.triggerCustom({ duration: 50, intensity: HapticIntensity.MEDIUM });

      expect(mockWebTriggerCustom).not.toHaveBeenCalled();
    });

    it('re-enabling after disable restores trigger()', async () => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);

      const manager = new HapticsManager();
      manager.setEnabled(false);
      manager.setEnabled(true);
      await manager.trigger(HapticPattern.TAP);

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.TAP);
    });
  });

  describe('legendary()', () => {
    beforeEach(() => {
      (platform.isNative as any).mockReturnValue(false);
      mockWebIsSupported.mockReturnValue(true);
    });

    it('triggers LEGENDARY pattern', async () => {
      const manager = new HapticsManager();
      await manager.legendary();

      expect(mockWebTrigger).toHaveBeenCalledWith(HapticPattern.LEGENDARY);
    });

    it('is suppressed when disabled', async () => {
      const manager = new HapticsManager();
      manager.setEnabled(false);
      await manager.legendary();

      expect(mockWebTrigger).not.toHaveBeenCalled();
    });
  });
});
