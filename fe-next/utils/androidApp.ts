/**
 * Shared helpers for the LexiClash native Android app on web.
 *
 * Two consumers:
 *  - AndroidAppRedirect  → deep-links users who ALREADY have the app installed.
 *  - AndroidAppInstallPromo → invites Android web users who DON'T have it yet.
 *
 * Detection is User-Agent based (not Capacitor's getPlatform, which only knows
 * about the native shell) so we can tell "Android mobile browser" apart from
 * "inside the native app" and from "iOS/desktop".
 */

export const ANDROID_PACKAGE = 'live.lexiclash.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

type RelatedApp = { platform: string; id?: string; url?: string };

/** True when running inside the Capacitor native shell (not a web browser). */
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * True for a real Android mobile browser (Chrome, Samsung Internet, Firefox…).
 * Excludes Android WebViews (the `; wv)` token — used by our own native shell
 * and other embeds) and the major in-app browsers, where deep-link / install
 * flows are unreliable or unwanted.
 */
export function isAndroidBrowser(ua: string): boolean {
  if (!/Android/i.test(ua)) return false;
  if (/wv\)|; wv\)/.test(ua)) return false;
  if (/FBAN|FBAV|Instagram|Line\/|TikTok|MicroMessenger/i.test(ua)) return false;
  return true;
}

/** True when the page is running as an installed PWA (standalone display mode). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Resolves whether the native app is already installed, via the Chromium-only
 * `navigator.getInstalledRelatedApps()`. On browsers without the API (Firefox,
 * Samsung Internet, older Chrome) it resolves `false` — i.e. "treat as not
 * installed" so the install promo still shows.
 */
export async function hasLexiClashInstalled(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as unknown as {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  };
  if (typeof nav.getInstalledRelatedApps !== 'function') return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return apps.some((a) => a.platform === 'play' && a.id === ANDROID_PACKAGE);
  } catch {
    return false;
  }
}

export interface AndroidPromoGateInput {
  /** navigator.userAgent */
  ua: string;
  /** running inside the Capacitor native shell */
  isCapacitorNative: boolean;
  /** running as an installed PWA */
  isStandalone: boolean;
  /** native app already installed (resolved via getInstalledRelatedApps) */
  isInstalled: boolean;
  /** current route permits a promo (reuses the ad-banner route allowlist) */
  isAllowedRoute: boolean;
  /** ms timestamp until which the user dismissed the promo, or null */
  dismissedUntil: number | null;
  /** promo already shown in this browser session */
  sessionShown: boolean;
  /** current time in ms */
  now: number;
}

/**
 * Pure gating decision for the install promo. All side-effecting inputs
 * (UA, Capacitor, matchMedia, async install check, storage, time) are
 * resolved by the caller and passed in, so this stays trivially testable.
 */
export function shouldShowAndroidInstallPromo(input: AndroidPromoGateInput): boolean {
  if (input.isCapacitorNative) return false;
  if (!isAndroidBrowser(input.ua)) return false;
  if (input.isStandalone) return false;
  if (input.isInstalled) return false;
  if (!input.isAllowedRoute) return false;
  if (input.sessionShown) return false;
  if (input.dismissedUntil != null && input.now < input.dismissedUntil) return false;
  return true;
}
