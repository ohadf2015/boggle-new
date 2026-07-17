/**
 * iOS "Add to Home Screen" install hint gate.
 *
 * iOS Safari does NOT fire `beforeinstallprompt`, so the standard PWA prompt can
 * never show on iPhone/iPad — the only install path is the manual Share →
 * "Add to Home Screen" flow. We can't trigger it programmatically, but we can
 * coach it with an instructional banner. This is the iPhone counterpart to the
 * Android app promo (which is hidden on iOS because there's no Android app to
 * install there).
 */

/**
 * True only for iOS *Safari* — the one browser that can Add to Home Screen.
 * Excludes Chrome-iOS (`CriOS`), Firefox-iOS (`FxiOS`), Edge-iOS (`EdgiOS`) and
 * the major in-app webviews, none of which expose the A2HS share action.
 */
export function isIOSSafari(ua: string): boolean {
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|TikTok/i.test(ua)) return false;
  return true;
}

export interface IOSInstallHintInput {
  /** navigator.userAgent */
  ua: string;
  /** already installed to the home screen (navigator.standalone / standalone display) */
  isStandalone: boolean;
  /** games completed so far — only pitch install to engaged users */
  gamesCompleted: number;
  /** ms timestamp until which the user dismissed the hint, or null */
  dismissedUntil: number | null;
  /** current time in ms */
  now: number;
}

/** Minimum games before we surface the install hint (matches the PWA prompt). */
export const IOS_HINT_MIN_GAMES = 2;

/**
 * Pure gating decision for the iOS install hint. All environment probes (UA,
 * standalone, storage, time) are resolved by the caller so this stays testable.
 */
export function shouldShowIOSInstallHint(input: IOSInstallHintInput): boolean {
  if (!isIOSSafari(input.ua)) return false;
  if (input.isStandalone) return false;
  if (input.gamesCompleted < IOS_HINT_MIN_GAMES) return false;
  if (input.dismissedUntil != null && input.now < input.dismissedUntil) return false;
  return true;
}
