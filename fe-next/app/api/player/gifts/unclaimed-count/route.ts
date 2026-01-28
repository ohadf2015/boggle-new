import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/player/gifts/unclaimed-count
 * Get count of unclaimed gift messages for the current player
 *
 * Only counts gifts that:
 * 1. Are not claimed (claimed = false)
 * 2. Were created AFTER the user's gift_modal_dismissed_at timestamp (if set)
 *    This ensures dismissed gifts don't show in the badge count
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check gift_modal_dismissed_at
    const { data: profile } = await supabase
      .from('profiles')
      .select('gift_modal_dismissed_at')
      .eq('id', user.id)
      .single();

    // Build the query - filter by claimed status and dismissal timestamp
    let query = supabase
      .from('admin_gift_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('claimed', false);

    // If user has dismissed the modal, only count gifts created AFTER that time
    if (profile?.gift_modal_dismissed_at) {
      query = query.gt('created_at', profile.gift_modal_dismissed_at);
    }

    const { count, error: countError } = await query;

    if (countError) {
      console.error('Error fetching unclaimed count:', countError);
      captureApiError(new Error(countError.message), '/api/player/gifts/unclaimed-count', {
        method: 'GET',
        userId: user.id,
        statusCode: 500,
      });
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/player/gifts/unclaimed-count:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/player/gifts/unclaimed-count',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
