/**
 * Pure helper for the AdMob anchored banner's bottom margin (the "lift" that
 * keeps a BOTTOM_CENTER banner above the bottom nav).
 *
 * Why the clamp: on Android 15 edge-to-edge the safe-area inset can be reported
 * pathologically large (300+px, a double-count of system bars). That inflates
 * --bottom-nav-height (GlobalBottomNav publishes h-16 + the raw env() inset when
 * the sanitized plugin value is 0), and AnchoredNativeBanner reads that var as a
 * plain number for the native showBanner() offset — so a runaway value floats
 * the banner mid-screen with a navy band below it. The CSS reservation already
 * clamps the same vars (globals.css --bottom-stack-height); this mirrors that
 * ceiling at the JS consumer the CSS clamp can't reach.
 *
 * A real bottom nav is ~64–112px, so 120px is generous headroom while making a
 * runaway offset impossible. Web never calls this (native-only component).
 */
export const MAX_BANNER_OFFSET_PX = 120;

const clamp = (n: number): number => {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_BANNER_OFFSET_PX);
};

export interface BannerMarginInput {
  /** true on Android (plugin adds safe-area on top), false on iOS. */
  isAndroid: boolean;
  /** --bottom-nav-height in px (nav h-16 + its own safe-area). */
  navHeight: number;
  /** Sanitized bottom safe-area inset in px. */
  safeBottom: number;
}

/**
 * Android: plugin adds safe-area on top of the margin → lift = max(nav, safe).
 * iOS: plugin re-adds safeAreaLayoutGuide internally → subtract to avoid
 *      double-counting, never below 0.
 * Both inputs are clamped to MAX_BANNER_OFFSET_PX first.
 */
export function computeBannerMargin({ isAndroid, navHeight, safeBottom }: BannerMarginInput): number {
  const nav = clamp(navHeight);
  const safe = clamp(safeBottom);
  return isAndroid ? Math.max(nav, safe) : Math.max(0, nav - safe);
}
