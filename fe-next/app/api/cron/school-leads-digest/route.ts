import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { schoolLeadWeeklyDigest } from '@/lib/email/templates/schoolLeadWeeklyDigest';
import {
  SCHOOL_LEAD_NOTIFY_TO,
  schoolLeadDigestWindow,
  type SchoolLeadDigestRow,
} from '@/lib/education/schoolLeadNotify';
import { withCronLock } from '@/backend/redis/locking';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';

/**
 * POST /api/cron/school-leads-digest
 *
 * Weekly Monday 07:00 UTC: email Ohad every school_leads row from the last 7 days.
 * Instant notify is the primary path; this is the unread-pipeline safety net for
 * the $39/term Classroom plan.
 *
 * Security: CRON_SECRET via x-cron-secret or Authorization: Bearer.
 * `?dry=1` returns who would be listed and sends nothing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const window = schoolLeadDigestWindow();

  try {
    const locked = await withCronLock('school-leads-digest', 60_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.error('[SchoolLead Digest] no service-role client; skipping');
        return { sent: false, count: 0, reason: 'no-supabase-admin' };
      }

      const { data, error } = await supabase
        .from('school_leads')
        .select('full_name, email, school_or_district, role, locale, created_at, source')
        .gte('created_at', window.startIso)
        .lte('created_at', window.endIso)
        .order('created_at', { ascending: false });
      if (error) throw new Error(`school_leads select failed: ${error.message}`);

      const leads = (data ?? []) as SchoolLeadDigestRow[];
      logger.log(`[SchoolLead Digest] ${leads.length} leads in window${dry ? ' (dry run)' : ''}`);

      if (dry) {
        return { dry: true, count: leads.length, window, leads };
      }

      const tpl = schoolLeadWeeklyDigest(leads, window);
      const result = await sendEmail({
        to: SCHOOL_LEAD_NOTIFY_TO,
        subject: tpl.subject,
        html: tpl.html,
      });
      if (!result.ok) {
        logger.error(`[SchoolLead Digest] send failed: ${result.error}`);
        return { sent: false, count: leads.length, error: result.error };
      }
      return { sent: true, count: leads.length };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[SchoolLead Digest] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/school-leads-digest',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to send school-lead digest' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
