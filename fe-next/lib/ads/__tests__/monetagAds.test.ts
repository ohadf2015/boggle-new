import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// isNative() is the AdMob-collision gate: Monetag (popunder-class) must never
// load or show inside the native Capacitor app where AdMob serves. We mock it
// per-test to assert the gate holds at BOTH script-load and show time.
vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => false),
}));

import { isNative } from '@/utils/platform';
import {
  showRewardedMonetag,
  getMonetagZoneId,
  isMonetagAllowedSurface,
  loadMonetagSdk,
  __resetMonetagSdkForTests,
} from '../monetagAds';

const mockedIsNative = vi.mocked(isNative);

describe('monetagAds — rewarded settle model', () => {
  beforeEach(() => {
    __resetMonetagSdkForTests();
    mockedIsNative.mockReturnValue(false);
  });

  it('grants reward when the show promise resolves (Monetag: reward owed in .then)', async () => {
    const showAdFn = () => Promise.resolve();
    const watched = await showRewardedMonetag({ showAdFn });
    expect(watched).toBe(true);
  });

  it('does NOT grant reward (rejects) when the ad is dismissed / fails (promise rejects)', async () => {
    const showAdFn = () => Promise.reject(new Error('monetag-dismissed'));
    await expect(showRewardedMonetag({ showAdFn })).rejects.toThrow('monetag-dismissed');
  });

  it('refuses to show inside the native app (AdMob collision guard)', async () => {
    mockedIsNative.mockReturnValue(true);
    const showAdFn = vi.fn(() => Promise.resolve());
    await expect(showRewardedMonetag({ showAdFn })).rejects.toThrow(/native/);
    expect(showAdFn).not.toHaveBeenCalled(); // never even attempted in-app
  });
});

describe('monetagAds — surface gating', () => {
  beforeEach(() => {
    __resetMonetagSdkForTests();
    mockedIsNative.mockReturnValue(false);
  });

  it('allows the web top-frame surface', () => {
    expect(isMonetagAllowedSurface()).toBe(true);
  });

  it('blocks the native app surface', () => {
    mockedIsNative.mockReturnValue(true);
    expect(isMonetagAllowedSurface()).toBe(false);
  });

  it('does NOT inject the SDK script inside the native app', async () => {
    mockedIsNative.mockReturnValue(true);
    await loadMonetagSdk('123456');
    expect(document.getElementById('monetag-sdk')).toBeNull();
  });

  it('injects the SDK script on the web surface with the zone wired', () => {
    // Intercept appendChild so happy-dom never actually fetches the SDK URL —
    // we only assert the element is built with the zone correctly wired.
    let injected: HTMLScriptElement | null = null;
    const spy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node: unknown) => {
        injected = node as HTMLScriptElement;
        return node as Node;
      });

    void loadMonetagSdk('123456');

    expect(injected).not.toBeNull();
    expect(injected!.id).toBe('monetag-sdk');
    expect(injected!.getAttribute('data-zone')).toBe('123456');
    expect(injected!.getAttribute('data-sdk')).toBe('show_123456');
    spy.mockRestore();
  });
});

describe('monetagAds — zone id resolution', () => {
  const original = process.env.NEXT_PUBLIC_MONETAG_ZONE_ID;
  beforeEach(() => __resetMonetagSdkForTests());
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_MONETAG_ZONE_ID;
    else process.env.NEXT_PUBLIC_MONETAG_ZONE_ID = original;
  });

  it('reads the zone id from NEXT_PUBLIC_MONETAG_ZONE_ID', () => {
    process.env.NEXT_PUBLIC_MONETAG_ZONE_ID = '987654';
    expect(getMonetagZoneId()).toBe('987654');
  });

  it('returns empty string when no zone id is configured (stays dark)', () => {
    delete process.env.NEXT_PUBLIC_MONETAG_ZONE_ID;
    expect(getMonetagZoneId()).toBe('');
  });
});
