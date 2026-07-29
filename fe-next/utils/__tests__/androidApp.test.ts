import { describe, it, expect } from 'vitest';
import {
  ANDROID_PACKAGE,
  PLAY_STORE_URL,
  isAndroidBrowser,
  shouldShowAndroidInstallPromo,
  type AndroidPromoGateInput,
} from '../androidApp';

const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const ANDROID_WEBVIEW_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36';
const ANDROID_INSTAGRAM_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 300.0.0.0 Android';
const ANDROID_FB_UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36 [FBAN/FB4A;FBAV/400.0.0.0]';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

describe('androidApp constants', () => {
  it('exposes the correct package id', () => {
    expect(ANDROID_PACKAGE).toBe('live.lexiclash.app');
  });

  it('builds the canonical Play Store URL from the package id', () => {
    expect(PLAY_STORE_URL).toBe(
      'https://play.google.com/store/apps/details?id=live.lexiclash.app'
    );
  });
});

describe('isAndroidBrowser', () => {
  it('returns true for a regular Android Chrome browser', () => {
    expect(isAndroidBrowser(ANDROID_CHROME_UA)).toBe(true);
  });

  it('returns false inside an Android WebView (Capacitor / embedded)', () => {
    expect(isAndroidBrowser(ANDROID_WEBVIEW_UA)).toBe(false);
  });

  it('returns false inside the Instagram in-app browser', () => {
    expect(isAndroidBrowser(ANDROID_INSTAGRAM_UA)).toBe(false);
  });

  it('returns false inside the Facebook in-app browser', () => {
    expect(isAndroidBrowser(ANDROID_FB_UA)).toBe(false);
  });

  it('returns false on iPhone', () => {
    expect(isAndroidBrowser(IPHONE_UA)).toBe(false);
  });

  it('returns false on desktop', () => {
    expect(isAndroidBrowser(DESKTOP_UA)).toBe(false);
  });

  it('returns false for an empty UA', () => {
    expect(isAndroidBrowser('')).toBe(false);
  });
});

describe('shouldShowAndroidInstallPromo', () => {
  const base: AndroidPromoGateInput = {
    ua: ANDROID_CHROME_UA,
    isCapacitorNative: false,
    isStandalone: false,
    isInstalled: false,
    isAllowedRoute: true,
    dismissedUntil: null,
    sessionShown: false,
    now: 1_000_000,
  };

  it('shows when every gate passes (Android web, not installed, allowed route, fresh)', () => {
    expect(shouldShowAndroidInstallPromo(base)).toBe(true);
  });

  it('hides inside the native Capacitor app', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isCapacitorNative: true })).toBe(false);
  });

  it('hides on iOS / desktop / non-Android browsers', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, ua: IPHONE_UA })).toBe(false);
    expect(shouldShowAndroidInstallPromo({ ...base, ua: DESKTOP_UA })).toBe(false);
  });

  it('hides when launched as an installed PWA (standalone display)', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isStandalone: true })).toBe(false);
  });

  it('hides when the native app is already installed (deep-link redirect owns that case)', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isInstalled: true })).toBe(false);
  });

  it('hides on gameplay routes where banners/popups are disallowed', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isAllowedRoute: false })).toBe(false);
  });

  it('hides when already shown this session', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, sessionShown: true })).toBe(false);
  });

  it('hides while still within the dismissal window', () => {
    expect(
      shouldShowAndroidInstallPromo({ ...base, dismissedUntil: 2_000_000, now: 1_000_000 })
    ).toBe(false);
  });

  it('shows again once the dismissal window has elapsed', () => {
    expect(
      shouldShowAndroidInstallPromo({ ...base, dismissedUntil: 1_000_000, now: 2_000_000 })
    ).toBe(true);
  });
});
