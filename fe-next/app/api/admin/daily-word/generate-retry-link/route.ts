import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';
import crypto from 'crypto';

/**
 * POST /api/admin/daily-word/generate-retry-link
 * Generate a retry token that allows any player to replay a specific daily challenge
 * Only accessible to admin users
 *
 * Request body:
 * - puzzleDate: string (YYYY-MM-DD format)
 * - language: string (en, he, sv, ja, es)
 *
 * Response:
 * - token: string (the generated token)
 * - retryUrl: string (full URL to share with players)
 * - expiresAt: string (ISO timestamp when token expires)
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { puzzleDate, language } = body;

    if (!puzzleDate || !language) {
      return NextResponse.json(
        { error: 'puzzleDate and language are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(puzzleDate)) {
      return NextResponse.json(
        { error: 'puzzleDate must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `language must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate a secure random token (16 characters, URL-safe)
    const token = crypto.randomBytes(12).toString('base64url');

    // Calculate expiration: end of the puzzle day (midnight UTC of the next day)
    const puzzleDateObj = new Date(puzzleDate + 'T00:00:00Z');
    const expiresAt = new Date(puzzleDateObj);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 1); // Next day at midnight UTC

    // Insert the token into the database
    const { data: tokenData, error: insertError } = await supabase
      .from('daily_retry_tokens')
      .insert({
        token,
        puzzle_date: puzzleDate,
        language,
        created_by: authResult.user!.id,
        expires_at: expiresAt.toISOString(),
        use_count: 0,
      })
      .select('id, token, expires_at')
      .single();

    if (insertError) {
      const errorMessage = insertError.message || 'Unknown error';
      console.error('Failed to create retry token:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to create retry token' },
        { status: 500 }
      );
    }

    // Construct the retry URL
    // Use the request URL to determine the base URL
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const retryUrl = `${baseUrl}/${language}/daily?retryToken=${token}`;

    return NextResponse.json({
      success: true,
      token: tokenData.token,
      retryUrl,
      puzzleDate,
      language,
      expiresAt: tokenData.expires_at,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Generate retry link error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/generate-retry-link',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

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
