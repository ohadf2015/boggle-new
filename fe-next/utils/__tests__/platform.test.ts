/**
 * Tests for Platform Detection Utility
 * Now tests globalThis.Capacitor instead of @capacitor/core import
 */

import { isNative, isIOS, isAndroid, isWeb, getPlatform } from '../platform';

describe('Platform Detection Utility', () => {
  const originalCapacitor = (globalThis as any).Capacitor;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).Capacitor;
  });

  afterEach(() => {
    if (originalCapacitor) {
      (globalThis as any).Capacitor = originalCapacitor;
    } else {
      delete (globalThis as any).Capacitor;
    }
  });

  function mockCapacitor(overrides: { isNativePlatform?: () => boolean; getPlatform?: () => string } = {}) {
    (globalThis as any).Capacitor = {
      isNativePlatform: overrides.isNativePlatform ?? (() => false),
      getPlatform: overrides.getPlatform ?? (() => 'web'),
    };
  }

  describe('isNative', () => {
    it('should return true when running in native environment', () => {
      mockCapacitor({ isNativePlatform: () => true });
      expect(isNative()).toBe(true);
    });

    it('should return false when running in web environment', () => {
      mockCapacitor({ isNativePlatform: () => false });
      expect(isNative()).toBe(false);
    });

    it('should handle Capacitor being undefined gracefully', () => {
      // No Capacitor on globalThis
      expect(isNative()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('should return true when running on iOS native', () => {
      mockCapacitor({ isNativePlatform: () => true, getPlatform: () => 'ios' });
      expect(isIOS()).toBe(true);
    });

    it('should return false when running on Android native', () => {
      mockCapacitor({ isNativePlatform: () => true, getPlatform: () => 'android' });
      expect(isIOS()).toBe(false);
    });

    it('should return false when running on web', () => {
      mockCapacitor({ isNativePlatform: () => false, getPlatform: () => 'web' });
      expect(isIOS()).toBe(false);
    });
  });

  describe('isAndroid', () => {
    it('should return true when running on Android native', () => {
      mockCapacitor({ isNativePlatform: () => true, getPlatform: () => 'android' });
      expect(isAndroid()).toBe(true);
    });

    it('should return false when running on iOS native', () => {
      mockCapacitor({ isNativePlatform: () => true, getPlatform: () => 'ios' });
      expect(isAndroid()).toBe(false);
    });

    it('should return false when running on web', () => {
      mockCapacitor({ isNativePlatform: () => false, getPlatform: () => 'web' });
      expect(isAndroid()).toBe(false);
    });
  });

  describe('isWeb', () => {
    it('should return true when running in web environment', () => {
      mockCapacitor({ isNativePlatform: () => false });
      expect(isWeb()).toBe(true);
    });

    it('should return false when running in native environment', () => {
      mockCapacitor({ isNativePlatform: () => true });
      expect(isWeb()).toBe(false);
    });

    it('should return true when Capacitor is not available', () => {
      expect(isWeb()).toBe(true);
    });
  });

  describe('getPlatform', () => {
    it('should return "ios" when running on iOS native', () => {
      mockCapacitor({ getPlatform: () => 'ios' });
      expect(getPlatform()).toBe('ios');
    });

    it('should return "android" when running on Android native', () => {
      mockCapacitor({ getPlatform: () => 'android' });
      expect(getPlatform()).toBe('android');
    });

    it('should return "web" when running in web environment', () => {
      mockCapacitor({ getPlatform: () => 'web' });
      expect(getPlatform()).toBe('web');
    });

    it('should return "web" when Capacitor is not available', () => {
      expect(getPlatform()).toBe('web');
    });
  });

  describe('Tree Shaking / SSR Safety', () => {
    it('should not crash when Capacitor is not on globalThis', () => {
      expect(() => isNative()).not.toThrow();
      expect(isNative()).toBe(false);
      expect(isWeb()).toBe(true);
    });

    it('should not crash in server-side rendering environment', () => {
      expect(() => isNative()).not.toThrow();
      expect(() => isIOS()).not.toThrow();
      expect(() => isAndroid()).not.toThrow();
      expect(() => isWeb()).not.toThrow();
      expect(() => getPlatform()).not.toThrow();
    });
  });
});
