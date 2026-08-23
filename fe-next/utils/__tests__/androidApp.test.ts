import { describe, it, expect } from 'vitest';
import {
  ANDROID_PACKAGE,
  PLAY_STORE_URL,
  isAndroidBrowser,
  isAndroidInstallPromoUA,
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
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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

describe('isAndroidInstallPromoUA', () => {
  it('returns true for a regular Android Chrome browser', () => {
    expect(isAndroidInstallPromoUA(ANDROID_CHROME_UA)).toBe(true);
  });

  it('returns true on desktop (promote the Android app there too)', () => {
    expect(isAndroidInstallPromoUA(DESKTOP_UA)).toBe(true);
  });

  it('returns false on iPhone (no Android app to install)', () => {
    expect(isAndroidInstallPromoUA(IPHONE_UA)).toBe(false);
  });

  it('returns false on iPad / iPod', () => {
    expect(isAndroidInstallPromoUA(IPAD_UA)).toBe(false);
  });

  it('returns false inside the Instagram in-app browser', () => {
    expect(isAndroidInstallPromoUA(ANDROID_INSTAGRAM_UA)).toBe(false);
  });

  it('returns false inside the Facebook in-app browser', () => {
    expect(isAndroidInstallPromoUA(ANDROID_FB_UA)).toBe(false);
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

  // Regression: /multiplayer is deliberately OFF the GAME_ROUTES blocklist so its passive
  // lobby keeps its banner, so `isAllowedRoute` is true during an active round there. Before
  // this gate, a full-screen install interstitial and a floating pill painted over a live
  // board on www.lexiclash.live/he (2026-08-23, pill across 4 of 36 tiles).
  it('hides while a fullscreen game surface is on screen, even on an allowed route', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isAllowedRoute: true, inGame: true })).toBe(false);
  });

  it('still shows on an allowed route once the round is over', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isAllowedRoute: true, inGame: false })).toBe(true);
  });

  it('hides inside the native Capacitor app', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, isCapacitorNative: true })).toBe(false);
  });

  it('hides on iOS (no Android app to install)', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, ua: IPHONE_UA })).toBe(false);
    expect(shouldShowAndroidInstallPromo({ ...base, ua: IPAD_UA })).toBe(false);
  });

  it('shows on desktop (promote the Android app to desktop players)', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, ua: DESKTOP_UA })).toBe(true);
  });

  it('hides inside in-app webviews where Play navigation is unreliable', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, ua: ANDROID_FB_UA })).toBe(false);
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

describe('shouldShowAndroidInstallPromo — exp-install-promo-after-first-game-v1', () => {
  // Native players are the entire AdMob pool (activeUsers 68→26/wk), and web→native
  // install is what creates them. Exposure is at an all-time high (promo_shown 124/wk,
  // pill_shown 337/wk) yet 82% of promos are dismissed — the leak is conversion, not
  // reach. The promo currently fires 12s after page load with no requirement that the
  // visitor has played anything, so a first-timer is asked to install before any value
  // is delivered. This gate lets the experiment's variant require one completed game
  // first. CONTROL MUST BE UNCHANGED: omitting the field keeps today's behaviour.
  const base = {
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36',
    isCapacitorNative: false,
    isStandalone: false,
    isInstalled: false,
    isAllowedRoute: true,
    dismissedUntil: null,
    sessionShown: false,
    now: 1_000_000,
  };

  it('control (field omitted) shows the promo with zero games played', () => {
    expect(shouldShowAndroidInstallPromo(base)).toBe(true);
  });

  it('variant withholds the promo until a game has been completed', () => {
    expect(
      shouldShowAndroidInstallPromo({ ...base, requireEngagement: true, gamesCompleted: 0 }),
    ).toBe(false);
  });

  it('variant shows the promo once a game has been completed', () => {
    expect(
      shouldShowAndroidInstallPromo({ ...base, requireEngagement: true, gamesCompleted: 1 }),
    ).toBe(true);
  });

  it('variant treats a missing count as not-yet-engaged (never as engaged)', () => {
    expect(shouldShowAndroidInstallPromo({ ...base, requireEngagement: true })).toBe(false);
  });

  it('engagement never overrides the other gates', () => {
    const engaged = { ...base, requireEngagement: true, gamesCompleted: 5 };
    expect(shouldShowAndroidInstallPromo({ ...engaged, isInstalled: true })).toBe(false);
    expect(shouldShowAndroidInstallPromo({ ...engaged, sessionShown: true })).toBe(false);
    expect(shouldShowAndroidInstallPromo({ ...engaged, isAllowedRoute: false })).toBe(false);
  });
});
