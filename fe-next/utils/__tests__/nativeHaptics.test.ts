/**
 * Tests for Native Haptics Utility
 * Comprehensive test coverage for native haptics with web fallback
 */

import { vibrateSuccess, vibrateError, vibrateTap } from '../nativeHaptics';
import * as platformUtils from '../platform';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import * as hapticFeedback from '../hapticFeedback';

// Mock platform detection
jest.mock('../platform');

// Mock Capacitor Haptics
jest.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: jest.fn().mockResolvedValue(undefined),
    notification: jest.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationType: {
    Success: 'Success',
    Error: 'Error',
    Warning: 'Warning',
  },
}));

// Mock web haptic fallback
jest.mock('../hapticFeedback', () => ({
  triggerHaptic: jest.fn(),
}));

describe('Native Haptics Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('vibrateTap', () => {
    describe('Native Environment', () => {
      beforeEach(() => {
        (platformUtils.isNative as jest.Mock).mockReturnValue(true);
      });

      it('should call Capacitor Haptics.impact with Light style', async () => {
        await vibrateTap();

        expect(Haptics.impact).toHaveBeenCalledWith({
          style: ImpactStyle.Light,
        });
        expect(hapticFeedback.triggerHaptic).not.toHaveBeenCalled();
      });

      it('should not throw on Capacitor error', async () => {
        (Haptics.impact as jest.Mock).mockRejectedValue(new Error('Haptics unavailable'));

        await expect(vibrateTap()).resolves.not.toThrow();
      });

      it('should fall back to web haptics if Capacitor fails', async () => {
        (Haptics.impact as jest.Mock).mockRejectedValue(new Error('Not available'));

        await vibrateTap();

        expect(hapticFeedback.triggerHaptic).toHaveBeenCalledWith('light');
      });
    });

    describe('Web Environment', () => {
      beforeEach(() => {
        (platformUtils.isNative as jest.Mock).mockReturnValue(false);
      });

      it('should fall back to web haptics API', async () => {
        await vibrateTap();

        expect(hapticFeedback.triggerHaptic).toHaveBeenCalledWith('light');
        expect(Haptics.impact).not.toHaveBeenCalled();
      });
    });
  });

  describe('vibrateSuccess', () => {
    describe('Native Environment', () => {
      beforeEach(() => {
        (platformUtils.isNative as jest.Mock).mockReturnValue(true);
      });

      it('should call Capacitor Haptics.notification with Success type', async () => {
        await vibrateSuccess();

        expect(Haptics.notification).toHaveBeenCalledWith({
          type: 'Success',
        });
        expect(hapticFeedback.triggerHaptic).not.toHaveBeenCalled();
      });

      it('should fall back to web haptics if Capacitor fails', async () => {
        (Haptics.notification as jest.Mock).mockRejectedValue(new Error('Not available'));

        await vibrateSuccess();

        expect(hapticFeedback.triggerHaptic).toHaveBeenCalledWith('success');
      });
    });

    describe('Web Environment', () => {
      beforeEach(() => {
        (platformUtils.isNative as jest.Mock).mockReturnValue(false);
      });

      it('should fall back to web haptics API', async () => {
        await vibrateSuccess();

        expect(hapticFeedback.triggerHaptic).toHaveBeenCalledWith('success');
        expect(Haptics.notification).not.toHaveBeenCalled();
      });
    });
  });

  describe('vibrateError', () => {
    describe('Native Environment', () => {
      beforeEach(() => {
        (platformUtils.isNative as jest.Mock).mockReturnValue(true);
      });

      it('should call Capacitor Haptics.notification with Error type', async () => {
        (Haptics.notification as jest.Mock).mockResolvedValueOnce(undefined);

        await vibrateError();

        expect(Haptics.notification).toHaveBeenCalledWith({
          type: 'Error',
        });
        expect(hapticFeedback.triggerHaptic).not.toHaveBeenCalled();
      });

      it('should fall back to web haptics if Capacitor fails', async () => {
        (Haptics.notification as jest.Mock).mockRejectedValue(new Error('Not available'));

        await vibrateError();

        expect(hapticFeedback.triggerHaptic).toHaveBeenCalledWith('error');
      });
    });

    describe('Web Environment', () => {
      beforeEach(() => {
        (platformUtils.isNative as jest.Mock).mockReturnValue(false);
      });

      it('should fall back to web haptics API', async () => {
        await vibrateError();

        expect(hapticFeedback.triggerHaptic).toHaveBeenCalledWith('error');
        expect(Haptics.notification).not.toHaveBeenCalled();
      });
    });
  });

  describe('Tree Shaking', () => {
    it('should handle Capacitor being tree-shaken on web', async () => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(false);

      await expect(vibrateTap()).resolves.not.toThrow();
      await expect(vibrateSuccess()).resolves.not.toThrow();
      await expect(vibrateError()).resolves.not.toThrow();
    });
  });

  describe('Graceful Degradation', () => {
    it('should not crash if both native and web haptics fail', async () => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(true);
      (Haptics.impact as jest.Mock).mockRejectedValue(new Error('Native failed'));
      (hapticFeedback.triggerHaptic as jest.Mock).mockReturnValue(false);

      await expect(vibrateTap()).resolves.not.toThrow();
    });

    it('should silently fail if web haptics not supported', async () => {
      (platformUtils.isNative as jest.Mock).mockReturnValue(false);
      (hapticFeedback.triggerHaptic as jest.Mock).mockReturnValue(false);

      await expect(vibrateTap()).resolves.not.toThrow();
    });
  });
});
