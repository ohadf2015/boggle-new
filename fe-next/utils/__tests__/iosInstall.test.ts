import { describe, it, expect } from 'vitest';
import { isIOSSafari, shouldShowIOSInstallHint, type IOSInstallHintInput } from '../iosInstall';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1';
const IPHONE_FB =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/400.0.0.0]';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36';
const DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

describe('isIOSSafari', () => {
  it('is true for iPhone Safari', () => expect(isIOSSafari(IPHONE_SAFARI)).toBe(true));
  it('is false for Chrome on iOS (no A2HS)', () => expect(isIOSSafari(IPHONE_CHROME)).toBe(false));
  it('is false inside the Facebook in-app browser', () => expect(isIOSSafari(IPHONE_FB)).toBe(false));
  it('is false on Android', () => expect(isIOSSafari(ANDROID)).toBe(false));
  it('is false on desktop', () => expect(isIOSSafari(DESKTOP)).toBe(false));
});

describe('shouldShowIOSInstallHint', () => {
  const base: IOSInstallHintInput = {
    ua: IPHONE_SAFARI,
    isStandalone: false,
    gamesCompleted: 2,
    dismissedUntil: null,
    now: 1_000_000,
  };

  it('shows for engaged iPhone Safari users not yet installed', () => {
    expect(shouldShowIOSInstallHint(base)).toBe(true);
  });

  it('hides on Android / desktop (Android promo / desktop promo own those)', () => {
    expect(shouldShowIOSInstallHint({ ...base, ua: ANDROID })).toBe(false);
    expect(shouldShowIOSInstallHint({ ...base, ua: DESKTOP })).toBe(false);
  });

  it('hides once installed to the home screen', () => {
    expect(shouldShowIOSInstallHint({ ...base, isStandalone: true })).toBe(false);
  });

  it('hides before the engagement threshold', () => {
    expect(shouldShowIOSInstallHint({ ...base, gamesCompleted: 1 })).toBe(false);
  });

  it('hides within the dismissal window, shows once elapsed', () => {
    expect(shouldShowIOSInstallHint({ ...base, dismissedUntil: 2_000_000, now: 1_000_000 })).toBe(false);
    expect(shouldShowIOSInstallHint({ ...base, dismissedUntil: 1_000_000, now: 2_000_000 })).toBe(true);
  });
});
