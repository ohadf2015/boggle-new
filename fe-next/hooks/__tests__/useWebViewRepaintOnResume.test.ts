/**
 * Tests for useWebViewRepaintOnResume
 *
 * On native, AdMob interstitial/rewarded ads are fullscreen Android Activities
 * composited OVER the Capacitor WebView. When that Activity dismisses, the
 * WebView can come back to the foreground without re-acquiring + repainting its
 * GPU surface — leaving a blank frame on top of the still-mounted React tree
 * (the "ad shows, then blank page" report).
 *
 * The existing per-ad `kickWebViewRepaint()` runs inside the ad's `Dismissed`
 * listener — fired mid-teardown while the WebView's rAF can still be throttled,
 * so its restore can be dropped. This hook adds the missing trigger: repaint on
 * actual WebView RESUME (`appStateChange isActive=true`), when the surface is
 * reattached and rAF runs normally. Mirrors how BannerCoordinatorMount reasserts
 * the banner on foreground for the same GPU-surface-recovery reason.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebViewRepaintOnResume } from '../useWebViewRepaintOnResume';
import * as platformUtils from '../../utils/platform';
import { kickWebViewRepaint } from '../../lib/native/webviewRepaint';

interface PluginListenerHandle {
  remove: () => void;
}

vi.mock('../../utils/platform');
vi.mock('../../lib/native/webviewRepaint', () => ({
  kickWebViewRepaint: vi.fn(),
  default: vi.fn(),
}));

const mockAddListener = vi.fn();

describe('useWebViewRepaintOnResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      isPluginAvailable: () => true,
      Plugins: {
        App: {
          addListener: mockAddListener,
        },
      },
    };
    (platformUtils.isNative as any).mockReturnValue(true);
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  it('repaints the WebView when the app returns to the foreground', async () => {
    let capturedCallback: (state: { isActive: boolean }) => void = () => {};
    mockAddListener.mockImplementation(async (_event: string, callback: any) => {
      capturedCallback = callback;
      return { remove: vi.fn() } as PluginListenerHandle;
    });

    renderHook(() => useWebViewRepaintOnResume());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(kickWebViewRepaint).not.toHaveBeenCalled();

    // App resumes after a fullscreen ad Activity dismisses.
    capturedCallback({ isActive: true });

    expect(kickWebViewRepaint).toHaveBeenCalledTimes(1);
  });

  it('does NOT repaint when the app goes to the background', async () => {
    let capturedCallback: (state: { isActive: boolean }) => void = () => {};
    mockAddListener.mockImplementation(async (_event: string, callback: any) => {
      capturedCallback = callback;
      return { remove: vi.fn() } as PluginListenerHandle;
    });

    renderHook(() => useWebViewRepaintOnResume());
    await new Promise((resolve) => setTimeout(resolve, 0));

    capturedCallback({ isActive: false });

    expect(kickWebViewRepaint).not.toHaveBeenCalled();
  });

  it('repaints again on each subsequent resume', async () => {
    let capturedCallback: (state: { isActive: boolean }) => void = () => {};
    mockAddListener.mockImplementation(async (_event: string, callback: any) => {
      capturedCallback = callback;
      return { remove: vi.fn() } as PluginListenerHandle;
    });

    renderHook(() => useWebViewRepaintOnResume());
    await new Promise((resolve) => setTimeout(resolve, 0));

    capturedCallback({ isActive: true });
    capturedCallback({ isActive: false });
    capturedCallback({ isActive: true });

    expect(kickWebViewRepaint).toHaveBeenCalledTimes(2);
  });

  it('does nothing on web (no listener registered)', async () => {
    (platformUtils.isNative as any).mockReturnValue(false);

    renderHook(() => useWebViewRepaintOnResume());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(kickWebViewRepaint).not.toHaveBeenCalled();
  });
});
