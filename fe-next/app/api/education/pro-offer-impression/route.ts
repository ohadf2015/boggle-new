import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import { checkoutClientKind, testEmailReason } from '@/lib/education/checkoutTrafficTags';

/**
 * POST /api/education/pro-offer-impression — server twin of the Teacher Pro
 * trial card being shown (ResultsTeacherProTrialCard: class-ready screen and
 * classroom results).
 *
 * The card's browser impression (`education_upsell_impression`) goes through
 * consent-gated PostHog, so a teacher who never accepts cookies leaves no trace
 * that the offer rendered at all — which is why the class-ready card read as
 * "zero impressions" right after it shipped. Two cookie-independent steps:
 *
 * - `edu_pro_offer_rendered`: the card mounted for a signed-in, non-Pro teacher.
 * - `edu_pro_offer_impression`: at least half of it was on screen.
 *
 * The tap twin is /api/education/pro-cta-click (`edu_pro_cta_clicked`).
 * Anonymous callers, unknown placements and unknown stages record nothing.
 * Always 204: analytics must never affect the page.
 */
const PLACEMENTS = new Set(['class_created', 'classroom_results']);
const STAGES: Record<string, string> = {
  rendered: 'edu_pro_offer_rendered',
  viewed: 'edu_pro_offer_impression',
};
const OFFERS = new Set(['trial', 'keep_after_trial', 'paid']);
const LOCALE_RE = /^[a-z]{2}(-[A-Za-z]{2})?$/;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return new NextResponse(null, { status: 204 });
    let body: { placement?: unknown; locale?: unknown; cta?: unknown; stage?: unknown; offer?: unknown } = {};
    try {
      body = JSON.parse((await request.text()) || '{}');
    } catch {
      body = {};
    }
    const placement = typeof body.placement === 'string' ? body.placement : '';
    if (!PLACEMENTS.has(placement)) return new NextResponse(null, { status: 204 });
    const stage = typeof body.stage === 'string' ? body.stage : '';
    const event = Object.prototype.hasOwnProperty.call(STAGES, stage) ? STAGES[stage] : null;
    if (!event) return new NextResponse(null, { status: 204 });
    const locale = typeof body.locale === 'string' && LOCALE_RE.test(body.locale) ? body.locale : null;
    const cta = body.cta === 'teacher_pro' ? 'teacher_pro' : 'teacher_pro_trial';
    const offer = typeof body.offer === 'string' && OFFERS.has(body.offer) ? body.offer : null;
    const testReason = testEmailReason(user.email ?? null);
    captureProFunnelServerEvent({
      distinctId: user.id,
      event,
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
