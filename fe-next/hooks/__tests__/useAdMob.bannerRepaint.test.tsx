import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';

// Spy on the WebView repaint kick so we can assert hideBanner triggers it.
const kickSpy = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/lib/native/webviewRepaint', () => ({
  kickWebViewRepaint: kickSpy,
  default: kickSpy,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => 'android'),
    isPluginAvailable: vi.fn(() => true),
  },
}));

type Listener = (payload?: unknown) => void;
const { listeners } = vi.hoisted(() => {
  const ls: Record<string, Listener[]> = {};
  return { listeners: ls };
});

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    requestConsentInfo: vi.fn(() =>
      Promise.resolve({ status: 'NOT_REQUIRED', isConsentFormAvailable: false }),
    ),
    showConsentForm: vi.fn(() => Promise.resolve()),
    showBanner: vi.fn(() => Promise.resolve()),
    hideBanner: vi.fn(() => Promise.resolve()),
    addListener: vi.fn((name: string, fn: Listener) => {
      (listeners[name] ||= []).push(fn);
      return Promise.resolve({ remove: () => Promise.resolve() });
    }),
  },
  AdmobConsentStatus: { NOT_REQUIRED: 'NOT_REQUIRED', OBTAINED: 'OBTAINED', REQUIRED: 'REQUIRED', UNKNOWN: 'UNKNOWN' },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER', BANNER: 'BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  RewardAdPluginEvents: {},
  InterstitialAdPluginEvents: {},
}));

import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { AdMobProvider } from '@/contexts/AdMobContext';
import { useAdMob } from '../useAdMob';

function Wrapper({ children }: { children: ReactNode }) {
  return <AdMobProvider>{children}</AdMobProvider>;
}

describe('useAdMob hideBanner → WebView repaint (white-screen fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });

  it('kicks a WebView repaint after the native banner is hidden', async () => {
    const { result } = renderHook(() => useAdMob(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(AdMob.hideBanner).toHaveBeenCalled();
    expect(kickSpy).toHaveBeenCalledTimes(1);
  });

  it('still kicks a repaint when the hide call throws (teardown happens regardless)', async () => {
    vi.mocked(AdMob.hideBanner).mockRejectedValueOnce({ message: 'internal SDK failure' });
    const { result } = renderHook(() => useAdMob(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.hideBanner();
    });
    // finally-block kick: a cheap one-frame layer toggle is harmless on the
    // error path and we always want the WebView to redraw during teardown.
    expect(kickSpy).toHaveBeenCalledTimes(1);
  });
});
