import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import { isQaEmail } from '@/backend/utils/educationRoundTelemetry';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
import { emitTeacherProUpgradeShown, emitTeacherProUpgradeClicked } from '@/lib/education/proFunnelServer';

/**
 * POST /api/education/teacher/upgrade-event
 *
 * Server emit for Teacher Pro demonstrated-value upgrade CTAs:
 * - teacher_pro_upgrade_shown
 * - teacher_pro_upgrade_clicked
 *
 * Always stamps $host via captureEduServerEvents and captures growth twin.
 * Unauthenticated calls use anonymous-teacher distinctId. Never fails.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    let body: {
      event?: unknown;
      placement?: unknown;
      reason?: unknown;
      count?: unknown;
      limit?: unknown;
      locale?: unknown;
    } = {};

    try {
      const raw = await request.text();
      if (raw.trim()) body = JSON.parse(raw);
    } catch {
      body = {};
    }

    const event = typeof body.event === 'string' ? body.event : '';
    const placement = typeof body.placement === 'string' ? body.placement : 'unknown';
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    const count = typeof body.count === 'number' && Number.isFinite(body.count) ? body.count : undefined;
    const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : null;
    const locale = typeof body.locale === 'string' ? body.locale : null;

    let isTestAccount = false;
    if (user) {
      isTestAccount = isQaEmail(user.email) || (await isAnyTestAccount(createAdminClient(), [user.id]));
    }

    const payload = {
      teacherId: user?.id ?? null,
      placement,
      reason,
      count,
      limit,
      locale,
      isTestAccount,
    };

    if (event === 'teacher_pro_upgrade_shown') {
      emitTeacherProUpgradeShown(payload);
    } else if (event === 'teacher_pro_upgrade_clicked') {
      emitTeacherProUpgradeClicked(payload);
    } else {
      return NextResponse.json({ error: 'invalid event' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
