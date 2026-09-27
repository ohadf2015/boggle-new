/**
 * Compute the banner margin for the native AdMob banner.
 *
 * Android plugin adds safe-area on top of the margin we provide.
 * iOS plugin re-adds safeAreaLayoutGuide internally.
 *
 * When navHeight === 0 (no bottom nav on screen), we must return 0
 * to avoid a dead band below the banner. The plugin's own safe-area
 * handling will stick the banner to the bottom correctly.
 *
 * @param navHeight The height of the bottom navigation bar (0 if hidden)
 * @param safeBottom The device's safe-area inset at the bottom (gesture bar height)
 * @param isAndroid True for Android, false for iOS
 * @returns The margin value to pass to the native banner plugin
 */
export function computeBannerMargin({
  navHeight,
  safeBottom,
  isAndroid,
}: {
  navHeight: number;
  safeBottom: number;
  isAndroid: boolean;
}): number {
  if (isAndroid) {
    // Android: plugin adds safe-area on top
    // When navHeight === 0 (no nav), margin must be 0 (let plugin handle safe-area)
    // When navHeight > 0, use max(navHeight, safeBottom) to clear both nav and safe-area
    return navHeight > 0 ? Math.max(navHeight, safeBottom) : 0;
  } else {
    // iOS: plugin re-adds safeAreaLayoutGuide, so subtract safeBottom to avoid double-count
    // Return max(0, navHeight - safeBottom) to avoid negative margins
    return Math.max(0, navHeight - safeBottom);
  }
}
