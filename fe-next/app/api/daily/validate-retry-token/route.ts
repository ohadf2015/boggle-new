import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/daily/validate-retry-token?token={token}
 * Validates a retry token and returns puzzle info if valid
 * Public endpoint - no authentication required
 *
 * Query params:
 * - token: string (the retry token)
 *
 * Response (if valid):
 * - valid: true
 * - puzzleDate: string
 * - language: string
 * - useCount: number (how many times token has been used)
 *
 * Response (if invalid):
 * - valid: false
 * - reason: string (expired, not_found, wrong_date)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, reason: 'missing_token' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Look up the token
    const { data: tokenData, error: queryError } = await supabase
      .from('daily_retry_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (queryError || !tokenData) {
      return NextResponse.json({
        valid: false,
        reason: 'not_found',
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        reason: 'expired',
        puzzleDate: tokenData.puzzle_date,
        language: tokenData.language,
      });
    }

    // Check if the token's puzzle date matches today
    // Get today's date in UTC (daily challenges use UTC dates)
    const todayUTC = new Date().toISOString().split('T')[0];
    if (tokenData.puzzle_date !== todayUTC) {
      return NextResponse.json({
        valid: false,
        reason: 'wrong_date',
        puzzleDate: tokenData.puzzle_date,
        todayDate: todayUTC,
        language: tokenData.language,
      });
    }

    // Token is valid - return puzzle info
    return NextResponse.json({
      valid: true,
      puzzleDate: tokenData.puzzle_date,
      language: tokenData.language,
      useCount: tokenData.use_count,
    });
  } catch (error) {
    console.error('Validate retry token error:', error);
    return NextResponse.json(
      { valid: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/daily/validate-retry-token
 * Use a retry token (increments use count)
 * Called after successful validation when player actually uses the retry
 *
 * Request body:
 * - token: string
 *
 * Response:
 * - success: boolean
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'missing_token' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First verify the token is valid
    const { data: tokenData, error: queryError } = await supabase
      .from('daily_retry_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (queryError || !tokenData) {
      return NextResponse.json({
        success: false,
        error: 'not_found',
      });
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        success: false,
        error: 'expired',
      });
    }

    // Check date matches today
    const todayUTC = new Date().toISOString().split('T')[0];
    if (tokenData.puzzle_date !== todayUTC) {
      return NextResponse.json({
        success: false,
        error: 'wrong_date',
      });
    }

    // Increment use count using service role to bypass RLS
    // Since public users can't update the table directly
    const { error: updateError } = await supabase.rpc('increment_retry_token_use_count', {
      token_id: tokenData.id,
    });

    // If RPC doesn't exist yet, we'll handle it gracefully
    if (updateError) {
      console.warn('Could not increment use count (RPC may not exist):', updateError.message);
      // Continue anyway - the main functionality still works
    }

    return NextResponse.json({
      success: true,
      puzzleDate: tokenData.puzzle_date,
      language: tokenData.language,
    });
  } catch (error) {
    console.error('Use retry token error:', error);
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
