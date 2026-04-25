/**
 * AnchoredNativeBanner — shows AdMob anchored banner on non-gameplay hub routes.
 * Gameplay/results skip banner (those fire interstitial — no double-dip).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const { showBanner, hideBanner, mockPathname, addListener, mockPlatform, mockSafeArea } = vi.hoisted(() => ({
  showBanner: vi.fn(),
  hideBanner: vi.fn(),
  mockPathname: { current: '/' },
  addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
  mockPlatform: { current: 'ios' as 'ios' | 'android' | 'web' },
  mockSafeArea: { current: { top: 0, bottom: 0, left: 0, right: 0 } },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname.current,
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ showBanner, hideBanner, showInterstitial: vi.fn(), showRewarded: vi.fn() }),
  default: () => ({ showBanner, hideBanner, showInterstitial: vi.fn(), showRewarded: vi.fn() }),
}));

vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => mockSafeArea.current,
  default: () => mockSafeArea.current,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => mockPlatform.current,
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: { addListener },
  BannerAdPluginEvents: {
    SizeChanged: 'bannerAdSizeChanged',
    FailedToLoad: 'bannerAdFailedToLoad',
    Closed: 'bannerAdClosed',
  },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

import AnchoredNativeBanner from '../AnchoredNativeBanner';

describe('AnchoredNativeBanner', () => {
  beforeEach(() => {
    showBanner.mockClear();
    hideBanner.mockClear();
    addListener.mockClear();
    mockPathname.current = '/';
    mockPlatform.current = 'ios';
    mockSafeArea.current = { top: 0, bottom: 0, left: 0, right: 0 };
  });
  afterEach(cleanup);

  it('shows banner on home route', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledTimes(1);
  });

  it('shows banner flush at bottom on iOS (margin=0, plugin uses safeAreaLayoutGuide)', async () => {
    mockPathname.current = '/';
    mockPlatform.current = 'ios';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 0);
  });

  it('ignores iOS safe-area in margin (plugin handles home indicator)', async () => {
    mockPathname.current = '/';
    mockPlatform.current = 'ios';
    mockSafeArea.current = { top: 47, bottom: 34, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 0);
  });

  it('lifts banner above gesture bar on Android (margin=safeArea.bottom)', async () => {
    mockPathname.current = '/';
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 24, bottom: 24, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 24);
  });

  it('uses margin=0 on Android when safe-area is zero', async () => {
    mockPathname.current = '/';
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 0, bottom: 0, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 0);
  });

  it('margin is route-independent — nav floats via CSS var, not plugin margin', async () => {
    mockPathname.current = '/education';
    mockPlatform.current = 'android';
    mockSafeArea.current = { top: 24, bottom: 24, left: 0, right: 0 };
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 24);
  });

  it('shows banner on locale-prefixed home', async () => {
    mockPathname.current = '/he';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledTimes(1);
  });

  it('shows banner on /leagues hub', async () => {
    mockPathname.current = '/en/leagues';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledTimes(1);
  });

  it('shows banner on /settings', async () => {
    mockPathname.current = '/settings';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledTimes(1);
  });

  it('hides banner on /singleplayer gameplay', async () => {
    mockPathname.current = '/singleplayer';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).not.toHaveBeenCalled();
    expect(hideBanner).toHaveBeenCalled();
  });

  it('hides banner on /multiplayer', async () => {
    mockPathname.current = '/en/multiplayer';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).not.toHaveBeenCalled();
    expect(hideBanner).toHaveBeenCalled();
  });

  it('shows banner on /adventure (real ads during adventure gameplay)', async () => {
    mockPathname.current = '/adventure/boss-rush';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledTimes(1);
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 0);
  });

  it('hides banner on /daily', async () => {
    mockPathname.current = '/daily';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).not.toHaveBeenCalled();
    expect(hideBanner).toHaveBeenCalled();
  });

  it('registers SizeChanged listener on mount', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(addListener).toHaveBeenCalledWith('bannerAdSizeChanged', expect.any(Function));
  });

  it('registers FailedToLoad and Closed listeners that reset --admob-banner-height', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    const failedCall = addListener.mock.calls.find((c) => c[0] === 'bannerAdFailedToLoad');
    const closedCall = addListener.mock.calls.find((c) => c[0] === 'bannerAdClosed');
    expect(failedCall).toBeTruthy();
    expect(closedCall).toBeTruthy();
    document.documentElement.style.setProperty('--admob-banner-height', '60px');
    (failedCall![1] as () => void)();
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('0px');
    document.documentElement.style.setProperty('--admob-banner-height', '60px');
    (closedCall![1] as () => void)();
    expect(document.documentElement.style.getPropertyValue('--admob-banner-height')).toBe('0px');
  });
});
