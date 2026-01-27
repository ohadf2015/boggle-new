import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/player/gifts/unclaimed-count
 * Get count of unclaimed gift messages for the current player
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

    const { count, error: countError } = await supabase
      .from('admin_gift_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('claimed', false);

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
