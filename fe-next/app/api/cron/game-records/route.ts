import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { createAdminClient } from '@/utils/supabase/admin';
import { refreshWorldRecords } from '@/lib/records/worldRecordRefresh';
import { worldRecordDeps } from '@/lib/records/worldRecordCron';
import { withCronLock } from '@/backend/redis/locking';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';

/** POST /api/cron/game-records : hourly (pg_cron). Recomputes every world record and notifies dethroned holders. */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    if (!admin) throw Object.assign(new Error('game-records: no service-role client'), { status: 503 });
    const locked = await withCronLock('game-records', 120_000, () => refreshWorldRecords(worldRecordDeps(admin)));
    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    logger.log(`[world-records] ${JSON.stringify(locked.result)}`);
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const status = (error as { status?: number }).status === 503 ? 503 : 500;
    logger.error('[world-records] refresh failed:', err.message);
    captureApiError(err, '/api/cron/game-records', { method: 'POST', statusCode: status });
    return NextResponse.json({ error: 'World record refresh failed' }, { status });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
