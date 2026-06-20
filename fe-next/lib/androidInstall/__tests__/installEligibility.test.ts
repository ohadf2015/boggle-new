import { describe, it, expect } from 'vitest';
import { isAndroidInstallEntryEligible } from '../installEligibility';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1';
const WEBVIEW_UA =
  'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';

const base = { isCapacitorNative: false, isStandalone: false };

describe('isAndroidInstallEntryEligible', () => {
  it('is eligible on a real Android browser', () => {
    expect(isAndroidInstallEntryEligible({ ...base, ua: ANDROID_UA })).toBe(true);
  });

  it('is not eligible on desktop', () => {
    expect(isAndroidInstallEntryEligible({ ...base, ua: DESKTOP_UA })).toBe(false);
  });

  it('is not eligible on iOS', () => {
    expect(isAndroidInstallEntryEligible({ ...base, ua: IOS_UA })).toBe(false);
  });

  it('is not eligible inside an Android WebView (our native shell)', () => {
    expect(isAndroidInstallEntryEligible({ ...base, ua: WEBVIEW_UA })).toBe(false);
  });

  it('is not eligible inside the Capacitor native shell', () => {
    expect(
      isAndroidInstallEntryEligible({ ...base, ua: ANDROID_UA, isCapacitorNative: true })
    ).toBe(false);
  });

  it('is not eligible when already installed as a standalone PWA', () => {
    expect(
      isAndroidInstallEntryEligible({ ...base, ua: ANDROID_UA, isStandalone: true })
    ).toBe(false);
  });

  it('ignores cooldown/session — re-entry surfaces stay available (user-initiated)', () => {
    // No dismissedUntil/sessionShown inputs exist here at all: by design the
    // re-entry gate is platform-only, unlike the auto-popup gate.
    expect(isAndroidInstallEntryEligible({ ...base, ua: ANDROID_UA })).toBe(true);
  });
});
