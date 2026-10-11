import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/admin/daily-word/generate-retry-link
 * List all retry tokens (for admin dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Parse query params
    const url = new URL(request.url);
    const puzzleDate = url.searchParams.get('puzzleDate');
    const language = url.searchParams.get('language');

    // Build query
    let query = supabase
      .from('daily_retry_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (puzzleDate) {
      query = query.eq('puzzle_date', puzzleDate);
    }
    if (language) {
      query = query.eq('language', language);
    }

    const { data: tokens, error: queryError } = await query;

    if (queryError) {
      const errorMessage = queryError.message || 'Unknown error';
      console.error('Failed to fetch retry tokens:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch retry tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('List retry tokens error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/generate-retry-link',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
