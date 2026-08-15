/**
 * The single source of truth for "the player said no thanks to the app".
 *
 * It used to be a private const inside AndroidAppInstallPromo, which gave two
 * bugs the same root cause — dismissal state read once and never re-read:
 *  - the PILL never saw it at all, so it re-appeared on every page load while
 *    the popup stayed correctly silent (prod, desktop, 7 days: 2.58 pill
 *    impressions per session vs 1.07 popup), and
 *  - the popup's re-arming fire-time gate compared against a copy captured at
 *    mount, so dismissing from the header menu row mid-countdown left the timer
 *    spinning against a stale `null`.
 *
 * Both surfaces now call in here at DECISION time. Storage key is unchanged, so
 * cooldowns already sitting in players' browsers keep counting down.
 */

export const INSTALL_DISMISS_KEY = 'android_app_install_promo_dismissed_until';
export const INSTALL_DISMISS_DAYS = 14;

/** ms timestamp the cooldown runs until, or null when there's no usable value. */
export function readInstallDismissedUntil(): number | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(INSTALL_DISMISS_KEY);
  if (!stored) return null;
  const parsed = parseInt(stored, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isInstallPromoDismissed(now: number = Date.now()): boolean {
  const until = readInstallDismissedUntil();
  return until != null && now < until;
}

export function persistInstallDismissal(now: number = Date.now()): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    INSTALL_DISMISS_KEY,
    String(now + INSTALL_DISMISS_DAYS * 86_400_000),
  );
}
