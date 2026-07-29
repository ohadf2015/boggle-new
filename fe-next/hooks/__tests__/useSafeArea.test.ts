import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSafeArea, SafeAreaInsets } from '../useSafeArea';

// Mock platform detection
vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(),
}));

// Mock capacitor-plugin-safe-area
vi.mock('capacitor-plugin-safe-area', () => ({
  SafeArea: {
    getSafeAreaInsets: vi.fn(),
    addListener: vi.fn(),
  },
}));

import { isNative } from '@/utils/platform';
import { SafeArea } from 'capacitor-plugin-safe-area';

const mockIsNative = isNative as any;
const mockSafeArea = SafeArea as any;

describe('useSafeArea', () => {
  const mockInsets: SafeAreaInsets = {
    top: 47,
    bottom: 34,
    left: 0,
    right: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document styles
    document.documentElement.style.removeProperty('--cap-safe-area-top');
    document.documentElement.style.removeProperty('--cap-safe-area-bottom');
    document.documentElement.style.removeProperty('--cap-safe-area-left');
    document.documentElement.style.removeProperty('--cap-safe-area-right');
  });

  it('should return zero insets on web', () => {
    mockIsNative.mockReturnValue(false);

    const { result } = renderHook(() => useSafeArea());

    expect(result.current).toEqual({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });

  it('should fetch safe area insets on native', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });
    mockSafeArea.addListener.mockResolvedValue({ remove: vi.fn() });

    const { result } = renderHook(() => useSafeArea());

    await waitFor(() => {
      expect(result.current).toEqual(mockInsets);
    });
  });

  it('should set CSS custom properties on native', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });
    mockSafeArea.addListener.mockResolvedValue({ remove: vi.fn() });

    renderHook(() => useSafeArea());

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-top')).toBe('47px');
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-bottom')).toBe('34px');
    });
  });

  it('should handle errors gracefully with silent fallback', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockRejectedValue(new Error('Plugin error'));
    mockSafeArea.addListener.mockResolvedValue({ remove: vi.fn() });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useSafeArea());

    // Let the rejected promise settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Silent fallback — no console.warn (avoids Sentry noise)
    expect(consoleSpy).not.toHaveBeenCalled();

    expect(result.current).toEqual({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });

    consoleSpy.mockRestore();
  });

  it('should cleanup listener on unmount', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });
    const mockRemove = vi.fn();
    mockSafeArea.addListener.mockResolvedValue({ remove: mockRemove });

    const { unmount } = renderHook(() => useSafeArea());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(mockSafeArea.addListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should clamp pathologically large insets to 0 (Android 15+ WindowInsets bug)', async () => {
    mockIsNative.mockReturnValue(true);
    // capacitor-plugin-safe-area on Android 15+ can return inset that double-counts
    // system bars (300+px) when AdMob attaches. Letting it through inflates
    // nav paddingBottom → tabs land mid-screen with dead bg-color band below.
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({
      insets: { top: 47, bottom: 312, left: 0, right: 0 },
    });
    mockSafeArea.addListener.mockResolvedValue({ remove: vi.fn() });

    const { result } = renderHook(() => useSafeArea());

    await waitFor(() => {
      expect(result.current.bottom).toBe(0);
      expect(result.current.top).toBe(47);
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-bottom')).toBe('0px');
    });
  });

  it('should also clamp inflated insets from safeAreaChanged events', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });
    let listenerCallback: ((data: { insets: SafeAreaInsets }) => void) = () => {};
    mockSafeArea.addListener.mockImplementation((eventName, callback) => {
      listenerCallback = callback as (data: { insets: SafeAreaInsets }) => void;
      return Promise.resolve({ remove: vi.fn() });
    });

    const { result } = renderHook(() => useSafeArea());
    await waitFor(() => expect(result.current).toEqual(mockInsets));

    listenerCallback({ insets: { top: 200, bottom: 250, left: 0, right: 0 } });

    await waitFor(() => {
      expect(result.current).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    });
  });

  it('should update insets when safeAreaChanged event fires', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });

    let listenerCallback: ((data: { insets: SafeAreaInsets }) => void) = () => {};
    mockSafeArea.addListener.mockImplementation((eventName, callback) => {
      listenerCallback = callback as (data: { insets: SafeAreaInsets }) => void;
      return Promise.resolve({ remove: vi.fn() });
    });

    const { result } = renderHook(() => useSafeArea());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current).toEqual(mockInsets);
    });

    // Simulate orientation change
    const newInsets: SafeAreaInsets = { top: 0, bottom: 0, left: 47, right: 47 };
    listenerCallback({ insets: newInsets });

    await waitFor(() => {
      expect(result.current).toEqual(newInsets);
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-left')).toBe('47px');
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-right')).toBe('47px');
    });
  });
});
