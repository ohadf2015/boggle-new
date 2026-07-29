/**
 * @jest-environment jsdom
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHaptics } from '../useHaptics';
import { haptics } from '@/utils/haptics/HapticsManager';
import { HapticPattern, HapticIntensity } from '@/utils/haptics/types';

// Mock HapticsManager
vi.mock('@/utils/haptics/HapticsManager', () => ({
  haptics: {
    trigger: vi.fn(),
    triggerCustom: vi.fn(),
    tap: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    selection: vi.fn(),
    isSupported: vi.fn().mockReturnValue(true),
  },
}));

describe('useHaptics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Return Value', () => {
    it('should return all required methods', () => {
      const { result } = renderHook(() => useHaptics());

      expect(result.current).toHaveProperty('trigger');
      expect(result.current).toHaveProperty('triggerCustom');
      expect(result.current).toHaveProperty('tap');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('warning');
      expect(result.current).toHaveProperty('selection');
      expect(result.current).toHaveProperty('isSupported');
    });

    it('should return memoized functions', () => {
      const { result, rerender } = renderHook(() => useHaptics());

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      // All functions should have stable references
      expect(firstRender.trigger).toBe(secondRender.trigger);
      expect(firstRender.triggerCustom).toBe(secondRender.triggerCustom);
      expect(firstRender.tap).toBe(secondRender.tap);
      expect(firstRender.success).toBe(secondRender.success);
      expect(firstRender.error).toBe(secondRender.error);
      expect(firstRender.warning).toBe(secondRender.warning);
      expect(firstRender.selection).toBe(secondRender.selection);
      expect(firstRender.isSupported).toBe(secondRender.isSupported);
    });
  });

  describe('trigger', () => {
    it('should delegate to haptics.trigger', async () => {
      const { result } = renderHook(() => useHaptics());

      await result.current.trigger(HapticPattern.TAP);

      expect(haptics.trigger).toHaveBeenCalledWith(HapticPattern.TAP);
    });
  });

  describe('triggerCustom', () => {
    it('should delegate to haptics.triggerCustom', async () => {
      const { result } = renderHook(() => useHaptics());

      const customPattern = { duration: 50, intensity: HapticIntensity.MEDIUM };
      await result.current.triggerCustom(customPattern);

      expect(haptics.triggerCustom).toHaveBeenCalledWith(customPattern);
    });
  });

  describe('Convenience Methods', () => {
    it('tap() should delegate to haptics.tap', async () => {
      const { result } = renderHook(() => useHaptics());

      await result.current.tap();

      expect(haptics.tap).toHaveBeenCalled();
    });

    it('success() should delegate to haptics.success', async () => {
      const { result } = renderHook(() => useHaptics());

      await result.current.success();

      expect(haptics.success).toHaveBeenCalled();
    });

    it('error() should delegate to haptics.error', async () => {
      const { result } = renderHook(() => useHaptics());

      await result.current.error();

      expect(haptics.error).toHaveBeenCalled();
    });

    it('warning() should delegate to haptics.warning', async () => {
      const { result } = renderHook(() => useHaptics());

      await result.current.warning();

      expect(haptics.warning).toHaveBeenCalled();
    });

    it('selection() should delegate to haptics.selection', async () => {
      const { result } = renderHook(() => useHaptics());

      await result.current.selection();

      expect(haptics.selection).toHaveBeenCalled();
    });
  });

  describe('isSupported', () => {
    it('should return true when haptics supported', () => {
      const { result } = renderHook(() => useHaptics());

      const supported = result.current.isSupported();

      expect(supported).toBe(true);
      expect(haptics.isSupported).toHaveBeenCalled();
    });

    it('should return false when haptics not supported', () => {
      (haptics.isSupported as any).mockReturnValue(false);

      const { result } = renderHook(() => useHaptics());

      const supported = result.current.isSupported();

      expect(supported).toBe(false);
    });
  });
});
