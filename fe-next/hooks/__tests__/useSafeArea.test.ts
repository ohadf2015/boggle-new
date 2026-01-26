import { renderHook, waitFor } from '@testing-library/react';
import { useSafeArea, SafeAreaInsets } from '../useSafeArea';

// Mock platform detection
jest.mock('@/utils/platform', () => ({
  isNative: jest.fn(),
}));

// Mock capacitor-plugin-safe-area
jest.mock('capacitor-plugin-safe-area', () => ({
  SafeArea: {
    getSafeAreaInsets: jest.fn(),
    addListener: jest.fn(),
  },
}));

import { isNative } from '@/utils/platform';
import { SafeArea } from 'capacitor-plugin-safe-area';

const mockIsNative = isNative as jest.MockedFunction<typeof isNative>;
const mockSafeArea = SafeArea as jest.Mocked<typeof SafeArea>;

describe('useSafeArea', () => {
  const mockInsets: SafeAreaInsets = {
    top: 47,
    bottom: 34,
    left: 0,
    right: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
    mockSafeArea.addListener.mockResolvedValue({ remove: jest.fn() });

    const { result } = renderHook(() => useSafeArea());

    await waitFor(() => {
      expect(result.current).toEqual(mockInsets);
    });
  });

  it('should set CSS custom properties on native', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });
    mockSafeArea.addListener.mockResolvedValue({ remove: jest.fn() });

    renderHook(() => useSafeArea());

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-top')).toBe('47px');
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-bottom')).toBe('34px');
    });
  });

  it('should handle errors gracefully', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockRejectedValue(new Error('Plugin error'));
    mockSafeArea.addListener.mockResolvedValue({ remove: jest.fn() });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useSafeArea());

    // Should return zero insets on error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get safe area insets:', expect.any(Error));
    });

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
    const mockRemove = jest.fn();
    mockSafeArea.addListener.mockResolvedValue({ remove: mockRemove });

    const { unmount } = renderHook(() => useSafeArea());

    // Wait for listener to be set up
    await waitFor(() => {
      expect(mockSafeArea.addListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should update insets when safeAreaChanged event fires', async () => {
    mockIsNative.mockReturnValue(true);
    mockSafeArea.getSafeAreaInsets.mockResolvedValue({ insets: mockInsets });

    let listenerCallback: ((data: { insets: SafeAreaInsets }) => void) | null = null;
    mockSafeArea.addListener.mockImplementation((eventName, callback) => {
      listenerCallback = callback;
      return Promise.resolve({ remove: jest.fn() });
    });

    const { result } = renderHook(() => useSafeArea());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current).toEqual(mockInsets);
    });

    // Simulate orientation change
    const newInsets: SafeAreaInsets = { top: 0, bottom: 0, left: 47, right: 47 };
    if (listenerCallback) {
      listenerCallback({ insets: newInsets });
    }

    await waitFor(() => {
      expect(result.current).toEqual(newInsets);
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-left')).toBe('47px');
      expect(document.documentElement.style.getPropertyValue('--cap-safe-area-right')).toBe('47px');
    });
  });
});
