import { NextRequest, NextResponse } from 'next/server';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getPolarClient } from '@/lib/polar';
import { billingPortalLocale, canUseBillingPortal } from '@/lib/education/billingPortal';
import {
  isPolarHostedUrl,
  polarPaymentUpdateUrl,
  verifyDunningRecover,
} from '@/lib/education/dunningEscalation';
import { buildRecoveryCtaClickedEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import logger from '@/utils/logger';

/**
 * GET /api/subscription/recover?t=<signed>&locale=xx
 *
 * One-click card update from a dunning email. The token is the auth: it was
 * signed with CRON_SECRET for one teacher and one grace day, so the teacher
 * does not sign in to LexiClash first. Polar sessions expire in about an hour,
 * so the email never carries one. This mints a fresh session at the click and
 * redirects to /{org}/portal/settings, the payment-update page.
 *
 * A bad, expired, or non-Polar destination goes to Teacher Home. Never a checkout.
 */
export async function GET(request: NextRequest) {
  const locale = billingPortalLocale(request.nextUrl.searchParams.get('locale'));
  const toHome = () =>
    new NextResponse(null, { status: 303, headers: { Location: `/${locale}/teacher` } });

  const secret = process.env.CRON_SECRET || '';
  const token = request.nextUrl.searchParams.get('t') || '';
  const parsed = verifyDunningRecover(token, secret, Date.now());
  if (!parsed) return toHome();

  try {
    const subscription = await checkTeacherSubscription(parsed.userId);
    if (!canUseBillingPortal(subscription)) return toHome();

    const url = await getPolarClient().createCustomerPortalUrl(parsed.userId);
    const dest = url ? polarPaymentUpdateUrl(url) || (isPolarHostedUrl(url) ? url : null) : null;
    if (!dest) return toHome();

    captureProFunnelServerEvent(buildRecoveryCtaClickedEvent(parsed.userId, {
      surface: 'dunning_email',
      day: parsed.day,
    }));
    return NextResponse.redirect(dest, 303);
  } catch (err) {
    logger.warn('[Dunning] recover link could not open the payment page:', err);
    return toHome();
  }
}
