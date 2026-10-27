import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import { checkoutClientKind, testEmailReason } from '@/lib/education/checkoutTrafficTags';

/**
 * POST /api/education/pro-cta-click — server twin of a Teacher Pro CTA tap.
 *
 * Browser PostHog is consent-gated, so most real teachers' taps never reach it
 * (growthTracking.ts: "~97% of human visitors"). The tap is the step we most
 * need to see, so a signed-in tap is also recorded here, the same way the
 * checkout route records `checkout_started`. Anonymous or unknown placements
 * record nothing. Always 204: the CTA navigates regardless.
 */
const PLACEMENTS = new Set(['class_created', 'classroom_results', 'access_success']);
const LOCALE_RE = /^[a-z]{2}(-[A-Za-z]{2})?$/;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return new NextResponse(null, { status: 204 });
    let body: { placement?: unknown; locale?: unknown; cta?: unknown } = {};
    try {
      body = JSON.parse((await request.text()) || '{}');
    } catch {
      body = {};
    }
    const placement = typeof body.placement === 'string' ? body.placement : '';
    if (!PLACEMENTS.has(placement)) return new NextResponse(null, { status: 204 });
    const locale = typeof body.locale === 'string' && LOCALE_RE.test(body.locale) ? body.locale : null;
    const cta = body.cta === 'teacher_pro' ? 'teacher_pro' : 'teacher_pro_trial';
    const testReason = testEmailReason(user.email ?? null);
    captureProFunnelServerEvent({
      distinctId: user.id,
      event: 'edu_pro_cta_clicked',
      properties: {
        product: 'teacher_pro',
        placement,
        cta,
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
