import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import { checkoutClientKind, testEmailReason } from '@/lib/education/checkoutTrafficTags';
import { PRO_OFFER_PLACEMENTS } from '@/lib/education/pro/proOfferPlacements';

/**
 * POST /api/education/pro-offer-click — cookie-free twin of a tap on a Teacher
 * Pro offer (class-ready card, classroom results card, access-success button,
 * dashboard card). Same shape as /api/education/pro-offer-impression so the
 * rendered -> viewed -> clicked funnel reads per `source` without consent-gated
 * browser PostHog: `edu_pro_offer_clicked`.
 *
 * Sent with keepalive/sendBeacon so the tap never waits on it. Anonymous callers
 * and unknown placements record nothing. Always 204.
 */
const OFFERS = new Set(['trial', 'keep_after_trial', 'paid']);
const LOCALE_RE = /^[a-z]{2}(-[A-Za-z]{2})?$/;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return new NextResponse(null, { status: 204 });
    let body: { placement?: unknown; locale?: unknown; cta?: unknown; offer?: unknown } = {};
    try {
      body = JSON.parse((await request.text()) || '{}');
    } catch {
      body = {};
    }
    const placement = typeof body.placement === 'string' ? body.placement : '';
    if (!PRO_OFFER_PLACEMENTS.has(placement)) return new NextResponse(null, { status: 204 });
    const locale = typeof body.locale === 'string' && LOCALE_RE.test(body.locale) ? body.locale : null;
    const cta = body.cta === 'teacher_pro' ? 'teacher_pro' : 'teacher_pro_trial';
    const offer = typeof body.offer === 'string' && OFFERS.has(body.offer) ? body.offer : null;
    const testReason = testEmailReason(user.email ?? null);
    captureProFunnelServerEvent({
      distinctId: user.id,
      event: 'edu_pro_offer_clicked',
      properties: {
        product: 'teacher_pro',
        placement,
        source: placement,
        cta,
        offer,
        locale,
        client_kind: checkoutClientKind(request.headers),
        is_test_account: testReason !== null,
        test_reason: testReason,
      },
    });
  } catch {
    /* analytics only */
  }
  return new NextResponse(null, { status: 204 });
}
