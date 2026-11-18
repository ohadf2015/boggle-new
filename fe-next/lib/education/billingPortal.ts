/**
 * Where a teacher fixes their Teacher Pro billing (update the card, cancel, see invoices).
 *
 * Polar customer-portal links carry a short-lived session token, so a link minted when an
 * email is sent is dead by the time a teacher opens it hours later. Emails and fallbacks
 * point at our own stable route instead; it mints a fresh portal session at the moment of
 * the click (GET /api/subscription/portal).
 */

const SITE = 'https://www.lexiclash.live';
const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export function billingPortalLocale(raw: unknown): string {
  return typeof raw === 'string' && LOCALES.has(raw) ? raw : 'en';
}

/** Stable, never-expiring link to the card-update portal (relative for in-app use). */
export function billingPortalPath(locale: string): string {
  return `/api/subscription/portal?locale=${billingPortalLocale(locale)}`;
}

/** Absolute form of billingPortalPath, for emails. */
export function billingPortalEmailUrl(locale: string): string {
  return `${SITE}${billingPortalPath(locale)}`;
}

/** Hosted Polar customer portal only. Never an open redirect. */
export function isPolarHostedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'polar.sh' || u.hostname.endsWith('.polar.sh'));
  } catch {
    return false;
  }
}

/**
 * Polar's customer_portal_url lands on /{org}/portal (overview). The card form
 * is /{org}/portal/settings, and that page reads the same customer_session_token.
 * A URL that is not that portal root is refused rather than guessed.
 */
export function polarPaymentUpdateUrl(portalUrl: string): string | null {
  if (!isPolarHostedUrl(portalUrl)) return null;
  const u = new URL(portalUrl);
  const root = u.pathname.match(/^\/([^/]+)\/portal\/?$/);
  if (root) {
    u.pathname = `/${root[1]}/portal/settings`;
    return u.toString();
  }
  if (/^\/[^/]+\/portal\/settings\/?$/.test(u.pathname)) return u.toString();
  return null;
}

export interface PortalSubscriptionLike {
  has_pro: boolean;
  status: string;
  source?: string | null;
}

/**
 * A provider (Polar) subscriber who may need the portal: paying Pro, or a renewal that
 * failed. A past_due row stays eligible after the in-app grace ends, which is exactly when
 * the teacher most needs to update the card. Sending them to a new checkout instead would
 * start a second subscription while Polar is still retrying the first one.
 */
export function canUseBillingPortal(sub: PortalSubscriptionLike): boolean {
  if (sub.source === 'admin_grant') return false;
  return sub.has_pro || sub.status === 'past_due';
}
