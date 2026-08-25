/**
 * Centralised PostHog tracking for the Android web-install funnel.
 *
 * The three core events keep their historical NAMES (so dashboards built before
 * this change keep working) but now carry a `source` so you can tell the
 * unsolicited auto-popup apart from a deliberate re-entry, and build the
 * recovery funnel:
 *
 *   shown(auto_popup) → dismissed → pill_shown → {pill_click | menu_click}
 *                                              → install_click{source}
 *
 * Note: these intentionally do NOT use the `growth:` prefix — the existing
 * Android install events never did, and consistency within the feature beats
 * the global convention.
 */

import posthog from '@/lib/analytics/lazyPosthog';

/**
 * `results` is the post-game placement (see GetAppMenuRow.source.test.tsx): the
 * same durable row, rendered on the results screen instead of the header drawer.
 * It is a separate source because its intent profile is nothing like the header's.
 */
export type InstallSource = 'auto_popup' | 'menu' | 'pill' | 'results';

/** Placements that render the durable, user-initiated row. */
export type MenuRowSource = Extract<InstallSource, 'menu' | 'results'>;

export function trackInstallPromoShown(source: InstallSource): void {
  posthog.capture('android_install_promo_shown', { source });
}

export function trackInstallClick(source: InstallSource): void {
  posthog.capture('android_install_promo_install_click', { source });
}

export function trackInstallDismissed(source: InstallSource): void {
  posthog.capture('android_install_promo_dismissed', { source });
}

export function trackInstallPillShown(): void {
  posthog.capture('android_install_pill_shown');
}

export function trackInstallPillClick(): void {
  posthog.capture('android_install_pill_click');
}

export function trackInstallPillDismissed(): void {
  posthog.capture('android_install_pill_dismissed');
}

export function trackInstallMenuClick(source: MenuRowSource = 'menu'): void {
  posthog.capture('android_install_menu_click', { source });
}

/**
 * Big-screen (TV/party) install QR impression. Scan-only surface — there's no
 * click event because the conversion happens on the phone that scans it; Play
 * Console attributes the install via the `tv_results_qr` referrer instead.
 */
export function trackTvInstallQrShown(): void {
  posthog.capture('android_tv_install_qr_shown');
}
