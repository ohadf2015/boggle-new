/**
 * Admin: POST /api/admin/season-reset
 *
 * Manually triggers a snapshot+reset for any expired-active seasons.
 * Same orchestration as /api/cron/season-reset but gated by admin auth
 * so the first reset can be exercised on staging before enabling the cron.
 *
 * Body: optional `{ seasonId: number }` to reset a specific season,
 *       overriding the auto-discovery of expired-active rows.
 */
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    let body: { seasonId?: number } = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    if (typeof body.seasonId === 'number' && Number.isInteger(body.seasonId) && body.seasonId > 0) {
      logger.log('[Admin] Triggering single-season reset:', body.seasonId);
      const { processSeasonReset } = await import('@/backend/modules/seasonManager');
      const result = await processSeasonReset(body.seasonId);
      return NextResponse.json({ ...result, mode: 'single' });
    }

    logger.log('[Admin] Triggering expired-seasons sweep');
    const { processExpiredSeasons } = await import('@/backend/modules/seasonManager');
    const result = await processExpiredSeasons();
    return NextResponse.json({ ...result, success: result.errors === undefined, mode: 'expired-sweep' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Admin] season-reset failed:', message);
    captureApiError(
      error instanceof Error ? error : new Error(message),
      '/api/admin/season-reset',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
