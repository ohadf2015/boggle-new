import { NextRequest, NextResponse } from 'next/server';
import { createRequestClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/player/gifts/unclaimed-count
 * Count of unclaimed gift messages for the current player. Closing the popup
 * never hides a gift here (see GET /api/player/gifts).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase } = await createRequestClient(request);

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
