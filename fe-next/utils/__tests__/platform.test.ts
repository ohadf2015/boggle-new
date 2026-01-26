/**
 * Tests for Platform Detection Utility
 * Comprehensive test coverage for native vs web environment detection
 */

import { isNative, isIOS, isAndroid, isWeb, getPlatform } from '../platform';
import { Capacitor } from '@capacitor/core';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(),
    getPlatform: jest.fn(),
  },
}));

describe('Platform Detection Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isNative', () => {
    it('should return true when running in native environment', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

      expect(isNative()).toBe(true);
    });

    it('should return false when running in web environment', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      expect(isNative()).toBe(false);
    });

    it('should handle Capacitor being undefined gracefully', () => {
      // Simulate Capacitor not loaded
      (Capacitor.isNativePlatform as jest.Mock).mockImplementation(() => {
        throw new Error('Capacitor not available');
      });

      expect(isNative()).toBe(false);
    });
  });

  describe('isIOS', () => {
    it('should return true when running on iOS native', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(isIOS()).toBe(true);
    });

    it('should return false when running on Android native', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      expect(isIOS()).toBe(false);
    });

    it('should return false when running on web', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      expect(isIOS()).toBe(false);
    });
  });

  describe('isAndroid', () => {
    it('should return true when running on Android native', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      expect(isAndroid()).toBe(true);
    });

    it('should return false when running on iOS native', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(isAndroid()).toBe(false);
    });

    it('should return false when running on web', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      expect(isAndroid()).toBe(false);
    });
  });

  describe('isWeb', () => {
    it('should return true when running in web environment', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      expect(isWeb()).toBe(true);
    });

    it('should return false when running in native environment', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

      expect(isWeb()).toBe(false);
    });

    it('should return true when Capacitor is not available', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockImplementation(() => {
        throw new Error('Capacitor not available');
      });

      expect(isWeb()).toBe(true);
    });
  });

  describe('getPlatform', () => {
    it('should return "ios" when running on iOS native', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');

      expect(getPlatform()).toBe('ios');
    });

    it('should return "android" when running on Android native', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');

      expect(getPlatform()).toBe('android');
    });

    it('should return "web" when running in web environment', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');

      expect(getPlatform()).toBe('web');
    });

    it('should return "web" when Capacitor is not available', () => {
      (Capacitor.getPlatform as jest.Mock).mockImplementation(() => {
        throw new Error('Capacitor not available');
      });

      expect(getPlatform()).toBe('web');
    });
  });

  describe('Tree Shaking', () => {
    it('should handle Capacitor import being tree-shaken on web', () => {
      // Simulate Capacitor being completely unavailable (tree-shaken)
      (Capacitor.isNativePlatform as jest.Mock).mockImplementation(() => {
        throw new ReferenceError('Capacitor is not defined');
      });

      expect(() => isNative()).not.toThrow();
      expect(isNative()).toBe(false);
      expect(isWeb()).toBe(true);
    });
  });

  describe('SSR Safety', () => {
    it('should not crash in server-side rendering environment', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockImplementation(() => {
        throw new Error('window is not defined');
      });

      expect(() => isNative()).not.toThrow();
      expect(() => isIOS()).not.toThrow();
      expect(() => isAndroid()).not.toThrow();
      expect(() => isWeb()).not.toThrow();
      expect(() => getPlatform()).not.toThrow();
    });
  });
});
