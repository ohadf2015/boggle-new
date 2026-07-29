import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import logger from '@/utils/logger';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

// Snapshot + reset can take a while when many players are in the season.
export const maxDuration = 600;

/**
 * Cron Job: Season Reset
 *
 * Discovers any seasons whose status='active' AND end_date <= now() and
 * processes a snapshot+reset for each via the atomic Postgres RPC.
 *
 * Schedule (recommended): `5 0 1 * *` — first of month at 00:05 UTC.
 * Initial deploy: leave UNSCHEDULED. Trigger manually via the admin route
 * once on staging to validate, then enable in Railway scheduler.
 *
 * Security: Requires CRON_SECRET in Authorization: Bearer header.
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

    logger.log('[Cron] Starting season reset...');
    const locked = await withCronLock('season-reset', 700_000, async () => {
      const { processExpiredSeasons } = await import('@/backend/modules/seasonManager');
      return await processExpiredSeasons();
    });
    if (locked.status === 'skipped') {
      logger.log('[Cron] season-reset: skipped (already running)');
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    logger.log('[Cron] Season reset complete:', locked.result);
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Cron] Season reset failed:', message);
    captureApiError(
      error instanceof Error ? error : new Error(message),
      '/api/cron/season-reset',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
