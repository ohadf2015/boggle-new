import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/daily-word/reset-attempts
 * Reset daily word hunt attempts for specific players on a specific date
 * Only accessible to admin users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
    console.error('Reset attempts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
