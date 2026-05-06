import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

// Edge Function takes ~10-30s to select words for 7 days × 5 languages
export const maxDuration = 60;

/**
 * Cron Job: Select Daily Target Words
 * Runs daily to pre-generate target words for the next 7 days
 *
 * The daily-word-selector Edge Function:
 * - Generates target words for daily challenges
 * - Considers themes/holidays for word selection
 * - Uses Gemini AI for intelligent word selection (if configured)
 * - Avoids repeating words within 30 days
 * - Stores results in daily_target_words table
 *
 * Scheduling Options:
 * 1. External Cron Service (cron-job.org, EasyCron, etc.):
 *    - Schedule: 0 1 * * * (daily at 1:00 AM UTC)
 *    - URL: https://your-app.railway.app/api/cron/select-daily-words
 *    - Authorization: Bearer YOUR_CRON_SECRET
 *
 * 2. GitHub Actions (scheduled workflow)
 *
 * 3. Internal node-cron (in server.ts)
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const expected = `Bearer ${cronSecret}`;
    if (!cronSecret || !authHeader || authHeader.length !== expected.length || !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
      logger.error('[Cron] Unauthorized: Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.log('[Cron] Starting daily word selection...');

    // Single-runner guard. TTL = maxDuration + buffer.
    const locked = await withCronLock('select-daily-words', 90_000, async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        logger.error('[Cron] Missing Supabase configuration');
        return { ok: false as const, status: 500, body: { error: 'Missing Supabase configuration' } };
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/daily-word-selector`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Cron] Edge Function error:', errorText);
        return { ok: false as const, status: response.status, body: { error: 'Edge Function failed', details: errorText } };
      }

      const result = await response.json();
      logger.log('[Cron] Daily word selection complete:', result.summary);
      return { ok: true as const, body: { success: true, message: 'Daily word selection complete', ...result } };
    });

    if (locked.status === 'skipped') {
      logger.log('[Cron] select-daily-words: skipped (already running)');
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }

    if (!locked.result.ok) {
      return NextResponse.json(locked.result.body, { status: locked.result.status });
    }
    return NextResponse.json(locked.result.body);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Cron] Fatal error during daily word selection:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/cron/select-daily-words',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger (admin only)
 * Useful for testing or forcing word generation
 */
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    logger.log('[Admin] Manual daily word selection started');

    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/daily-word-selector`;
    const startTime = Date.now();

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Admin] Edge Function error:', errorText);
      return NextResponse.json(
        { error: 'Edge Function failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    logger.log(`[Admin] Daily word selection complete (${duration}ms)`);

    return NextResponse.json({
      success: true,
      message: 'Manual selection complete',
      duration,
      ...result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Admin] Error during manual selection:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/cron/select-daily-words',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
