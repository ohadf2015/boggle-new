/**
 * Tests for useNativeAppStatePause — bridges Capacitor App lifecycle to
 * background/foreground callbacks. iOS swipe-up gesture and incoming-call
 * interruptions don't reliably fire `visibilitychange` in WKWebView, so
 * native consumers (audio mute, game timer pause) must subscribe to
 * `App.appStateChange` directly.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as platform from '@/utils/platform';

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(),
}));

const { mockAddListener, mockRemove } = vi.hoisted(() => ({
  mockAddListener: vi.fn(),
  mockRemove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (event: string, handler: (state: { isActive: boolean }) => void) =>
      mockAddListener(event, handler),
  },
}));

import { useNativeAppStatePause } from '../useNativeAppStatePause';

describe('useNativeAppStatePause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddListener.mockResolvedValue({ remove: mockRemove });
  });

  it('does not subscribe on web', async () => {
    (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(false);

    renderHook(() =>
      useNativeAppStatePause({ onBackground: vi.fn(), onForeground: vi.fn() })
    );
    await vi.dynamicImportSettled();
    await Promise.resolve();

    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('subscribes to appStateChange on native', async () => {
    (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);

    renderHook(() =>
      useNativeAppStatePause({ onBackground: vi.fn(), onForeground: vi.fn() })
    );
    await vi.dynamicImportSettled();
    await Promise.resolve();

    expect(mockAddListener).toHaveBeenCalledWith('appStateChange', expect.any(Function));
  });

  it('fires onBackground when app becomes inactive', async () => {
    (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const onBackground = vi.fn();
    const onForeground = vi.fn();

    renderHook(() => useNativeAppStatePause({ onBackground, onForeground }));
    await vi.dynamicImportSettled();
    await Promise.resolve();

    const handler = mockAddListener.mock.calls[0][1] as (s: { isActive: boolean }) => void;
    handler({ isActive: false });

    expect(onBackground).toHaveBeenCalledTimes(1);
    expect(onForeground).not.toHaveBeenCalled();
  });

  it('fires onForeground when app becomes active', async () => {
    (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const onBackground = vi.fn();
    const onForeground = vi.fn();

    renderHook(() => useNativeAppStatePause({ onBackground, onForeground }));
    await vi.dynamicImportSettled();
    await Promise.resolve();

    const handler = mockAddListener.mock.calls[0][1] as (s: { isActive: boolean }) => void;
    handler({ isActive: true });

    expect(onForeground).toHaveBeenCalledTimes(1);
    expect(onBackground).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', async () => {
    (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { unmount } = renderHook(() =>
      useNativeAppStatePause({ onBackground: vi.fn() })
    );
    await vi.dynamicImportSettled();
    await Promise.resolve();
    unmount();
    await vi.dynamicImportSettled();
    await Promise.resolve();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('handles missing onBackground/onForeground gracefully', async () => {
    (platform.isNative as ReturnType<typeof vi.fn>).mockReturnValue(true);

    renderHook(() => useNativeAppStatePause({}));
    await vi.dynamicImportSettled();
    await Promise.resolve();

    const handler = mockAddListener.mock.calls[0][1] as (s: { isActive: boolean }) => void;
    expect(() => handler({ isActive: false })).not.toThrow();
    expect(() => handler({ isActive: true })).not.toThrow();
  });
});
