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

/**
 * Play Store URL carrying a Google Play Install Referrer, so installs sourced
 * from an SEO landing page are attributable in Play Console.
 *
 * The `referrer` value is a urlencoded `utm_*` string; Play decodes it and
 * exposes it via the Install Referrer API. `campaign` is typically the page
 * slug; `locale` (optional) lands in `utm_content` for per-language attribution.
 */
export function playStoreUrlWithReferrer(campaign: string, locale?: string): string {
  let referrer = `utm_source=seo&utm_medium=landing&utm_campaign=${campaign}`;
  if (locale) referrer += `&utm_content=${locale}`;
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
}

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

/**
 * True for a User-Agent where promoting the native *Android* app makes sense:
 * desktop and Android / other mobile browsers. Returns false where installing
 * an Android app is impossible or the Play Store link is unreliable:
 *  - iOS (iPhone/iPad/iPod) — there is no Android app to install there.
 *  - Android WebViews (`; wv)`) and known in-app browsers (FB/IG/TikTok/WeChat/
 *    Line) — Play Store navigation is blocked or flaky inside them.
 *
 * Unlike `isAndroidBrowser` (deep-link / PWA-precedence use), this deliberately
 * INCLUDES desktop so the install promo reaches desktop players too.
 *
 * ponytail: iPadOS 13+ reports a Mac desktop UA, so an iPad reads as desktop and
 * gets the promo — a harmless Play link the user can't act on. Acceptable; the
 * ask is specifically "hide on iPhone". Tighten with maxTouchPoints only if iPad
 * impressions prove noisy.
 */
export function isAndroidInstallPromoUA(ua: string): boolean {
  if (/iPhone|iPad|iPod/i.test(ua)) return false;
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
  /**
   * A fullscreen game surface is on screen right now (`body.screen-fit-locked`).
   * The route allowlist cannot see this: `/multiplayer` is deliberately absent from
   * GAME_ROUTES so its passive lobby keeps its banner, which also let the promo fire
   * over a live board. This is the same OPT-OUT signal `shouldSuppressBanner()` uses,
   * so every mode — including ones added later — is covered without a route edit.
   */
  inGame?: boolean;
  /** ms timestamp until which the user dismissed the promo, or null */
  dismissedUntil: number | null;
  /** promo already shown in this browser session */
  sessionShown: boolean;
  /**
   * exp-install-promo-after-first-game-v1 variant: require the visitor to have
   * completed at least one game before asking them to install. Omitted/false =
   * CONTROL, i.e. today's behaviour (12s after page load, no engagement needed).
   */
  requireEngagement?: boolean;
  /** Completed games on this device — `readGamesCompletedCount()`. */
  gamesCompleted?: number;
  /**
   * Cookie consent has not been decided yet. The install Dialog portals above
   * the in-tree cookie sheet and traps focus, so auto-popup must wait — otherwise
   * first-visit ACCEPT ALL is unreachable until the visitor dismisses the promo.
   */
  consentPending?: boolean;
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
  if (!isAndroidInstallPromoUA(input.ua)) return false;
  if (input.isStandalone) return false;
  if (input.isInstalled) return false;
  if (!input.isAllowedRoute) return false;
  // A live board outranks the route allowlist. Checked at FIRE time by the caller,
  // so this delays the promo to the end of the round rather than suppressing it.
  if (input.inGame) return false;
  if (input.sessionShown) return false;
  if (input.dismissedUntil != null && input.now < input.dismissedUntil) return false;
  // Engagement gate (variant only). `?? 0` so a missing count reads as NOT engaged —
  // the safe direction: it withholds a prompt rather than firing one on a visitor who
  // has seen nothing of the game.
  if (input.requireEngagement && (input.gamesCompleted ?? 0) < 1) return false;
  // Cookie-consent gate. Re-armed by the caller (same pattern as inGame) so the
  // promo lands after ACCEPT / DECLINE rather than stacking over the sheet.
  if (input.consentPending) return false;
  return true;
}
