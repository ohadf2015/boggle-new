/**
 * @jest-environment happy-dom
 *
 * Verifies hapticFeedback dispatches through HapticsManager on native
 * (iOS/Android via Capacitor) and falls back to navigator.vibrate on web.
 *
 * Without native dispatch, iOS users feel ZERO grid haptics
 * (WKWebView ignores Web Vibration API entirely).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as platform from '@/utils/platform';
import { haptics } from '@/utils/haptics/HapticsManager';
import { HapticPattern, HapticIntensity } from '@/utils/haptics/types';

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(),
}));

vi.mock('@/utils/haptics/HapticsManager', () => ({
  haptics: {
    trigger: vi.fn().mockResolvedValue(undefined),
    triggerCustom: vi.fn().mockResolvedValue(undefined),
    isEnabled: vi.fn().mockReturnValue(true),
  },
}));

import {
  vibrateCellTap,
  vibrateCellDrag,
  vibrateWordSubmit,
  vibrateNavigation,
  vibrateClickSelect,
  vibrateBacktrack,
  vibrateUndo,
  vibrateKeyboardSelect,
  vibrateBlastBomb,
  vibrateBlastLightning,
  vibrateBlastPrism,
  vibrateBlastCascade,
  vibrateTierTransition,
  vibrateWordAccepted,
  vibrateWordRejected,
} from '../hapticFeedback';

describe('hapticFeedback — native vs web dispatch', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vibrateMock = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });
  });

  describe('web mode preserves existing vibration arrays', () => {
    beforeEach(() => {
      (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(false);
    });

    it('vibrateCellTap(fire) → navigator.vibrate(30)', () => {
      vibrateCellTap(true);
      expect(vibrateMock).toHaveBeenCalledWith(30);
      expect(haptics.triggerCustom).not.toHaveBeenCalled();
      expect(haptics.trigger).not.toHaveBeenCalled();
    });

    it('vibrateCellTap(normal) → navigator.vibrate(22)', () => {
      vibrateCellTap(false);
      expect(vibrateMock).toHaveBeenCalledWith(22);
    });

    it('vibrateWordSubmit short normal → navigator.vibrate(15)', () => {
      vibrateWordSubmit(4, 0, false);
      expect(vibrateMock).toHaveBeenCalledWith(15);
    });

    it('vibrateBlastBomb → navigator.vibrate([80,30,80,30,120])', () => {
      vibrateBlastBomb();
      expect(vibrateMock).toHaveBeenCalledWith([80, 30, 80, 30, 120]);
    });

    it('vibrateWordRejected → navigator.vibrate([40,20,40])', () => {
      vibrateWordRejected();
      expect(vibrateMock).toHaveBeenCalledWith([40, 20, 40]);
    });
  });

  describe('native mode routes through HapticsManager', () => {
    beforeEach(() => {
      (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);
    });

    it('vibrateCellTap(fire) → impact MEDIUM, no navigator.vibrate', () => {
      vibrateCellTap(true);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
      expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('vibrateCellTap(normal) → impact LIGHT', () => {
      vibrateCellTap(false);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.LIGHT })
      );
    });

    it('vibrateCellDrag(normal) → selection (subtle drag tick)', () => {
      vibrateCellDrag(false, 0);
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SELECTION);
    });

    it('vibrateCellDrag(fire, tier=3) → impact HEAVY (climax escalation)', () => {
      vibrateCellDrag(true, 3);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.HEAVY })
      );
    });

    it('vibrateBacktrack(normal) → selection (light tick)', () => {
      vibrateBacktrack(false);
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SELECTION);
    });

    it('vibrateUndo(fire) → impact MEDIUM', () => {
      vibrateUndo(true);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
    });

    it('vibrateNavigation → selection', () => {
      vibrateNavigation();
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SELECTION);
    });

    it('vibrateClickSelect → impact LIGHT', () => {
      vibrateClickSelect();
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.LIGHT })
      );
    });

    it('vibrateKeyboardSelect(fire) → impact MEDIUM', () => {
      vibrateKeyboardSelect(true);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
    });

    it('vibrateWordSubmit short normal → impact LIGHT', () => {
      vibrateWordSubmit(4, 0, false);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.LIGHT })
      );
    });

    it('vibrateWordSubmit long normal (>=6 letters) → impact MEDIUM', () => {
      vibrateWordSubmit(7, 0, false);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
    });

    it('vibrateWordSubmit combo3 fire → impact HEAVY', () => {
      vibrateWordSubmit(5, 3, true);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.HEAVY })
      );
    });

    it('vibrateWordSubmit combo7 fire → notification SUCCESS (climax)', () => {
      vibrateWordSubmit(8, 7, true);
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SUCCESS);
    });

    it('vibrateWordSubmit combo5 normal → impact MEDIUM', () => {
      vibrateWordSubmit(6, 5, false);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
    });

    it('vibrateTierTransition(3) → notification SUCCESS', () => {
      vibrateTierTransition(3);
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SUCCESS);
    });

    it('vibrateTierTransition(2) → impact HEAVY', () => {
      vibrateTierTransition(2);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.HEAVY })
      );
    });

    it('vibrateTierTransition(1) → impact MEDIUM', () => {
      vibrateTierTransition(1);
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
    });

    it('vibrateTierTransition(0) → no-op', () => {
      vibrateTierTransition(0);
      expect(haptics.trigger).not.toHaveBeenCalled();
      expect(haptics.triggerCustom).not.toHaveBeenCalled();
    });

    it('vibrateBlastBomb → impact HEAVY', () => {
      vibrateBlastBomb();
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.HEAVY })
      );
    });

    it('vibrateBlastLightning → impact MEDIUM', () => {
      vibrateBlastLightning();
      expect(haptics.triggerCustom).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: HapticIntensity.MEDIUM })
      );
    });

    it('vibrateBlastPrism → notification SUCCESS', () => {
      vibrateBlastPrism();
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SUCCESS);
    });

    it('vibrateBlastCascade → selection (chain tick)', () => {
      vibrateBlastCascade();
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SELECTION);
    });

    it('vibrateWordAccepted → notification SUCCESS', () => {
      vibrateWordAccepted();
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.SUCCESS);
    });

    it('vibrateWordRejected → notification ERROR', () => {
      vibrateWordRejected();
      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.ERROR);
    });
  });
});
