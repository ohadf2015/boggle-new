import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

/**
 * POST /api/admin/daily-word/reset-attempts
 * Reset daily word hunt attempts for specific players on a specific date
 * Only accessible to admin users
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
    const { puzzleDate, language, playerIds, guestFingerprints } = body;

    if (!puzzleDate || !language) {
      return NextResponse.json(
        { error: 'puzzleDate and language are required' },
        { status: 400 }
      );
    }

    if ((!playerIds || playerIds.length === 0) && (!guestFingerprints || guestFingerprints.length === 0)) {
      return NextResponse.json(
        { error: 'At least one playerIds or guestFingerprints is required' },
        { status: 400 }
      );
    }

    const results: { deleted: number; errors: string[] } = { deleted: 0, errors: [] };

    // Delete attempts for authenticated players
    if (playerIds && playerIds.length > 0) {
      const { data, error } = await supabase
        .from('daily_word_hunt_attempts')
        .delete()
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .in('player_id', playerIds)
        .select('id');

      if (error) {
        results.errors.push(`Player delete error: ${error.message}`);
      } else {
        results.deleted += data?.length || 0;
      }
    }

    // Delete attempts for guest fingerprints
    if (guestFingerprints && guestFingerprints.length > 0) {
      const { data, error } = await supabase
        .from('daily_word_hunt_attempts')
        .delete()
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .in('guest_fingerprint', guestFingerprints)
        .select('id');

      if (error) {
        results.errors.push(`Guest delete error: ${error.message}`);
      } else {
        results.deleted += data?.length || 0;
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      deleted: results.deleted,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Reset attempts error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/reset-attempts',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
