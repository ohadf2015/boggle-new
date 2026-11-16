import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getPolarClient } from '@/lib/polar';
import { billingPortalLocale, canUseBillingPortal } from '@/lib/education/billingPortal';
import { isNativeAppUserAgent } from '@/lib/native/nativeHandoff';
import logger from '@/utils/logger';

/**
 * GET /api/subscription/portal?locale=xx
 *
 * One stable link to the Polar customer portal (update the card, cancel, invoices) for
 * emails and in-app fallbacks. Polar portal sessions are short-lived, so this mints a
 * fresh one at the moment of the click and redirects to it.
 *
 * - Signed out: Teacher Home (sign-in there, then the payment banner carries a live link).
 * - No Polar subscription, native app, or Polar error: Teacher Home. Never a checkout,
 *   because a past-due teacher sent to checkout would start a second subscription.
 *
 * Read-only on our side: it charges nothing and sends nothing. Polar itself retries the
 * failed renewal once the card is updated in the portal.
 */
export async function GET(request: NextRequest) {
  const locale = billingPortalLocale(request.nextUrl.searchParams.get('locale'));
  const home = new URL(`/${locale}/teacher`, request.nextUrl.origin);
  const toHome = () => NextResponse.redirect(home, 303);

  try {
    if (isNativeAppUserAgent(request.headers.get('user-agent'))) return toHome();
    const user = await getAuthedUser(request);
    if (!user) return toHome();

    const subscription = await checkTeacherSubscription(user.id);
    if (!canUseBillingPortal(subscription)) return toHome();

    const url = await getPolarClient().createCustomerPortalUrl(user.id);
    if (!url || !url.startsWith('https://')) return toHome();
    return NextResponse.redirect(url, 303);
  } catch (err) {
    logger.warn('[Portal] could not open the Polar customer portal:', err);
    return toHome();
  }
}
