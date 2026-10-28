import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import { checkoutClientKind, testEmailReason } from '@/lib/education/checkoutTrafficTags';

/**
 * GET /api/education/email-click?c=approval_email&l=sv — cookie-free click tracking for
 * the Teacher Pro line in transactional emails. An email client carries no analytics
 * cookies, so the click is recorded here (`edu_pro_email_clicked`) and the teacher is
 * redirected to the upgrade page, which picks trial / keep-after-trial / paid from the
 * live entitlement. The destination is fixed (no open redirect); unknown campaigns and
 * locales fall back to safe values. Tracking never blocks the redirect.
 */
const CAMPAIGNS = new Set(['approval_email']);
const LOCALES = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);
const SITE = 'https://www.lexiclash.live';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const campaignRaw = params.get('c') ?? '';
  const campaign = CAMPAIGNS.has(campaignRaw) ? campaignRaw : null;
  const localeRaw = params.get('l') ?? '';
  const locale = LOCALES.has(localeRaw) ? localeRaw : 'en';
  const dest = `${SITE}/${locale}/teacher/upgrade${campaign ? `?source=${campaign}` : ''}`;

  if (campaign) {
    try {
      // Signed in on this browser -> the teacher's id; otherwise an anonymous one-off id
      // that creates no person profile (the click still counts).
      const user = await getAuthedUser(request).catch(() => null);
      const testReason = user ? testEmailReason(user.email ?? null) : null;
      captureProFunnelServerEvent({
        distinctId: user?.id ?? `email-click-${randomUUID()}`,
        event: 'edu_pro_email_clicked',
        properties: {
          product: 'teacher_pro',
          source: campaign,
          placement: campaign,
          locale,
          signed_in: Boolean(user),
          client_kind: checkoutClientKind(request.headers),
          is_test_account: testReason !== null,
          test_reason: testReason,
          ...(user ? {} : { $process_person_profile: false }),
        },
      });
    } catch {
      /* analytics only */
    }
  }
  return NextResponse.redirect(dest, 302);
}
