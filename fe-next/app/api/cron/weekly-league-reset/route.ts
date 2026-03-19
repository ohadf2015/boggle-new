import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { captureApiError } from '@/utils/sentry';

// Weekly reset may take a while for many leagues
export const maxDuration = 120;

/**
 * Cron Job: Weekly League Reset
 * Runs weekly (e.g. Monday 00:05 UTC) to promote/relegate players and archive standings.
 *
 * Schedule: 5 0 * * 1  (every Monday at 00:05 UTC)
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const expected = `Bearer ${cronSecret}`;
    if (
      !cronSecret ||
      !authHeader ||
      authHeader.length !== expected.length ||
      !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting weekly league reset...');
    const { processWeeklyReset } = await import('@/backend/modules/leagueManager');
    const result = await processWeeklyReset();
    console.log('[Cron] Weekly league reset complete:', result);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Weekly league reset failed:', message);
    captureApiError(
      error instanceof Error ? error : new Error(message),
      '/api/cron/weekly-league-reset',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
