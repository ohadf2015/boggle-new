import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';

// Edge Function takes ~10-20s to analyze player stats across all languages
export const maxDuration = 60;

/**
 * Cron Job: Calculate Bot Difficulty Parameters
 * Runs weekly (or daily) to analyze player statistics and adjust bot behavior
 *
 * The bot-difficulty-calculator Edge Function:
 * - Analyzes game_results from the past 7 days
 * - Calculates average player performance per language
 * - Adjusts bot parameters (words per minute, miss chance, delays)
 * - Stores results in bot_difficulty_params table
 *
 * Scheduling Options:
 * 1. External Cron Service (cron-job.org, EasyCron, etc.):
 *    - Schedule: 0 3 * * 0 (weekly at 3:00 AM UTC on Sunday)
 *    - URL: https://your-app.railway.app/api/cron/calculate-bot-difficulty
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

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized: Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting bot difficulty calculation...');

    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Cron] Missing Supabase configuration');
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/bot-difficulty-calculator`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cron] Edge Function error:', errorText);
      return NextResponse.json(
        { error: 'Edge Function failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[Cron] Bot difficulty calculation complete:', result.summary);

    return NextResponse.json({
      success: true,
      message: 'Bot difficulty calculation complete',
      ...result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Fatal error during bot difficulty calculation:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/cron/calculate-bot-difficulty',
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
 * Useful for testing or forcing recalculation
 */
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    console.log('[Admin] Manual bot difficulty calculation started');

    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/bot-difficulty-calculator`;
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
      console.error('[Admin] Edge Function error:', errorText);
      return NextResponse.json(
        { error: 'Edge Function failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    console.log(`[Admin] Bot difficulty calculation complete (${duration}ms)`);

    return NextResponse.json({
      success: true,
      message: 'Manual calculation complete',
      duration,
      ...result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Admin] Error during manual calculation:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/cron/calculate-bot-difficulty',
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
