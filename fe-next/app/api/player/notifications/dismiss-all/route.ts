/**
 * Dismiss All Notifications API
 * POST /api/player/notifications/dismiss-all - Dismiss all notifications
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.rpc('dismiss_all_notifications');

    if (error) {
      console.error('Failed to dismiss all notifications:', error);
      return NextResponse.json(
        { error: 'Failed to dismiss notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.count || 0,
    });
  } catch (error) {
    console.error('Dismiss all notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
