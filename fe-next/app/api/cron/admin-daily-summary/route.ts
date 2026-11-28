import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { notifyAdmins } from '@/lib/admin/adminNotifications';
import { dailySummaryNotice, type DayCounts } from '@/lib/admin/adminEvents';
import { addLocalDays, localDateOf } from '@/lib/admin/viewerTimeZone';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';

const ADMIN_SUMMARY_TZ = 'Asia/Jerusalem';

/**
 * POST /api/cron/admin-daily-summary  (pg_cron, daily 05:00 UTC = 07:00/08:00 Israel)
 *
 * Yesterday's games, signups and teacher signups in Asia/Jerusalem, against the day
 * before, sent to every admin through the bell and phone push. The per-day dedupe
 * key makes a double fire a no-op. `?dry=1` returns the notice and sends nothing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const day = addLocalDays(localDateOf(Date.now(), ADMIN_SUMMARY_TZ), -1);

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('no service-role client');
    const { data, error } = await supabase.rpc('admin_daily_summary', { p_day: day });
    if (error || !data) throw new Error(`admin_daily_summary failed: ${error?.message ?? 'no data'}`);

    const { current, previous } = data as { current: DayCounts; previous: DayCounts };
    const notice = dailySummaryNotice({ day, current, previous });
    if (dry) return NextResponse.json({ success: true, dry: true, day, current, previous, notice });

    const sent = await notifyAdmins(notice);
    logger.log(`[Admin daily summary] ${day} sent=${sent}`);
    return NextResponse.json({ success: true, sent, day, current, previous });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('[Admin daily summary] Error:', err.message);
    captureApiError(err, '/api/cron/admin-daily-summary', { method: 'POST', statusCode: 500 });
    return NextResponse.json({ error: 'Failed to build the admin daily summary' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
