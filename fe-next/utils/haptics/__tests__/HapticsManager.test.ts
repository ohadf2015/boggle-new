/**
 * @jest-environment jsdom
 */

import { HapticsManager } from '../HapticsManager';
import { HapticPattern, HapticIntensity } from '../types';
import * as platform from '../../platform';
import { NativeHaptics } from '../nativeHaptics';
import { WebHaptics } from '../webHaptics';

// Mock platform utilities
vi.mock('../../platform', () => ({
  isNative: vi.fn(),
}));

// Mock implementations
vi.mock('../nativeHaptics', () => ({
  NativeHaptics: vi.fn(),
}));
vi.mock('../webHaptics', () => ({
  WebHaptics: vi.fn(),
}));

describe('HapticsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('should use NativeHaptics when isNative() returns true', () => {
      (platform.isNative as jest.Mock).mockReturnValue(true);

      const manager = new HapticsManager();

      // Verify NativeHaptics constructor was called
      expect(NativeHaptics).toHaveBeenCalled();
    });

    it('should use WebHaptics when isNative() returns false', () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);

      const manager = new HapticsManager();

      // Verify WebHaptics constructor was called
      expect(WebHaptics).toHaveBeenCalled();
    });
  });

  describe('isSupported', () => {
    it('should delegate to implementation', () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
      const mockIsSupported = jest.fn().mockReturnValue(true);
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: mockIsSupported,
      })});

      const manager = new HapticsManager();
      const result = manager.isSupported();

      expect(mockIsSupported).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when implementation not supported', () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
      const mockIsSupported = jest.fn().mockReturnValue(false);
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: mockIsSupported,
      })});

      const manager = new HapticsManager();
      const result = manager.isSupported();

      expect(result).toBe(false);
    });
  });

  describe('trigger', () => {
    it('should delegate to implementation when supported', async () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.trigger(HapticPattern.TAP);

      expect(mockTrigger).toHaveBeenCalledWith(HapticPattern.TAP);
    });

    it('should not trigger when unsupported', async () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => false,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.trigger(HapticPattern.TAP);

      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });

  describe('triggerCustom', () => {
    it('should delegate to implementation when supported', async () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
      const mockTriggerCustom = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        triggerCustom: mockTriggerCustom,
      })});

      const customPattern = { duration: 50, intensity: HapticIntensity.MEDIUM };
      const manager = new HapticsManager();
      await manager.triggerCustom(customPattern);

      expect(mockTriggerCustom).toHaveBeenCalledWith(customPattern);
    });

    it('should not trigger when unsupported', async () => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
      const mockTriggerCustom = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => false,
        triggerCustom: mockTriggerCustom,
      })});

      const customPattern = { duration: 50, intensity: HapticIntensity.MEDIUM };
      const manager = new HapticsManager();
      await manager.triggerCustom(customPattern);

      expect(mockTriggerCustom).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      (platform.isNative as jest.Mock).mockReturnValue(false);
    });

    it('tap() should trigger TAP pattern', async () => {
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.tap();

      expect(mockTrigger).toHaveBeenCalledWith(HapticPattern.TAP);
    });

    it('success() should trigger SUCCESS pattern', async () => {
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.success();

      expect(mockTrigger).toHaveBeenCalledWith(HapticPattern.SUCCESS);
    });

    it('error() should trigger ERROR pattern', async () => {
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.error();

      expect(mockTrigger).toHaveBeenCalledWith(HapticPattern.ERROR);
    });

    it('warning() should trigger WARNING pattern', async () => {
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.warning();

      expect(mockTrigger).toHaveBeenCalledWith(HapticPattern.WARNING);
    });

    it('selection() should trigger SELECTION pattern', async () => {
      const mockTrigger = jest.fn();
      (WebHaptics as jest.Mock).mockImplementation(function(this: any) { return Object.assign(this, {
        isSupported: () => true,
        trigger: mockTrigger,
      })});

      const manager = new HapticsManager();
      await manager.selection();

      expect(mockTrigger).toHaveBeenCalledWith(HapticPattern.SELECTION);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', async () => {
      const { haptics } = await import('../HapticsManager');

      expect(haptics).toBeDefined();
      expect(haptics).toBeInstanceOf(HapticsManager);
    });
  });
});
