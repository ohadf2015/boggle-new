/**
 * AnchoredNativeBanner — shows AdMob anchored banner on non-gameplay hub routes.
 * Gameplay/results skip banner (those fire interstitial — no double-dip).
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';

const { showBanner, hideBanner, mockPathname, addListener } = vi.hoisted(() => ({
  showBanner: vi.fn(),
  hideBanner: vi.fn(),
  mockPathname: { current: '/' },
  addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname.current,
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ showBanner, hideBanner, showInterstitial: vi.fn(), showRewarded: vi.fn() }),
  default: () => ({ showBanner, hideBanner, showInterstitial: vi.fn(), showRewarded: vi.fn() }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: { addListener },
  BannerAdPluginEvents: { SizeChanged: 'bannerAdSizeChanged' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

import AnchoredNativeBanner from '../AnchoredNativeBanner';

describe('AnchoredNativeBanner', () => {
  beforeEach(() => {
    showBanner.mockClear();
    hideBanner.mockClear();
    addListener.mockClear();
    mockPathname.current = '/';
  });
  afterEach(cleanup);

  it('shows banner on home route', async () => {
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledTimes(1);
  });

  it('shows banner above GlobalBottomNav on home route (margin=64)', async () => {
    mockPathname.current = '/';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 64);
  });

  it('shows banner above GlobalBottomNav on /settings (margin=64)', async () => {
    mockPathname.current = '/settings';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 64);
  });

  it('shows banner flush at bottom on /education (nav hidden, margin=0)', async () => {
    mockPathname.current = '/education';
    render(<AnchoredNativeBanner />);
    await Promise.resolve();
    expect(showBanner).toHaveBeenCalledWith('BOTTOM_CENTER', 0);
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
});
