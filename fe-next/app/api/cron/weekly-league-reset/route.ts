import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import logger from '@/utils/logger';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

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

    logger.log('[Cron] Starting weekly league reset...');
    const locked = await withCronLock('weekly-league-reset', 150_000, async () => {
      const { processWeeklyReset } = await import('@/backend/modules/leagueManager');
      return await processWeeklyReset();
    });
    if (locked.status === 'skipped') {
      logger.log('[Cron] weekly-league-reset: skipped (already running)');
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    logger.log('[Cron] Weekly league reset complete:', locked.result);
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Cron] Weekly league reset failed:', message);
    captureApiError(
      error instanceof Error ? error : new Error(message),
      '/api/cron/weekly-league-reset',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
